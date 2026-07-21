#!/usr/bin/env python3
"""
文言雀 articles.json keyWords 全量修复脚本。

一次运行完成：
  Phase 1 — 词书索引构建（8 本词书 × 选篇交叉索引）
  Phase 2 — 补全缺失 keyWords（词书有、articles.json 无）
  Phase 3 — 修正挂错句子的 keyWords
  Phase 4 — 同义去重（不同词书同字同义）
  Phase 5 — 同字消歧（同句同字不同义 → 扩展为多字词）
  Phase 6 — 补充 wordType + 更新 relatedWordIds + 排序
  Phase 7 — 数据完整性验证

用法:
  python3 fix_articles_keywords.py               # dry-run
  python3 fix_articles_keywords.py --apply       # 写入 articles.json
  python3 fix_articles_keywords.py --import-api  # 写入 + 导入数据库
"""

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from difflib import SequenceMatcher

# ═══ 路径配置 ═══

ARTICLES_PATH = os.path.expanduser(
    "~/Documents/knowledge_library/文言文/选篇/正文/articles.json"
)  # 旧版单文件（回退用）
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
WB_FILES = [
    "wb_zhongkao_shixu.json", "wb_zhongkao_tongjia.json",
    "wb_zhongkao_gujinyi.json", "wb_zhongkao_cileihuoyong.json",
    "wb_gaokao_shixu.json", "wb_gaokao_tongjia.json",
    "wb_gaokao_gujinyi.json", "wb_gaokao_cileihuoyong.json",
]
IMPORT_URL = "http://localhost:8080/api/admin/import/articles"

WORD_TYPE_PRIORITY = {"tongjia": 0, "huoyong": 1, "gujinyi": 2, "xu": 3, "shi": 4}


# ═══ 工具函数 ═══

def normalize(text: str) -> str:
    return re.sub(r"[\s，。！？、；：""''「」『』【】《》（）\-,.!?;:\"'\[\]（）]+", "", text)


def same_meaning(d1: str, d2: str) -> bool:
    d1c = re.sub(r"[（(][^）)]*[）)]", "", d1).strip()
    d2c = re.sub(r"[（(][^）)]*[）)]", "", d2).strip()
    if d1c == d2c or d1c in d2c or d2c in d1c:
        return True
    t1 = set(t.strip() for t in re.split(r"[,，、；;]+", d1c) if t.strip())
    t2 = set(t.strip() for t in re.split(r"[,，、；;]+", d2c) if t.strip())
    if t1 and t2 and len(t1 & t2) >= min(len(t1), len(t2)) * 0.6:
        return True
    return SequenceMatcher(None, d1c, d2c).ratio() >= 0.72


def kw_char(kw: dict) -> str:
    n = normalize(kw.get("word", ""))
    return n[0] if n else ""


def word_in_text(word: str, text: str) -> bool:
    return normalize(word) in normalize(text)


# ═══ Phase 1: 词书索引 ═══

def build_wb_index(articles_by_id: dict) -> tuple:
    index = defaultdict(list)
    stats = {"total": 0, "no_aid": 0, "bad_aid": 0, "unmatched": 0, "indexed": 0}

    for wb_file in WB_FILES:
        with open(os.path.join(WB_DIR, wb_file), "r", encoding="utf-8") as f:
            wb = json.load(f)
        for word_entry in wb["words"]:
            word_id = word_entry["id"]
            character = word_entry["character"]
            word_type = word_entry.get("wordType", "shi")
            meanings = word_entry.get("meanings", [])

            for s in word_entry.get("sentences", []):
                stats["total"] += 1
                aid = s.get("articleId")
                if not aid or aid not in articles_by_id:
                    stats["bad_aid" if aid else "no_aid"] += 1
                    continue

                wb_norm = normalize(s["text"])
                si = _match_sentence(s["text"], wb_norm, s.get("targetWord", character),
                                     articles_by_id[aid].get("sentences", []))
                if si is None:
                    stats["unmatched"] += 1
                    continue

                mi = s.get("correctMeaningIndex", 0)
                defn = meanings[mi]["definition"] if meanings and 0 <= mi < len(meanings) else ""

                index[(aid, character)].append({
                    "wordBookId": word_id, "character": character,
                    "wordType": word_type, "text": s["text"],
                    "targetWord": s["targetWord"],
                    "definition": defn, "sentenceIdx": si,
                })
                stats["indexed"] += 1
    return dict(index), stats


