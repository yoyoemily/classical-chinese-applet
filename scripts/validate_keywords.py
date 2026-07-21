#!/usr/bin/env python3
"""
校验全部选篇 keyWords 的词书覆盖率。

对每一条 keyWord，在 9 本词书的 wordEntries[].character 中查是否存在，
并按年级统计命中率。不在任何词书中的 keyWord 建议移入 glossary。

Usage:
  python3 scripts/validate_keywords.py           # 全文报告
  python3 scripts/validate_keywords.py --grade grade10b  # 只检查指定年级
  python3 scripts/validate_keywords.py --miss-only       # 只输出遗漏条目
"""

import json, os, sys, glob, argparse

WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")


def load_word_books():
    """加载全部词书，构建 character -> [(wb_id, explanation)] 索引。"""
    index = {}
    for fname in sorted(os.listdir(WB_DIR)):
        if not fname.endswith(".json"):
            continue
        wb_id = fname.replace(".json", "")
        with open(os.path.join(WB_DIR, fname), encoding="utf-8") as f:
            wb = json.load(f)
        for entry in wb.get("wordEntries", []):
            ch = entry.get("character", "")
            if ch not in index:
                index[ch] = []
            index[ch].append({
                "wb": wb_id,
                "exp": entry.get("explanation", "")[:100],
                "wt": entry.get("wordType", ""),
            })
    print(f"📖 Loaded {len(os.listdir(WB_DIR))} word books, {len(index)} unique characters\n")
    return index


def load_articles(grade_filter=None):
    """加载选篇正文。"""
    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "articles_*.json")))
    articles = []
    for fp in files:
        basename = os.path.basename(fp)
        if grade_filter and grade_filter not in basename:
            continue
        with open(fp, encoding="utf-8") as f:
            data = json.load(f)
            for a in data:
                articles.append(a)
    return articles


def validate(wb_index, articles, miss_only=False):
    total = 0
    hit = 0
    miss = []
    by_grade = {}

    for a in articles:
        grade = a.get("textbook", "unknown")
        if grade not in by_grade:
            by_grade[grade] = {"total": 0, "hit": 0, "miss": []}

        for si, s in enumerate(a.get("sentences", [])):
            for kw in s.get("keyWords", []):
                total += 1
                by_grade[grade]["total"] += 1

                word = kw["word"]
                wb_id = kw.get("wordBookId", "")
                definition = kw.get("definition", "")[:60]

                if word in wb_index:
                    hit += 1
                    by_grade[grade]["hit"] += 1
                else:
                    miss.append({
                        "art_id": a["id"],
                        "title": a["title"],
                        "grade": grade,
                        "si": si,
                        "word": word,
                        "wordType": kw.get("wordType", ""),
                        "wordBookId": wb_id,
                        "definition": definition,
                    })
                    by_grade[grade]["miss"].append(word)

    # Print report
    print("=" * 72)
    print("KEYWORD × WORD BOOK CROSS-VALIDATION REPORT")
    print("=" * 72)

    for grade in sorted(by_grade.keys(), key=lambda x: x or ""):
        g = by_grade[grade]
        gd = grade or "none"
        pct = f"{g['hit']}/{g['total']} ({g['hit']/g['total']*100:.0f}%)" if g['total'] > 0 else "N/A"
        status = "✅" if g['total'] == g['hit'] else "❌"
        print(f"  {gd:12s}: {status} {pct}")

    print(f"\n{'Total':12s}: {hit}/{total} ({hit/total*100:.0f}% hit rate, {len(miss)} needing fix)")

    if not miss:
        print("\n✅ All keyWords are present in word books!")
        return

    if miss_only:
        for m in miss:
            print(f"{m['art_id']} s{m['si']} \"{m['word']}\" ({m['wordType']}, wb={m['wordBookId'] or 'null'}) — {m['title']}")
    else:
        print(f"\n{'='*72}")
        print(f"❌ {len(miss)} KEYWORDS NOT IN ANY WORD BOOK (should be moved to glossary)")
        print(f"{'='*72}\n")

        print(f"{'kid'.ljust(26)} {'word'.ljust(12)} {'type'.ljust(10)} {'wb'.ljust(22)} title")
        print("-" * 100)
        for m in miss:
            wb_display = m['wordBookId'] if m['wordBookId'] else '❌ null'
            print(
                f"{m['art_id']}_s{m['si']:02d}_{m['word']}".ljust(26)
                + f"{m['word']}".ljust(12)
                + f"{m['wordType']}".ljust(10)
                + f"{wb_display}".ljust(22)
                + f"{m['title']}"
            )

        print(f"\n💡 Action: these {len(miss)} entries should be moved to glossary (if culturally significant) or removed.")
        print(f"   Then re-run this script to verify 100% hit rate.\n")

    return miss


def main():
    parser = argparse.ArgumentParser(description="Validate keyWord word-book coverage")
    parser.add_argument("--grade", help="Only check specific grade (e.g. grade10b)")
    parser.add_argument("--miss-only", action="store_true", help="Only print missing entries")
    args = parser.parse_args()

    wb_index = load_word_books()
    articles = load_articles(args.grade)

    miss = validate(wb_index, articles, miss_only=args.miss_only)
    if miss:
        sys.exit(1)


if __name__ == "__main__":
    main()
