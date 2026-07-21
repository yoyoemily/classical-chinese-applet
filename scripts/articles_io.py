"""
articles.json 多文件读写工具函数。
共享于 scripts/ 下的所有维护脚本。

拆分后的文件结构（12 个文件）：
  articles_grade7a.json  ~ articles_grade12a.json  (11 个教材级文件)
  articles_shell.json                              (壳文章)
"""

import json
import os
from collections import defaultdict

ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
ARTICLES_PATTERN = "articles_*.json"

# 文件名后缀 → textbook 值 映射
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
    "shell": None,  # 壳文章 textbook = null
}


def read_all_articles(dir_path=None):
    """
    从拆分的 12 个 articles_*.json 文件中读取全部文章。

    Returns:
        list: 全部文章列表（合并为一个数组）
    """
    if dir_path is None:
        dir_path = ARTICLES_DIR

    import glob
    all_articles = []
    pattern = os.path.join(dir_path, ARTICLES_PATTERN)
    files = sorted(glob.glob(pattern))

    if not files:
        raise FileNotFoundError(f"未找到任何 {ARTICLES_PATTERN} 文件于 {dir_path}")

    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                all_articles.extend(data)

    return all_articles


def write_articles_by_grade(articles, dir_path=None):
    """
    按 textbook 字段将文章写回对应的 articles_{grade}.json 文件。
    壳文章 (textbook 为 null/空/不匹配教材) 写入 articles_shell.json。

    Args:
        articles: 全部文章列表
        dir_path: 目标目录，默认知识库选篇正文目录
    """
    if dir_path is None:
        dir_path = ARTICLES_DIR

    # 分组
    groups = defaultdict(list)
    for a in articles:
        tb = a.get("textbook")
        if tb and tb in GRADE_FILE_MAP:
            groups[tb].append(a)
        else:
            groups["shell"].append(a)

    # 写入
    total = 0
    for key, lst in sorted(groups.items()):
        out_path = os.path.join(dir_path, f"articles_{key}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(lst, f, ensure_ascii=False, indent=2)
        total += len(lst)
        print(f"  ✅ {out_path} ({len(lst)} 篇)")

    # 校验
    for key in sorted(groups.keys()):
        out_path = os.path.join(dir_path, f"articles_{key}.json")
        with open(out_path, "r", encoding="utf-8") as f:
            json.load(f)  # 会抛出异常如果 JSON 不合法

    print(f"\n  总计 {len(groups)} 个文件，{total} 篇，JSON 校验全部通过。")
    return total
