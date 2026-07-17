#!/usr/bin/env python3
"""
articles.json 数据规范化脚本。

一次运行完成：
  1. 补壳文章 art_shell_006 的 title/author/dynasty
  2. 删除脏 keyWords（word 不在句子中且无 definition）
  3. 补 keyWords 缺失的 wordType（文本规律 → 词书 word 匹配 → 字频 → 虚词白名单 → 默认实词）
  4. 补 keyWords 缺失的 wordBookId（通过 kid → 词书 keyWordRefs 链路）
  5. 数据完整性验证

用法:
  python3 normalize_articles.py               # dry-run
  python3 normalize_articles.py --apply       # 写入 articles.json
"""

import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

# ═══ 路径 ═══

ARTICLES_PATH = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文/articles.json")
WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
WB_FILES = [
    "wb_zhongkao_shixu.json", "wb_zhongkao_tongjia.json",
    "wb_zhongkao_gujinyi.json", "wb_zhongkao_cileihuoyong.json",
    "wb_gaokao_shixu.json", "wb_gaokao_tongjia.json",
    "wb_gaokao_gujinyi.json", "wb_gaokao_cileihuoyong.json",
]

# ═══ 常量 ═══

SHELL_006_FIX = {
    "title": "左忠毅公逸事",
    "author": "方苞",
    "dynasty": "清",
}

COMMON_XU_WORDS = set(
    "之乎者也矣焉哉邪耶与欤夫惟盖而何乃其若所为则以因于"
    "且虽遂既尝竟辄但徒独唯"
)

TOKENS = re.compile(r"[,，、；;]+")


def normalize(text: str) -> str:
    if not text:
        return ""
    # 去掉所有标点、空格、括号
    return re.sub(
        r"[\s,\.!?;:\"'\[\]()"
        r"　，。！？、；："
        r"“”‘’"
        r"「」『』"
        r"【】《》（）"
        r"—〈〉]+",
        "", text)


# ═══ 词书索引 ═══

def build_wb_index():
    """
    构建词书索引：
      - word_to_wt: 词 → wordType（优先保留非 shi）
      - char_to_wt: 单字 → wordType Counter
      - kid_to_wbids: kid → [wordBookId, ...]
    """
    word_to_wt = {}
    char_to_wt = defaultdict(Counter)
    kid_to_wbids = defaultdict(list)

    for wf in WB_FILES:
        fp = os.path.join(WB_DIR, wf)
        if not os.path.exists(fp):
            continue
        with open(fp, encoding="utf-8") as f:
            wb = json.load(f)
        wb_id = wb.get("id", "")
        for entry in wb.get("wordEntries", []):
            w = entry.get("character", "")
            wt = entry.get("wordType", "")
            if w and wt:
                char_to_wt[w][wt] += 1
                if w not in word_to_wt or (wt != "shi" and word_to_wt[w] == "shi"):
                    word_to_wt[w] = wt
            for ref in entry.get("keyWordRefs", []):
                kid = ref.get("kid", "")
                if kid:
                    kid_to_wbids[kid].append(wb_id)

    # 去重
    kid_to_wbids = {k: sorted(set(v)) for k, v in kid_to_wbids.items()}
    return word_to_wt, char_to_wt, kid_to_wbids


# ═══ Phase 1: 补壳文章 title ═══

def fix_shell_titles(articles):
    fixed = []
    for a in articles:
        aid = a.get("id", "")
        if aid == "art_shell_006" and not a.get("title"):
            for k, v in SHELL_006_FIX.items():
                a[k] = v
            fixed.append((aid, a["title"]))
    return fixed


# ═══ Phase 2: 删除脏 keyWords ═══