def _match_sentence(wb_text, wb_norm, target_word, sentences):
    for i, sent in enumerate(sentences):
        if wb_norm in normalize(sent["text"]):
            return i
    # 括号去除
    wb2 = normalize(re.sub(r"[（(][^）)]*[）)]", "", wb_text))
    if wb2 != wb_norm:
        for i, sent in enumerate(sentences):
            if wb2 in normalize(sent["text"]):
                return i
    # trigram 覆盖
    tris = [wb_norm[j:j+3] for j in range(0, len(wb_norm)-2)]
    if tris:
        best_i, best_cnt = None, 0
        for i, sent in enumerate(sentences):
            sn = normalize(sent["text"])
            if target_word not in sn:
                continue
            cnt = sum(1 for t in tris if t in sn)
            if cnt > best_cnt and (cnt >= 3 or cnt / len(tris) >= 0.7):
                best_cnt, best_i = cnt, i
        if best_i is not None:
            return best_i
    return None


# ═══ Phase 2: 补全缺失 ═══

def add_missing(articles, wb_index):
    articles_by_id = {a["id"]: a for a in articles}
    added, skipped = [], []

    for (aid, character), wb_sentences in wb_index.items():
        article = articles_by_id[aid]
        for wbs in wb_sentences:
            si = wbs["sentenceIdx"]
            sent = article["sentences"][si]

            exists = any(
                kw_char(ekw) == character
                and same_meaning(ekw.get("definition", ""), wbs["definition"])
                for ekw in sent.get("keyWords", [])
            )
            if exists:
                skipped.append((aid, si, wbs["targetWord"]))
                continue

            sent["keyWords"].append({
                "word": wbs["targetWord"],
                "definition": wbs["definition"],
                "wordBookId": wbs["wordBookId"],
                "wordType": wbs["wordType"],
            })
            added.append((aid, si, wbs["targetWord"], wbs["definition"]))
    return added, skipped


# ═══ Phase 3: 修正挂错句子 ═══

def fix_wrong_sentence(articles):
    fixes = []
    for article in articles:
        for si, sent in enumerate(list(article["sentences"])):
            to_remove = []
            for kw in sent.get("keyWords", []):
                if word_in_text(kw["word"], sent["text"]):
                    continue
                new_si = next((sj for sj, o in enumerate(article["sentences"])
                               if sj != si and word_in_text(kw["word"], o["text"])), None)
                if new_si is not None:
                    target = article["sentences"][new_si]
                    if not any(
                        k.get("word") == kw["word"]
                        and same_meaning(k.get("definition", ""), kw.get("definition", ""))
                        for k in target.get("keyWords", [])
                    ):
                        target.setdefault("keyWords", []).append(kw)
                    fixes.append((article["id"], si, new_si, kw["word"]))
                to_remove.append(kw)
            sent["keyWords"] = [k for k in sent.get("keyWords", []) if k not in to_remove]
    return fixes


# ═══ Phase 4: 同义去重 ═══

def deduplicate(articles):
    deduped = []
    for article in articles:
        for si, sent in enumerate(article["sentences"]):
            unique = []
            for kw in sent.get("keyWords", []):
                dup = False
                for ex in unique:
                    if kw["word"] == ex["word"] and same_meaning(
                        kw.get("definition", ""), ex.get("definition", "")
                    ):
                        if kw.get("wordBookId") and not ex.get("wordBookId"):
                            ex["wordBookId"] = kw["wordBookId"]
                        if kw.get("wordType") and not ex.get("wordType"):
                            ex["wordType"] = kw["wordType"]
                        deduped.append((article["id"], si, kw["word"]))
                        dup = True
                        break
                if not dup:
                    unique.append(kw)
            sent["keyWords"] = unique
    return deduped


# ═══ Phase 5: 同字消歧 ═══

