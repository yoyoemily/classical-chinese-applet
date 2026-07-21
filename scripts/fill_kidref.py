#!/usr/bin/env python3
"""
词书 quizItem.kidRef 填充脚本。

匹配策略（逐级降级）：
  1. targetWord + definition 语义匹配 article_keyword（优先非壳文章）
  2. 多条匹配时用 sentenceText 二次消歧
  3. 都无法匹配 → 留空，汇总报告

用法:
  python3 fill_kidref.py               # dry-run
  python3 fill_kidref.py --apply       # 写入词书 JSON
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher

# ═══ 路径 ═══

ARTICLES_PATH = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文/articles.json")  # 旧版单文件（回退用）
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
WB_FILES = [
    "wb_zhongkao_shixu.json", "wb_zhongkao_tongjia.json",
    "wb_zhongkao_gujinyi.json", "wb_zhongkao_cileihuoyong.json",
    "wb_gaokao_shixu.json", "wb_gaokao_tongjia.json",
    "wb_gaokao_gujinyi.json", "wb_gaokao_cileihuoyong.json",
]


# ═══ 工具函数 ═══

def norm_def(d):
    """标准化释义文本，去掉括号注释和序号前缀，便于匹配"""
    if not d:
        return ""
    d = re.sub(r"[（(][^）)]*[）)]", "", d)  # 去括号注释
    d = re.sub(r"^[（(]?\d+[）)]?\s*名词[,，]?\s*", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*副词[,，]?\s*", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*动词[,，]?\s*", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*形容词[,，]?\s*", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*", "", d)
    d = d.strip()
    return d


_LQ = chr(0x201C)  # "
_RQ = chr(0x201D)  # "
_LSQ = chr(0x2018)  # '
_RSQ = chr(0x2019)  # '

def normalize_text(t):
    if not t:
        return ""
    punct = (
        r"\s,\.!?;:\"'\[\]()"
        r"　，。！？、；："
        + _LQ + _RQ + _LSQ + _RSQ +
        r"「」『』"
        r"【】《》（）"
        r"—〈〉"
        r"　"
    )
    return re.sub(r"[" + re.escape(punct) + r"]+", "", t)


def same_meaning(d1, d2):
    """语义相似度，返回 (bool, score)"""
    d1c = norm_def(d1)
    d2c = norm_def(d2)
    if not d1c or not d2c:
        return False, 0.0
    if d1c == d2c:
        return True, 1.0
    if d1c in d2c or d2c in d1c:
        return True, 0.9
    t1 = set(t.strip() for t in re.split(r"[,，、；;]+", d1c) if t.strip())
    t2 = set(t.strip() for t in re.split(r"[,，、；;]+", d2c) if t.strip())
    if t1 and t2 and len(t1 & t2) >= min(len(t1), len(t2)) * 0.6:
        return True, 0.8
    ratio = SequenceMatcher(None, d1c, d2c).ratio()
    return ratio >= 0.72, ratio


# ═══ 选篇索引 ═══

def build_ak_index(articles):
    """
    构建 article_keyword 索引。
    返回 [(word, definition, kid, articleId, sentenceText, isShell), ...]
    """
    index = []
    for a in articles:
        aid = a.get("id", "")
        is_shell = aid.startswith("art_shell_")
        for sent in a.get("sentences", []):
            stext = sent.get("text", "")[:80]
            for kw in sent.get("keyWords", []):
                w = kw.get("word", "")
                d = kw.get("definition", "")
                kid = kw.get("kid", "")
                if w and kid:
                    index.append((w, d, kid, aid, stext, is_shell))
    return index


# ═══ 匹配逻辑 ═══

def find_kidref(quiz_item, entry, ak_index):
    """
    为单个 quizItem 找到最佳 kidRef。
    返回 (kid, 匹配方式) 或 (None, 原因说明)。
    """
    tw = quiz_item.get("targetWord", "")
    qd = quiz_item.get("definition", "")
    qst = quiz_item.get("sentenceText", "")

    # Phase A: word + definition 语义匹配
    word_matches = [
        (w, d, kid, aid, st, shell)
        for w, d, kid, aid, st, shell in ak_index
        if (tw == w or (len(tw) > 1 and tw in w) or (len(w) > 1 and w in tw))
    ]
    sem_matches = [
        (kid, score, shell)
        for w, d, kid, aid, st, shell in word_matches
        for ok, score in [same_meaning(qd, d)]
        if ok
    ]

    if sem_matches:
        # 优先非壳文章
        non_shell = [(k, s, sh) for k, s, sh in sem_matches if not sh]
        bests = non_shell if non_shell else sem_matches
        # 取最高分
        bests.sort(key=lambda x: x[1], reverse=True)
        top_score = bests[0][1]
        top = [(k, s) for k, s, _ in bests if s == top_score]

        if len(top) == 1:
            return top[0][0], f"def_match({top_score:.2f})"

        # 多条同分 → 用 sentenceText 消歧
        # 查每条 kid 对应的句子原文，与 quizItem.sentenceText 比较
        kid_to_stext = {
            kid: st for w, d, kid, aid, st, sh in word_matches
            if kid in {k for k, _ in top}
        }
        qsn = normalize_text(qst) if qst else ""
        best_kid, best_overlap = None, 0
        for k, _ in top:
            sn = normalize_text(kid_to_stext.get(k, ""))
            if qsn and sn:
                overlap = sum(1 for c in sn if c in qsn)
                if overlap > best_overlap:
                    best_overlap, best_kid = overlap, k
        if best_kid:
            return best_kid, f"def+sent_match({best_overlap})"
        # 消歧失败，用第一个
        return top[0][0], f"def_match_ambiguous({len(top)})"

    # Phase B: 词级匹配（只匹配 word，不匹配 definition）
    if word_matches:
        # 优先非壳文章
        non_shell = [(w, d, kid, aid, st) for w, d, kid, aid, st, shell in word_matches if not shell]
        candidates = non_shell if non_shell else [(w, d, kid, aid, st) for w, d, kid, aid, st, shell in word_matches]
        qsn = normalize_text(qst) if qst else ""
        if qsn:
            # 用 sentenceText 消歧
            best_kid, best_overlap = None, 0
            for w, d, kid, aid, st in candidates:
                sn = normalize_text(st)
                overlap = sum(1 for c in sn if c in qsn)
                if overlap > best_overlap:
                    best_overlap, best_kid = overlap, kid
            if best_kid and best_overlap >= 2:
                return best_kid, f"word+sent_match({best_overlap})"
        # 唯一候选
        if len(candidates) == 1:
            return candidates[0][2], "word_only_match"
        return None, f"word_no_def_match({len(candidates)}_candidates)"

    # Phase C: 彻底无法匹配
    return None, "no_word_match"


# ═══ 主流程 ═══

def fill_all(articles_path, wb_files):
    # 优先多文件模式
    try:
        from articles_io import read_all_articles
        articles = read_all_articles(ARTICLES_DIR)
        print(f"从拆分文件加载: {len(articles)} 篇")
    except (ImportError, FileNotFoundError):
        with open(articles_path, encoding="utf-8") as f:
            articles = json.load(f)
        print(f"从单文件加载: {len(articles)} 篇")
    ak_index = build_ak_index(articles)
    print(f"选篇索引: {len(ak_index)} 条 keyWord")

    total_qi = 0
    empty_before = 0
    filled = 0
    unmatched = 0
    by_method = defaultdict(int)
    unmatched_samples = []

    results = {}  # book_id -> book_data

    for wf in wb_files:
        fp = os.path.join(WB_DIR, wf)
        if not os.path.exists(fp):
            continue
        with open(fp, encoding="utf-8") as f:
            wb = json.load(f)

        book_total = book_filled = book_unmatched = 0
        for entry in wb.get("wordEntries", []):
            for qi in entry.get("quizItems", []):
                total_qi += 1
                if not qi.get("kidRef"):
                    empty_before += 1
                    book_total += 1
                    kid, reason = find_kidref(qi, entry, ak_index)
                    if kid:
                        qi["kidRef"] = kid
                        filled += 1
                        book_filled += 1
                        by_method[reason] += 1
                    else:
                        unmatched += 1
                        book_unmatched += 1
                        if len(unmatched_samples) < 20:
                            unmatched_samples.append({
                                "book": wb.get("name", "?"),
                                "char": entry.get("character", "?"),
                                "targetWord": qi.get("targetWord", "?"),
                                "def": qi.get("definition", "")[:60],
                                "reason": reason,
                            })

        results[wf] = {"book": wb, "total": book_total, "filled": book_filled, "unmatched": book_unmatched}

    # 报告
    print(f"\n词书 quizItems: 共 {total_qi} 条，空 kidRef {empty_before} 条")
    print(f"\n匹配结果:")
    print(f"  成功: {filled} ({filled/empty_before*100:.1f}%)" if empty_before > 0 else "  成功: 0")
    print(f"  失败: {unmatched} ({unmatched/empty_before*100:.1f}%)" if empty_before > 0 else "  失败: 0")
    print(f"\n匹配方式分布:")
    for method, cnt in sorted(by_method.items()):
        print(f"  {method}: {cnt}")

    print(f"\n各词书详情:")
    for wf in sorted(results.keys()):
        r = results[wf]
        name = r["book"].get("name", wf)
        print(f"  {name}: {r['filled']}/{r['total']} 已填充"
              + (f" ({r['unmatched']} 未匹配)" if r["unmatched"] else ""))

    if unmatched_samples:
        print(f"\n未匹配样本 (前 {min(20, len(unmatched_samples))} 条):")
        for s in unmatched_samples:
            print(f"  [{s['book']}] {s['char']} | {s['targetWord']}")
            print(f"    def: {s['def']}")
            print(f"    reason: {s['reason']}")

    return results, ak_index


# ═══ Main ═══

def main():
    parser = argparse.ArgumentParser(description="词书 quizItem.kidRef 填充")
    parser.add_argument("--apply", action="store_true", help="写入词书 JSON 文件")
    args = parser.parse_args()

    results, _ = fill_all(ARTICLES_PATH, WB_FILES)

    if not args.apply:
        print("\n  ⚠️  Dry run. 使用 --apply 写入词书 JSON")
        return 0

    # 写入
    for wf, r in results.items():
        if r["filled"] == 0:
            continue
        fp = os.path.join(WB_DIR, wf)
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(r["book"], f, ensure_ascii=False, indent=2)
        # 校验
        with open(fp, encoding="utf-8") as f:
            json.load(f)
        print(f"  ✅ {wf} 写入成功")

    print(f"\n  共 {sum(1 for r in results.values() if r['filled'] > 0)} 本词书已更新")
    return 0


if __name__ == "__main__":
    sys.exit(main())