def remove_dirty_keywords(articles):
    """删除 word 不在所在句子中且无 definition 的脏 keyWords"""
    removed = []
    for a in articles:
        for si, sent in enumerate(a.get("sentences", [])):
            sn = normalize(sent.get("text", ""))
            to_keep = []
            for kw in sent.get("keyWords", []):
                nw = normalize(kw.get("word", ""))
                if nw and nw not in sn:
                    d = kw.get("definition", "")
                    if not d:
                        removed.append((a.get("id"), si, kw.get("word"), kw.get("kid", "")))
                        continue
                to_keep.append(kw)
            sent["keyWords"] = to_keep
    return removed


# ═══ Phase 3: 补 wordType ═══

def infer_wordtype_by_pattern(definition: str):
    if not definition:
        return None
    d = definition.strip()
    if re.match(r"通[''][^'']*['']", d[:10]) or re.match(r"同[''][^'']*['']", d[:10]):
        return "tongjia"
    if "古义" in d and "今义" in d:
        return "gujinyi"
    if any(kw in d for kw in ["活用", "使动用法", "意动用法", "为动用法",
                               "名词作", "动词作", "形容词作", "数词作",
                               "名词用", "动词用", "形容词用"]):
        return "huoyong"
    return None


def fix_wordtype(articles, word_to_wt, char_to_wt):
    stats = {"total": 0, "by_pattern": 0, "by_word": 0,
             "by_char": 0, "by_xu_list": 0, "default_shi": 0}

    for a in articles:
        for sent in a.get("sentences", []):
            for kw in sent.get("keyWords", []):
                if kw.get("wordType"):
                    continue
                stats["total"] += 1
                w = kw.get("word", "")
                d = kw.get("definition", "")
                char = w[0] if w else ""

                if infer_wordtype_by_pattern(d):
                    kw["wordType"] = infer_wordtype_by_pattern(d)
                    stats["by_pattern"] += 1
                elif w in word_to_wt:
                    kw["wordType"] = word_to_wt[w]
                    stats["by_word"] += 1
                elif char in char_to_wt:
                    kw["wordType"] = char_to_wt[char].most_common(1)[0][0]
                    stats["by_char"] += 1
                elif char in COMMON_XU_WORDS:
                    kw["wordType"] = "xu"
                    stats["by_xu_list"] += 1
                else:
                    kw["wordType"] = "shi"
                    stats["default_shi"] += 1

    return stats


# ═══ Phase 4: 补 wordBookId ═══

def fix_wordbookid(articles, kid_to_wbids):
    """通过 article_keyword.kid → 词书 keyWordRefs.kid 链路补 wordBookId"""
    stats = {"missing": 0, "fixed": 0, "unmatched": 0}
    unmatched_samples = []

    for a in articles:
        for sent in a.get("sentences", []):
            for kw in sent.get("keyWords", []):
                wbid = kw.get("wordBookId", "")
                if wbid and wbid != "?":
                    continue
                stats["missing"] += 1
                kid = kw.get("kid", "")
                if kid and kid in kid_to_wbids:
                    kw["wordBookId"] = kid_to_wbids[kid][0]
                    stats["fixed"] += 1
                else:
                    stats["unmatched"] += 1
                    if len(unmatched_samples) < 15:
                        unmatched_samples.append({
                            "articleId": a.get("id", "?"),
                            "title": a.get("title", "?"),
                            "word": kw.get("word", ""),
                            "kid": kid[:50] if kid else "(无)",
                            "definition": (kw.get("definition", "") or "")[:50],
                        })

    return stats, unmatched_samples


# ═══ Phase 5: 验证 ═══

