#!/usr/bin/env python3
"""
从词书 quizItem.sentenceText 回填缺失句子到 articles.json。

只补词书实际引用的句子、带 keyWord（word/definition/wordType），不加译文。
回填后重跑 fill_kidref.py 即可自动匹配 kidRef。

用法:
  python3 backfill_sentences.py               # dry-run
  python3 backfill_sentences.py --apply       # 写入 articles.json
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict

ARTICLES_PATH = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文/articles.json")  # 旧版单文件（回退用）
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
WB_FILES = sorted(
    f for f in os.listdir(WB_DIR)
    if f.startswith("wb_") and f.endswith(".json") and f != "wb_function_words.json"
)

LQ = chr(0x201C); RQ = chr(0x201D)
LSQ = chr(0x2018); RSQ = chr(0x2019)

SOURCE_ALIASES = {"天时不如地利": "得道多助失道寡助"}


def normalize(t):
    if not t:
        return ""
    punc = "".join([
        r"\s,\.!?;:\"'\[\]()　，。！？、；：",
        LQ, RQ, LSQ, RSQ,
        r"「」『』【】《》（）", r"—〈〉　",
    ])
    return re.sub(r"[" + re.escape(punc) + r"]+", "", t)


def gen_kid(article_id, sent_idx, word, seq):
    return f"kw_{article_id}_s{sent_idx:02d}_{word}_{seq}"


# ═══ Phase 1: 收集缺失句子 ═══

def collect_missing(articles, wb_files):
    by_id = {a["id"]: a for a in articles}
    by_title = {}
    for a in articles:
        t = a.get("title", "").replace(LQ, "").replace(RQ, "")
        by_title[t] = a
        tn = normalize(t)
        if tn:
            by_title[tn] = a

    # article_id -> [ {text, keywords: [{word, definition, wordType}]} ]
    missing = defaultdict(list)

    for wf in wb_files:
        fp = os.path.join(WB_DIR, wf)
        with open(fp, encoding="utf-8") as f:
            wb = json.load(f)
        name = wb.get("name", "?")
        for entry in wb.get("wordEntries", []):
            wt = entry.get("wordType", "")
            for qi in entry.get("quizItems", []):
                if qi.get("kidRef"):
                    continue
                qst = qi.get("sentenceText", "")
                qsrc = qi.get("sentenceSource", "")
                tw = qi.get("targetWord", "")
                qd = qi.get("definition", "")
                if not qst or not qsrc:
                    continue

                # Find article
                src_clean = qsrc.replace(LQ, "").replace(RQ, "").replace("必修上", "").replace("选必中", "").replace("八下", "").replace("九上", "").replace("七上", "").replace("七下", "").strip()
                for alias, real in SOURCE_ALIASES.items():
                    if alias in src_clean:
                        src_clean = src_clean.replace(alias, real)

                art = None
                for k, a in by_title.items():
                    if src_clean in k or k in src_clean:
                        art = a; break
                if not art:
                    continue

                aid = art["id"]
                qsn = normalize(qst)
                # Check if already in article
                art_sn = [normalize(s.get("text", "")) for s in art.get("sentences", [])]
                if any(qsn in asn or (len(qsn) > 10 and asn in qsn) for asn in art_sn):
                    continue

                # Dedup
                dup = False
                for ex in missing[aid]:
                    if normalize(ex["text"]) == qsn:
                        ex["keywords"].append({"word": tw, "definition": qd, "wordType": wt})
                        dup = True
                        break
                if not dup:
                    missing[aid].append({
                        "text": qst,
                        "keywords": [{"word": tw, "definition": qd, "wordType": wt}],
                    })

    return dict(missing)


# ═══ Phase 2: 回填 ═══

def backfill(articles, missing):
    stats = defaultdict(int)
    by_id = {a["id"]: a for a in articles}

    for aid, sents in sorted(missing.items()):
        art = by_id[aid]
        old_count = len(art.get("sentences", []))
        for sent_data in sents:
            si = len(art.get("sentences", []))  # append
            for kw in sent_data["keywords"]:
                # Gen kid: find max seq for this word among ALL existing keywords
                max_seq = -1
                for s in art.get("sentences", []):
                    for ekw in s.get("keyWords", []):
                        if ekw.get("word") == kw["word"]:
                            kid = ekw.get("kid", "")
                            m = re.search(rf"_{re.escape(kw['word'])}_(\d+)$", kid)
                            if m:
                                max_seq = max(max_seq, int(m.group(1)))
                seq = max_seq + 1
                kid = gen_kid(aid, si, kw["word"], seq)
                kw["kid"] = kid

            art.setdefault("sentences", []).append({
                "text": sent_data["text"],
                "translation": None,
                "keyWords": [{
                    "word": kw["word"],
                    "definition": kw["definition"],
                    "wordType": kw.get("wordType", "shi"),
                    "kid": kw["kid"],
                } for kw in sent_data["keywords"]],
            })
        stats[aid] = {
            "title": art.get("title", "?"),
            "old": old_count,
            "new": len(art.get("sentences", [])),
            "sentences": len(sents),
        }

    return stats


# ═══ Main ═══

def main():
    parser = argparse.ArgumentParser(description="回填缺失句子到 articles.json")
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

    missing = collect_missing(articles, WB_FILES)
    stats = backfill(articles, missing)

    total_new_sents = sum(s["sentences"] for s in stats.values())
    print(f"回填句子: {len(stats)} 篇文章, 共 {total_new_sents} 句\n")
    for aid in sorted(stats.keys()):
        s = stats[aid]
        print(f"  [{aid}] {s['title']}: {s['old']} → {s['new']} 句 (+{s['sentences']})")

    if not args.apply:
        print(f"\n  ⚠️  Dry run. 使用 --apply 写入")
        return 0

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
