#!/usr/bin/env python3
"""
选篇 keyWords 词书交叉审核脚本。

逐条逐句核查 keyWord 与 8 本打卡型词书的对应关系：
  - word 不在任何打卡型词书中 → DELETE（删除该 keyWord）
  - word 在词书中但无 wordBookId → NO_WB（需手动分配）
  - word 在词书中但 wordBookId 指向错误的词书 → WRONG_WB（需修正）
  - wordType 与目标词书不一致 → WRONG_WT（需修正）
  - 一切正常 → OK

Usage:
  python3 scripts/audit_keywords.py                      # 全量审核，输出报告
  python3 scripts/audit_keywords.py --grade grade11b    # 只审核指定年级
  python3 scripts/audit_keywords.py --batch 1           # 按附表批次审核
  python3 scripts/audit_keywords.py --apply reports/audit_fix_grade11b.py  # 应用修复

审核批次（12 批）:
  1=shell, 2=grade11b, 3=grade12a, 4=grade11a, 5=grade7a, 6=grade9a,
  7=grade10a, 8=grade7b, 9=grade8a, 10=grade8b, 11=grade10b, 12=grade9b
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher

# ═══ 路径 ═══
WB_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/词书")
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# 8 本打卡型词书（不包括虚词解析）
WB_FILES = [
    "wb_zhongkao_shixu.json", "wb_zhongkao_tongjia.json",
    "wb_zhongkao_gujinyi.json", "wb_zhongkao_cileihuoyong.json",
    "wb_gaokao_shixu.json", "wb_gaokao_tongjia.json",
    "wb_gaokao_gujinyi.json", "wb_gaokao_cileihuoyong.json",
]

BATCH_MAP = {
    1: "shell", 2: "grade11b", 3: "grade12a", 4: "grade11a",
    5: "grade7a", 6: "grade9a", 7: "grade10a", 8: "grade7b",
    9: "grade8a", 10: "grade8b", 11: "grade10b", 12: "grade9b",
}

# ═══ 工具 ═══

def norm_def(d):
    """标准化释义，去括号注释和序号前缀。"""
    if not d:
        return ""
    d = re.sub(r"[（(][^）)]*[）)]", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*(名词|动词|形容词|副词|代词|数词|量词|连词|介词|助词|叹词|拟声词)[,，]?\s*", "", d)
    d = re.sub(r"^[（(]?\d+[）)]?\s*", "", d)
    return d.strip()


def same_meaning(d1, d2):
    """语义相似度判断。"""
    d1c, d2c = norm_def(d1), norm_def(d2)
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


def normalize_text(t):
    """去除标点。"""
    if not t:
        return ""
    punct = (
        r"\s,\.!?;:\"'\[\]()　，。！？、；："
        + chr(0x201C) + chr(0x201D) + chr(0x2018) + chr(0x2019)
        + r"「」『』【】《》（）—〈〉　"
    )
    return re.sub(r"[" + re.escape(punct) + r"]+", "", t)


# ═══ 词书索引 ═══

def load_word_books():
    """
    加载 8 本打卡型词书，构建双层索引：
    1. char_index: {character: [{wb_id, wordType, explanation, wordEntryId}, ...]}
    2. quiz_index: {character: [{wb_id, definition, kidRef, targetWord}, ...]}
    """
    char_index = defaultdict(list)
    quiz_index = defaultdict(list)

    for fn in WB_FILES:
        fp = os.path.join(WB_DIR, fn)
        if not os.path.exists(fp):
            continue
        with open(fp, encoding="utf-8") as f:
            wb = json.load(f)
        wb_id = fn.replace(".json", "")
        for entry in wb.get("wordEntries", []):
            ch = entry["character"]
            char_index[ch].append({
                "wb": wb_id,
                "wt": entry.get("wordType", ""),
                "exp": (entry.get("explanation", "") or "")[:120],
                "entryId": entry.get("id", ""),
            })
            for qi in entry.get("quizItems", []):
                quiz_index[ch].append({
                    "wb": wb_id,
                    "def": qi.get("definition", "")[:120],
                    "kidRef": qi.get("kidRef", ""),
                    "targetWord": qi.get("targetWord", ""),
                })

    print(f"📖 8 本打卡型词书: {len(char_index)} unique characters, "
          f"{sum(len(v) for v in char_index.values())} wordEntries")
    return dict(char_index), dict(quiz_index)


# ═══ 文章加载 ═══

def load_articles(grade_filter=None):
    """加载选篇，按年级过滤（如 'shell', 'grade10b'）。"""
    import glob
    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "articles_*.json")))
    articles = []
    for fp in files:
        basename = os.path.basename(fp)
        if grade_filter is not None:
            # Match 'shell' -> articles_shell.json, 'grade10b' -> articles_grade10b.json
            expected = f"articles_{grade_filter}.json"
            if basename != expected:
                continue
        with open(fp, encoding="utf-8") as f:
            data = json.load(f)
            for a in data:
                articles.append(a)
    return articles


# ═══ 审核逻辑 ═══

def audit(articles, char_index, quiz_index):
    """
    逐条审核，返回分类结果。
    """
    results = {"DELETE": [], "NO_WB": [], "WRONG_WB": [], "WRONG_WT": [], "OK": 0}
    stats = {"total": 0, "have_wb": 0, "no_wb": 0}

    for a in articles:
        aid = a["id"]
        title = a["title"]
        textbook = a.get("textbook", "shell")

        for si, sent in enumerate(a.get("sentences", [])):
            stext = sent.get("text", "")[:100]
            for kwi, kw in enumerate(sent.get("keyWords", [])):
                stats["total"] += 1
                word = kw.get("word", "")
                definition = kw.get("definition", "") or ""
                wb_id = kw.get("wordBookId", "") or ""
                word_type = kw.get("wordType", "") or ""
                kid = kw.get("kid", "")

                rec = {
                    "article_id": aid,
                    "title": title,
                    "grade": textbook,
                    "sentence_idx": si,
                    "sentence_text": stext,
                    "kw_index": kwi,
                    "word": word,
                    "definition": definition[:80],
                    "wordBookId": wb_id,
                    "wordType": word_type,
                    "kid": kid,
                }

                if wb_id:
                    stats["have_wb"] += 1
                else:
                    stats["no_wb"] += 1

                # 1. word 不在任何打卡型词书中 → DELETE
                if word not in char_index:
                    rec["reason"] = f"'{word}'不在8本打卡型词书的{len(char_index)}个主词条中"
                    results["DELETE"].append(rec)
                    continue

                candidates = char_index[word]
                candidate_wbs = {c["wb"] for c in candidates}
                candidate_wts = {c["wt"] for c in candidates}

                # 2. 无 wordBookId 但 word 在词书中 → NO_WB
                if not wb_id:
                    rec["candidates"] = [
                        {"wb": c["wb"], "wt": c["wt"], "exp": c["exp"]}
                        for c in candidates
                    ]
                    rec["reason"] = f"word '{word}'在{len(candidate_wbs)}本词书中，但未标注wordBookId"
                    results["NO_WB"].append(rec)
                    continue

                # 3. wordBookId 指向不包含此 word 的词书 → WRONG_WB
                if wb_id not in candidate_wbs:
                    rec["candidates"] = [
                        {"wb": c["wb"], "wt": c["wt"], "exp": c["exp"]}
                        for c in candidates
                    ]
                    rec["reason"] = f"wordBookId '{wb_id}'不包含word '{word}'，正确候选: {sorted(candidate_wbs)}"
                    results["WRONG_WB"].append(rec)
                    continue

                # 4. wordType 与目标词书不一致 → WRONG_WT
                target_wt = None
                for c in candidates:
                    if c["wb"] == wb_id:
                        target_wt = c["wt"]
                        break
                if target_wt and word_type and word_type != target_wt:
                    rec["expected_wt"] = target_wt
                    rec["reason"] = f"wordType '{word_type}'与词书'{wb_id}'的'{target_wt}'不一致"
                    results["WRONG_WT"].append(rec)
                    continue

                # 5. OK
                results["OK"] += 1

    return results, stats


# ═══ 报告 ═══

def print_report(results, stats, grade_label):
    total = stats["total"]
    delete_n = len(results["DELETE"])
    no_wb_n = len(results["NO_WB"])
    wrong_wb_n = len(results["WRONG_WB"])
    wrong_wt_n = len(results["WRONG_WT"])
    ok_n = results["OK"]

    print("=" * 72)
    print(f"  KEYWORD AUDIT REPORT — {grade_label}")
    print("=" * 72)
    print(f"\n  Total keyWords: {total}")
    print(f"  ✅ OK:            {ok_n} ({ok_n/total*100:.0f}%)" if total else "  ✅ OK: 0")
    print(f"  ❌ DELETE:        {delete_n} ({delete_n/total*100:.0f}%)" if total else "  ❌ DELETE: 0")
    print(f"  ⚠️  NO_WB:         {no_wb_n} ({no_wb_n/total*100:.0f}%)" if total else "  ⚠️  NO_WB: 0")
    print(f"  ⚠️  WRONG_WB:      {wrong_wb_n} ({wrong_wb_n/total*100:.0f}%)" if total else "  ⚠️  WRONG_WB: 0")
    print(f"  ⚠️  WRONG_WT:      {wrong_wt_n} ({wrong_wt_n/total*100:.0f}%)" if total else "  ⚠️  WRONG_WT: 0")

    # DELETE 详情
    if results["DELETE"]:
        print(f"\n{'─'*72}")
        print(f"  ❌ DELETE ({delete_n}): word 不在任何打卡型词书中，直接删除")
        print(f"{'─'*72}")
        for r in results["DELETE"]:
            print(f"  {r['article_id']} s{r['sentence_idx']:02d} [{r['word']}]")
            print(f"    def: {r['definition']}")
            print(f"    reason: {r['reason']}")

    # NO_WB 详情
    if results["NO_WB"]:
        print(f"\n{'─'*72}")
        print(f"  ⚠️  NO_WB ({no_wb_n}): word 在词书中但未标注 wordBookId，需人工选择")
        print(f"{'─'*72}")
        for r in results["NO_WB"]:
            print(f"  {r['article_id']}_s{r['sentence_idx']:02d} [{r['word']}]")
            print(f"    text: {r['sentence_text'][:80]}")
            print(f"    def:  {r['definition']}")
            print(f"    candidates ({len(r['candidates'])}):")
            for i, c in enumerate(r["candidates"]):
                marker = " ← RECOMMENDED" if i == 0 else ""
                print(f"      [{i}] {c['wb']} ({c['wt']}) — {c['exp'][:60]}{marker}")
            print()

    # WRONG_WB 详情
    if results["WRONG_WB"]:
        print(f"\n{'─'*72}")
        print(f"  ⚠️  WRONG_WB ({wrong_wb_n}): wordBookId 指向错误的词书，需修正")
        print(f"{'─'*72}")
        for r in results["WRONG_WB"]:
            print(f"  {r['article_id']}_s{r['sentence_idx']:02d} [{r['word']}]")
            print(f"    text: {r['sentence_text'][:80]}")
            print(f"    def:  {r['definition']}")
            print(f"    current wb: {r['wordBookId']} ❌")
            print(f"    correct candidates:")
            for i, c in enumerate(r["candidates"]):
                print(f"      [{i}] {c['wb']} ({c['wt']}) — {c['exp'][:60]}")
            print()

    # WRONG_WT 详情
    if results["WRONG_WT"]:
        print(f"\n{'─'*72}")
        print(f"  ⚠️  WRONG_WT ({wrong_wt_n}): wordType 与目标词书不一致")
        print(f"{'─'*72}")
        for r in results["WRONG_WT"]:
            print(f"  {r['article_id']}_s{r['sentence_idx']:02d} [{r['word']}]")
            print(f"    def:  {r['definition'][:60]}")
            print(f"    wb: {r['wordBookId']} | current wt: {r['wordType']} → expected: {r['expected_wt']}")

    # Summary
    print(f"\n{'='*72}")
    print(f"  SUMMARY: {ok_n} OK, {delete_n} DELETE, {no_wb_n} NO_WB, "
          f"{wrong_wb_n} WRONG_WB, {wrong_wt_n} WRONG_WT")
    print(f"{'='*72}\n")


# ═══ 修复脚本生成 ═══

def generate_fix_script(results, grade_label, output_path):
    """
    生成可执行的 Python 修复脚本（人工预填）。
    每条记录都带注释，人工取消注释即确认该操作。
    """
    total_actions = (len(results["DELETE"]) + len(results["NO_WB"])
                     + len(results["WRONG_WB"]) + len(results["WRONG_WT"]))

    lines = [
        "#!/usr/bin/env python3",
        f"\"\"\"",
        f"审核修复脚本: {grade_label}",
        f"生成时间: auto-generated",
        f"",
        f"用法:",
        f"  python3 reports/audit_fix_{grade_label}.py           # dry-run",
        f"  python3 reports/audit_fix_{grade_label}.py --apply   # 执行修复",
        f"  python3 scripts/audit_keywords.py --apply reports/audit_fix_{grade_label}.py  # 统一入口",
        f"",
        f"使用说明：",
        f"  1. 人工逐条审查，确认每条修复指令",
        f"  2. 取消注释（删除行首的 # 号）即确认该操作",
        f"  3. 对于 NO_WB，将 candidate_index 改为实际的候选序号",
        f"  4. 对于 WRONG_WB/NO_WB，从候选列表中选择正确的词书 ID",
        f"  5. 运行 --apply 执行修复",
        f"\"\"\"",
        f"",
        f"import argparse, json, os, sys",
        f"sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))",
        f"from articles_io import read_all_articles, write_articles_by_grade",
        f"",
        f"ARTICLES_DIR = os.path.expanduser('~/Documents/knowledge_library/文言文/选篇/正文')",
        f"",
        f"# ═══ 修复指令 ═══",
        f"# 每条指令是一个 dict 或操作。取消注释即确认执行。",
        f"FIXES = [",
    ]

    # DELETE 操作
    if results["DELETE"]:
        lines.append(f"    # ── DELETE ({len(results['DELETE'])}): word 不在词书中，删除 keyWord ──")
        for r in results["DELETE"]:
            lines.append(
                f"    # DELETE | {r['article_id']} s{r['sentence_idx']:02d} [{r['word']}] "
                f"\"{r['definition'][:50]}\""
            )
            lines.append(
                f"    # {{'action': 'delete', 'article_id': '{r['article_id']}', "
                f"'sentence_idx': {r['sentence_idx']}, 'kw_index': {r['kw_index']}}},"
            )
            lines.append("")

    # WRONG_WB 操作
    if results["WRONG_WB"]:
        lines.append(f"    # ── WRONG_WB ({len(results['WRONG_WB'])}): 修正 wordBookId ──")
        for r in results["WRONG_WB"]:
            cand_list = ", ".join(f"{c['wb']} ({c['wt']})" for c in r["candidates"])
            lines.append(
                f"    # WRONG_WB | {r['article_id']} s{r['sentence_idx']:02d} [{r['word']}] "
                f"\"{r['definition'][:40]}\""
            )
            lines.append(f"    #   current: {r['wordBookId']} → candidates: [{cand_list}]")
            lines.append(
                f"    # {{'action': 'set_wordbook', 'article_id': '{r['article_id']}', "
                f"'sentence_idx': {r['sentence_idx']}, 'kw_index': {r['kw_index']}, "
                f"'wordBookId': 'FIXME_CHOOSE_FROM_CANDIDATES'}},"
            )
            lines.append("")

    # NO_WB 操作
    if results["NO_WB"]:
        lines.append(f"    # ── NO_WB ({len(results['NO_WB'])}): 补充 wordBookId ──")
        for r in results["NO_WB"]:
            cand_list = ", ".join(f"{c['wb']} ({c['wt']})" for c in r["candidates"])
            lines.append(
                f"    # NO_WB | {r['article_id']} s{r['sentence_idx']:02d} [{r['word']}] "
                f"\"{r['definition'][:40]}\""
            )
            lines.append(f"    #   candidates: [{cand_list}]")
            lines.append(
                f"    # {{'action': 'set_wordbook', 'article_id': '{r['article_id']}', "
                f"'sentence_idx': {r['sentence_idx']}, 'kw_index': {r['kw_index']}, "
                f"'wordBookId': 'FIXME_CHOOSE_FROM_CANDIDATES'}},"
            )
            lines.append("")

    # WRONG_WT 操作
    if results["WRONG_WT"]:
        lines.append(f"    # ── WRONG_WT ({len(results['WRONG_WT'])}): 修正 wordType ──")
        for r in results["WRONG_WT"]:
            lines.append(
                f"    # WRONG_WT | {r['article_id']} s{r['sentence_idx']:02d} [{r['word']}] "
                f"\"{r['definition'][:40]}\""
            )
            lines.append(f"    #   current: {r['wordType']} → expected: {r['expected_wt']}")
            lines.append(
                f"    # {{'action': 'set_wordtype', 'article_id': '{r['article_id']}', "
                f"'sentence_idx': {r['sentence_idx']}, 'kw_index': {r['kw_index']}, "
                f"'wordType': '{r['expected_wt']}'}},"
            )
            lines.append("")

    lines.append("]")
    lines.append("")
    lines.append("")
    lines.append("# ═══ 应用修复 ═══")
    lines.append("")
    lines.append("def apply_fixes(articles):")
    lines.append('    """执行修复指令，返回变更计数器。"""')
    lines.append("    changes = {'delete': 0, 'set_wordbook': 0, 'set_wordtype': 0}")
    lines.append("    articles_by_id = {a['id']: a for a in articles}")
    lines.append("")
    lines.append("    # Uncomment the fixes you want to apply above, then run with --apply")
    lines.append("    active_fixes = [f for f in FIXES if not isinstance(f, str)]")
    lines.append("")
    lines.append("    for fix in active_fixes:")
    lines.append("        a = articles_by_id.get(fix['article_id'])")
    lines.append("        if not a:")
    lines.append("            print(f\"⚠️  Article not found: {fix['article_id']}\")")
    lines.append("            continue")
    lines.append("        sent = a['sentences'][fix['sentence_idx']]")
    lines.append("        kws = sent.get('keyWords', [])")
    lines.append("")
    lines.append("        if fix['action'] == 'delete':")
    lines.append("            # Delete keyWord at kw_index (accounting for previous deletes)")
    lines.append("            target = None")
    lines.append("            for kw in kws:")
    lines.append("                if kw.get('kid') == fix.get('kid'):")
    lines.append("                    target = kw")
    lines.append("                    break")
    lines.append("            if target:")
    lines.append("                sent['keyWords'] = [k for k in kws if k != target]")
    lines.append("                changes['delete'] += 1")
    lines.append("                print(f\"  🗑️  DELETE {fix['article_id']} s{fix['sentence_idx']:02d} [{fix['word']}]\")")
    lines.append("")
    lines.append("        elif fix['action'] == 'set_wordbook':")
    lines.append("            for kw in kws:")
    lines.append("                if kw.get('kid') == fix.get('kid'):")
    lines.append("                    kw['wordBookId'] = fix['wordBookId']")
    lines.append("                    changes['set_wordbook'] += 1")
    lines.append("                    print(f\"  📝 WB {fix['article_id']} s{fix['sentence_idx']:02d} [{kw['word']}] → {fix['wordBookId']}\")")
    lines.append("                    break")
    lines.append("")
    lines.append("        elif fix['action'] == 'set_wordtype':")
    lines.append("            for kw in kws:")
    lines.append("                if kw.get('kid') == fix.get('kid'):")
    lines.append("                    kw['wordType'] = fix['wordType']")
    lines.append("                    changes['set_wordtype'] += 1")
    lines.append("                    print(f\"  📝 WT {fix['article_id']} s{fix['sentence_idx']:02d} [{kw['word']}] → {fix['wordType']}\")")
    lines.append("                    break")
    lines.append("")
    lines.append("    return changes")
    lines.append("")
    lines.append("")
    lines.append("def main():")
    lines.append("    parser = argparse.ArgumentParser()")
    lines.append("    parser.add_argument('--apply', action='store_true')")
    lines.append("    args = parser.parse_args()")
    lines.append("")
    lines.append("    articles = read_all_articles(ARTICLES_DIR)")
    lines.append("    print(f'Loaded {len(articles)} articles')")
    lines.append("")
    lines.append("    if not args.apply:")
    lines.append("        print('\\n  ⚠️  Dry run. Review FIXES above, uncomment confirmed entries, then run with --apply')")
    lines.append("        print(f'  {len([f for f in FIXES if not isinstance(f, str)])} active, {len([f for f in FIXES if isinstance(f, str)])} commented')")
    lines.append("        return 0")
    lines.append("")
    lines.append("    changes = apply_fixes(articles)")
    lines.append("    if sum(changes.values()) == 0:")
    lines.append("        print('No changes applied.')")
    lines.append("        return 0")
    lines.append("")
    lines.append("    write_articles_by_grade(articles, ARTICLES_DIR)")
    lines.append("    print(f'\\n✅ Changes: {changes}')")
    lines.append("    return 0")
    lines.append("")
    lines.append("")
    lines.append("if __name__ == '__main__':")
    lines.append("    sys.exit(main())")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\n📄 Fix script generated: {output_path}")
    print(f"   → Review, uncomment confirmed fixes, then run with --apply")


# ═══ 应用修复 ═══

def apply_fixes(fix_script_path):
    """执行外部修复脚本（dry-run 或 --apply）。"""
    import subprocess
    result = subprocess.run(
        [sys.executable, fix_script_path, "--apply"],
        capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)) + "/.."
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result.returncode


# ═══ Main ═══

def main():
    parser = argparse.ArgumentParser(description="选篇 keyWords 词书交叉审核")
    parser.add_argument("--grade", help="按年级过滤 (shell, grade7a, grade10b, ...)")
    parser.add_argument("--batch", type=int, choices=range(1, 13),
                        help="按批次过滤 (1=shell, 2=grade11b, ..., 12=grade9b)")
    parser.add_argument("--apply", help="应用修复脚本路径")
    args = parser.parse_args()

    # 应用修复模式
    if args.apply:
        return apply_fixes(args.apply)

    # 审核模式
    grade_filter = args.grade
    if args.batch:
        grade_filter = BATCH_MAP[args.batch]

    grade_label = grade_filter or "ALL"
    print(f"🔍 Auditing keyWords — {grade_label}\n")

    char_index, quiz_index = load_word_books()
    articles = load_articles(grade_filter)
    print(f"📄 {len(articles)} articles loaded\n")

    results, stats = audit(articles, char_index, quiz_index)
    print_report(results, stats, grade_label)

    # 生成修复脚本
    if grade_filter:
        output_path = os.path.join(REPORTS_DIR, f"audit_fix_{grade_filter}.py")
        generate_fix_script(results, grade_filter, output_path)

    total_issues = (len(results["DELETE"]) + len(results["NO_WB"])
                    + len(results["WRONG_WB"]) + len(results["WRONG_WT"]))
    return 1 if total_issues > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