def verify(articles):
    errors = []
    wt_total = wt_null = 0
    wbid_total = wbid_null = 0

    for a in articles:
        aid = a.get("id", "?")
        if not a.get("title"):
            errors.append(f"{aid}: title 为空")
        for si, sent in enumerate(a.get("sentences", [])):
            sn = normalize(sent.get("text", ""))
            for kw in sent.get("keyWords", []):
                wt_total += 1
                if not kw.get("wordType"):
                    wt_null += 1
                wbid = kw.get("wordBookId", "")
                if not wbid or wbid == "?":
                    wbid_total += 1
                    wbid_null += 1
                if normalize(kw.get("word", "")) not in sn:
                    errors.append(
                        f"{aid} sent{si}: [{kw.get('word')}] 不在句子中 "
                        f"def={kw.get('definition', '')[:30]}"
                    )

    return {
        "errors": errors,
        "wordType_coverage": f"{wt_total - wt_null}/{wt_total}",
        "wordType_pct": round((wt_total - wt_null) / wt_total * 100, 1) if wt_total else 0,
        "wordBookId_coverage": f"{wbid_total - wbid_null}/{wbid_total}" if wbid_total else "N/A",
    }


# ═══ Main ═══

def main():
    parser = argparse.ArgumentParser(description="articles.json 数据规范化")
    parser.add_argument("--apply", action="store_true", help="写入 articles.json")
    args = parser.parse_args()

    # 加载数据
    with open(ARTICLES_PATH, encoding="utf-8") as f:
        articles = json.load(f)

    # 构建词书索引
    word_to_wt, char_to_wt, kid_to_wbids = build_wb_index()
    print(f"词书索引: {len(word_to_wt)} 词→wordType, "
          f"{len(char_to_wt)} 字→wordType, "
          f"{len(kid_to_wbids)} 个 kid 有词书引用\n")

    # Phase 1: 补壳文章 title
    title_fixes = fix_shell_titles(articles)
    print(f"[Phase 1] 壳文章 title/author/dynasty: "
          f"{title_fixes if title_fixes else '(无)'}")

    # Phase 2: 删脏 keyWords
    removed = remove_dirty_keywords(articles)
    print(f"[Phase 2] 删除脏 keyWords (word不在句中且无def): "
          f"{removed if removed else '(无)'}")

    # Phase 3: 补 wordType
    wt_stats = fix_wordtype(articles, word_to_wt, char_to_wt)
    print(f"\n[Phase 3] 补 wordType ({wt_stats['total']} 条 NULL):")
    print(f"  文本规律推断: {wt_stats['by_pattern']}")
    print(f"  词书 word 匹配: {wt_stats['by_word']}")
    print(f"  字频匹配: {wt_stats['by_char']}")
    print(f"  虚词白名单: {wt_stats['by_xu_list']}")
    print(f"  默认实词: {wt_stats['default_shi']}")

    # Phase 4: 补 wordBookId
    wbid_stats, wbid_samples = fix_wordbookid(articles, kid_to_wbids)
    print(f"\n[Phase 4] 补 wordBookId:")
    print(f"  缺失总计: {wbid_stats['missing']}")
    print(f"  通过 kid 匹配: {wbid_stats['fixed']}")
    print(f"  无匹配: {wbid_stats['unmatched']}")
    if wbid_samples:
        print(f"  无匹配样本:")
        for s in wbid_samples:
            print(f"    {s['articleId']} ({s['title']}) | {s['word']} | "
                  f"kid={s['kid']} | def={s['definition']}")

    # Phase 5: 验证
    result = verify(articles)
    print(f"\n[Phase 5] 验证:")
    print(f"  wordType 覆盖率: {result['wordType_coverage']} ({result['wordType_pct']}%)")
    print(f"  wordBookId 覆盖: {result['wordBookId_coverage']}")
    if result["errors"]:
        print(f"  ❌ {len(result['errors'])} 个错误:")
        for e in result["errors"][:10]:
            print(f"    {e}")
    else:
        print(f"  ✅ 全部通过")

    total_kw = sum(len(s.get("keyWords", [])) for a in articles for s in a.get("sentences", []))
    print(f"\n  总 keyWords: {total_kw}")

    if not args.apply:
        print("\n  ⚠️  Dry run. 使用 --apply 写入")
        return 0

    # 写入
    with open(ARTICLES_PATH, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    with open(ARTICLES_PATH, encoding="utf-8") as f:
        json.load(f)
    print(f"  ✅ 写入并校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
