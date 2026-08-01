#!/usr/bin/env python3
"""
将 articles.json 拆分为 12 个按年级分级的小文件。

输出文件（放在同一目录下）：
  articles_grade7a.json  ~ articles_grade12a.json （11 个教材级文件）
  articles_shell.json                            （壳文章，无 textbook）

用法:
  python3 split_articles.py               # dry-run，显示分布
  python3 split_articles.py --apply       # 实际写入 12 个文件
"""

import argparse
import json
import os
import sys
from collections import defaultdict

# ═══ 路径 ═══
ARTICLES_PATH = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文/articles.json")
ARTICLES_DIR = os.path.dirname(ARTICLES_PATH)

# textbook → 文件名后缀
GRADE_FILE_MAP = {
    "grade7a": "grade7a",
    "grade7b": "grade7b",
    "grade8a": "grade8a",
    "grade8b": "grade8b",
    "grade9a": "grade9a",
    "grade9b": "grade9b",
    "grade10a": "grade10a",
    "grade10b": "grade10b",
    "grade11a": "grade11a",
    "grade11b": "grade11b",
    "grade12a": "grade12a",
}


def main():
    parser = argparse.ArgumentParser(description="拆分 articles.json 为 12 个分级文件")
    parser.add_argument("--apply", action="store_true", help="实际写入文件")
    args = parser.parse_args()

    # 读取
    with open(ARTICLES_PATH, "r", encoding="utf-8") as f:
        articles = json.load(f)

    print(f"📖 已读取 articles.json：共 {len(articles)} 篇\n")

    # 分组
    groups = defaultdict(list)
    for a in articles:
        tb = a.get("textbook")
        if tb and tb in GRADE_FILE_MAP:
            groups[tb].append(a)
        else:
            groups["shell"].append(a)

    # 打印分布
    total = 0
    for key in sorted(groups.keys()):
        cnt = len(groups[key])
        total += cnt
        label = f"{key} (壳文章)" if key == "shell" else key
        print(f"  articles_{key}.json  → {cnt:>4} 篇  ({label})")
    print(f"  {'─' * 40}")
    print(f"  合计                  {total:>4} 篇\n")

    if total != len(articles):
        print(f"❌ 分组后总数 ({total}) ≠ 原始总数 ({len(articles)})，终止")
        sys.exit(1)

    # 重复检测
    ids = [a["id"] for a in articles]
    dupes = {i: c for i, c in __import__("collections").Counter(ids).items() if c > 1}
    if dupes:
        print(f"❌ ID 重复: {dupes}，终止")
        sys.exit(1)

    if not args.apply:
        print("🔍 dry-run 模式。加 --apply 写入文件。")
        return

    # 写入
    for key, lst in sorted(groups.items()):
        out_path = os.path.join(ARTICLES_DIR, f"articles_{key}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(lst, f, ensure_ascii=False, indent=2)
        print(f"  ✅ {out_path} ({len(lst)} 篇)")

    print(f"\n✅ 拆分完成。共 {len(groups)} 个文件，{total} 篇。")


if __name__ == "__main__":
    main()