# (articleId, sentenceIdx, word, def_substring, occ_index, new_word)
# occ_index=None 表示按定义子串匹配
DISAMBIGUATE = [
    # 茅屋为秋风所破歌: 安得广厦(反问) vs 安如山(安定)
    ("art_051", 3, "安", "安定", "安如山"),
    # 岳阳楼记: 予观夫(看) vs 之大观(景象)
    ("art_001", 1, "观", "景物", "大观"),
    ("art_001", 1, "观", "景象", "大观"),
    # 出师表: 以光(目的) vs 以塞(结果)
    ("art_014", 1, "以", "以致", "以塞"),
    # 狼: 止有剩骨(通只) vs 一狼得骨止(停止)
    ("art_020", 0, "止", "通'只'", "止有"),
    ("art_020", 0, "止", "停止", "骨止"),
    # 齐桓晋文之事: 老吾老(尊敬) vs 人之老(老人)
    ("art_063", 13, "老", "尊敬", "老吾"),
    ("art_063", 13, "老", "老人", "吾老"),
    # 过秦论: 亡矢(失去) vs 追亡(逃跑的人)
    ("art_077", 6, "亡", "逃跑", "追亡"),
    ("art_077", 6, "亡", "失去", "亡矢"),
    # 生于忧患死于安乐: 困于心(被) vs 生于忧患(由于)
    ("art_012", 2, "于", "被（表被动）", "于心"),
    ("art_012", 2, "于", "由于", "于忧患"),
    # 小石潭记: 以为底(作为) vs 为坻(成为)
    ("art_016", 0, "为", "作为", "以为"),
    ("art_016", 0, "为", "成为", "为坻"),
    # 论语: 学而(承接) vs 不愠(转折)
    ("art_010", 0, "而", "转折", "不愠"),
]

WRONG_DELETE = [
    ("art_001", 1, "汤", "殷商"),  # 浩浩汤汤 ≠ 商汤
]


def disambiguate(articles):
    renamed, deleted = [], []
    for article in articles:
        for si, sent in enumerate(article["sentences"]):
            # 删除已知错标
            for rid, rsi, rword, rdef in WRONG_DELETE:
                if article["id"] == rid and si == rsi:
                    before = len(sent["keyWords"])
                    sent["keyWords"] = [
                        k for k in sent["keyWords"]
                        if not (k["word"] == rword and rdef in k.get("definition", ""))
                    ]
                    if len(sent["keyWords"]) < before:
                        deleted.append((rid, si, rword))

            # 应用消歧规则
            for rid, rsi, rword, rdef, rnew in DISAMBIGUATE:
                if article["id"] != rid or si != rsi:
                    continue
                for kw in sent["keyWords"]:
                    if kw["word"] == rword and rdef in kw.get("definition", ""):
                        old = kw["word"]
                        kw["matchWord"] = rnew
                        renamed.append((rid, si, old, rnew))
    return renamed, deleted


# ═══ Phase 6: 后处理 ═══

def post_process(articles, wb_index):
    wt_added = 0
    for article in articles:
        for sent in article.get("sentences", []):
            for kw in sent.get("keyWords", []):
                if kw.get("wordType"):
                    continue
                wb_id = kw.get("wordBookId")
                if not wb_id:
                    continue
                char = kw_char(kw)
                for wbs in wb_index.get((article["id"], char), []):
                    if wbs["wordBookId"] == wb_id:
                        kw["wordType"] = wbs["wordType"]
                        wt_added += 1
                        break

        for sent in article.get("sentences", []):
            sent["keyWords"].sort(
                key=lambda kw: WORD_TYPE_PRIORITY.get(kw.get("wordType", "shi"), 99)
            )

        all_ids = {kw.get("wordBookId") for sent in article.get("sentences", [])
                   for kw in sent.get("keyWords", []) if kw.get("wordBookId")}
        existing = set(article.get("relatedWordIds", []))
        article["relatedWordIds"] = sorted(existing | all_ids)

    return wt_added


# ═══ Phase 7: 验证 ═══

def verify(articles) -> list:
    errors = []
    for a in articles:
        for si, sent in enumerate(a["sentences"]):
            sn = normalize(sent["text"])
            for kw in sent.get("keyWords", []):
                if normalize(kw["word"]) not in sn:
                    errors.append((a["id"], a["title"], si, kw["word"], kw.get("definition", "")))
    return errors


