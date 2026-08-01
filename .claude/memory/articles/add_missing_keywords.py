#!/usr/bin/env python3
"""
为 articles.json 新增缺失的 keyWord 条目（9 条"找到句子但无 keyWord"的）。

这 9 条来自 fill_kidref.py 分析结果——quizItem 的句子在 articles.json 中存在，
但该词未被标注为 keyWord，导致 kidRef 匹配失败。

用法:
  python3 add_missing_keywords.py               # dry-run
  python3 add_missing_keywords.py --apply       # 写入 articles.json
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict

ARTICLES_PATH = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文/articles.json")  # 旧版单文件（回退用）
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")

# (articleId, sentenceIdx, word, definition, wordType)
NEW_KEYWORDS = [
    # 高考实词虚词
    ("art_shell_012", 2, "左", "左边", "shi"),

    # 中考词类活用
    ("art_016", 2, "蛇", "像蛇那样（名词作状语，表状态）", "huoyong"),
    ("art_002", 0, "山", "沿着山路（名词作状语，表处所）", "huoyong"),
    ("art_016", 0, "西", "向西（名词作状语，表方向）", "huoyong"),
    ("art_016", 2, "凄", "使……感到凄凉（形容词使动用法）", "huoyong"),
    ("art_009", 1, "乱", "使……扰乱（形容词使动用法）", "huoyong"),
    ("art_016", 0, "乐", "以……为快乐（形容词意动用法）", "huoyong"),
    ("art_002", 3, "乐", "以……为快乐（形容词意动用法）", "huoyong"),

    # 中考实词虚词
    ("art_003", 4, "绝", "与世隔绝的", "shi"),
]


def gen_kid(article_id, sent_idx, word, seq):
    """生成 kid: kw_{articleId}_s{sentenceIndex:02d}_{word}_{序号}"""
    return f"kw_{article_id}_s{sent_idx:02d}_{word}_{seq}"


def main():
    parser = argparse.ArgumentParser(description="新增 articles.json 缺失 keyWord")
    parser.add_argument("--apply", action="store_true", help="写入 articles.json")
    args = parser.parse_args()

    try:
        from articles_io import read_all_articles
        articles = read_all_articles(ARTICLES_DIR)
        print(f"从拆分文件加载: {len(articles)} 篇")
    except (ImportError, FileNotFoundError):
        with open(ARTICLES_PATH, encoding="utf-8") as f:
            articles = json.load(f)
        print(f"从单文件加载: {len(articles)} 篇")

    articles_by_id = {a["id"]: a for a in articles}

    added = []
    skipped = []

    for art_id, sent_idx, word, defn, wt in NEW_KEYWORDS:
        art = articles_by_id.get(art_id)
        if not art:
            skipped.append((art_id, sent_idx, word, "article not found"))
            continue

        sent = art["sentences"][sent_idx]
        existing = sent.get("keyWords", [])

        # Check if already exists (word + same_meaning definition)
        already = any(
            kw.get("word") == word and kw.get("definition") == defn
            for kw in existing
        )
        if already:
            skipped.append((art_id, sent_idx, word, "already exists"))
            continue

        # Determine kid sequence number
        max_seq = -1
        for kw in existing:
            if kw.get("word") == word:
                kid = kw.get("kid", "")
                m = re.search(rf"_{re.escape(word)}_(\d+)$", kid)
                if m:
                    max_seq = max(max_seq, int(m.group(1)))
        seq = max_seq + 1
        kid = gen_kid(art_id, sent_idx, word, seq)

        new_kw = {
            "word": word,
            "definition": defn,
            "wordType": wt,
            "kid": kid,
        }
        existing.append(new_kw)
        added.append((art_id, art.get("title", ""), sent_idx, word, defn[:30], kid))

    print(f"新增 keyWord: {len(added)} 条")
    for art_id, title, si, w, d, kid in added:
        print(f"  + [{art_id}] {title} sent{si}: {w} → {d}  (kid={kid})")

    if skipped:
        print(f"\n跳过: {len(skipped)} 条")
        for art_id, si, w, reason in skipped:
            print(f"  - [{art_id}] sent{si}: {w} ({reason})")

    if not args.apply:
        print("\n  ⚠️  Dry run. 使用 --apply 写入")
        return 0

    # 写入（多文件模式）
    try:
        from articles_io import write_articles_by_grade
        write_articles_by_grade(articles, ARTICLES_DIR)
        print(f"  ✅ 分文件写入并校验通过")
    except ImportError:
        with open(ARTICLES_PATH, "w", encoding="utf-8") as f:
            json.dump(articles, f, ensure_ascii=False, indent=2)
        with open(ARTICLES_PATH, encoding="utf-8") as f:
            json.load(f)
        print(f"\n  ✅ {ARTICLES_PATH} 写入并校验通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