# ═══ 导入数据库 ═══

def import_to_db() -> str:
    try:
        r = subprocess.run(
            ["curl", "-s", "-X", "POST", IMPORT_URL],
            capture_output=True, text=True, timeout=30
        )
        return r.stdout
    except Exception as e:
        return f"导入失败: {e}"


# ═══ Main ═══

def main():
    parser = argparse.ArgumentParser(description="文言雀 articles.json keyWords 全量修复")
    parser.add_argument("--apply", action="store_true", help="执行修复并写回 articles.json")
    parser.add_argument("--import-api", action="store_true", help="修复后自动导入数据库")
    args = parser.parse_args()

    try:
        from articles_io import read_all_articles
        articles = read_all_articles(ARTICLES_DIR)
        print(f"从拆分文件加载: {len(articles)} 篇")
    except (ImportError, FileNotFoundError):
        with open(ARTICLES_PATH, "r", encoding="utf-8") as f:
            articles = json.load(f)
        print(f"从单文件加载: {len(articles)} 篇")
    articles_by_id = {a["id"]: a for a in articles}

    orig_count = sum(len(s.get("keyWords", [])) for a in articles for s in a["sentences"])

    # Phase 1
    wb_index, wb_stats = build_wb_index(articles_by_id)
    # Phase 2
    added, skipped = add_missing(articles, wb_index)
    # Phase 3
    sent_fixes = fix_wrong_sentence(articles)
    # Phase 4
    deduped = deduplicate(articles)
    # Phase 5
    renamed, deleted = disambiguate(articles)
    # Phase 6
    wt_added = post_process(articles, wb_index)
    # Phase 7
    errors = verify(articles)

    new_count = sum(len(s.get("keyWords", [])) for a in articles for s in a["sentences"])
    with_wt = sum(1 for a in articles for s in a["sentences"]
                  for kw in s.get("keyWords", []) if kw.get("wordType"))

    # ── 报告 ──
    print("=" * 58)
    print("  文言雀 articles.json keyWords 全量修复报告")
    print("=" * 58)
    print(f"\n  词书索引: {wb_stats['indexed']}/{wb_stats['total']} 可匹配"
          f" ({wb_stats['unmatched']} 不匹配, {wb_stats['bad_aid']} 无效ID)")

    print(f"\n  补全缺失: +{len(added)} 条  (跳过 {len(skipped)} 条已有)")
    print(f"  修正错位: {len(sent_fixes)} 处")
    print(f"  同义去重: -{len(deduped)} 条")
    print(f"  同字消歧: {len(renamed)} 处  (删除错标 {len(deleted)} 条)")

    if renamed:
        print("    ── 消歧详情 ──")
        for rid, si, old, new in renamed:
            print(f"      {rid} sent{si}: [{old}] → [{new}]")

    print(f"\n  补充 wordType: {wt_added} 条")

    if errors:
        print(f"\n  ❌ 验证: {len(errors)} 处 keyWord 不在所在句子中")
        for e in errors[:5]:
            print(f"    {e[0]} sent{e[2]}: [{e[3]}]")
    else:
        print(f"  ✅ 验证: 所有 keyWord 均在所在句子中出现")

    print(f"\n  keyWords: {orig_count} → {new_count} ({new_count - orig_count:+d})")
    print(f"  wordType 覆盖: {with_wt}/{new_count} ({with_wt / new_count * 100:.1f}%)")
    print()

    if not args.apply and not args.import_api:
        print("  ⚠️  Dry run. 使用 --apply 或 --import-api 执行修复")
        return 0

    # 写入（多文件模式）
    try:
        from articles_io import write_articles_by_grade
        write_articles_by_grade(articles, ARTICLES_DIR)
        print(f"  ✅ 分文件写入并校验通过")
    except ImportError:
        with open(ARTICLES_PATH, "w", encoding="utf-8") as f:
            json.dump(articles, f, ensure_ascii=False, indent=2)
        with open(ARTICLES_PATH, "r", encoding="utf-8") as f:
            json.load(f)  # 校验
        print(f"  ✅ {ARTICLES_PATH} 写入成功，JSON 校验通过")

    if args.import_api:
        result = import_to_db()
        print(f"  ✅ 数据库导入: {result}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
