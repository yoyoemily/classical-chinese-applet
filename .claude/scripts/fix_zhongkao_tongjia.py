#!/usr/bin/env python3
"""
中考通假字一本通（wb_zhongkao_tongjia）审核修复脚本

修复内容：
  阶段一 #3: 正确答案有误（6条）— 修改 definition
  阶段二 #4+#5+#7: 选项/干扰项/target问题（9条）— 修改 distractors/sentenceText
  阶段三 #8: kidRef 指向错误（10条）— 修改 kidRef

用法:
  python3 fix_zhongkao_tongjia.py           # dry-run，显示将要修改的内容
  python3 fix_zhongkao_tongjia.py --apply   # 实际修改
"""

import argparse
import json
import os
import sys

# ─── 路径配置 ───────────────────────────────────────

HOME = os.path.expanduser("~")
WB_PATH = os.path.join(HOME, "knowledge_library/文言文/词书/wb_zhongkao_tongjia.json")
ART_DIR = os.path.join(HOME, "knowledge_library/文言文/选篇/正文")
WB_BACKUP = WB_PATH + ".bak"

# 需要修改的 articles 文件
def art_paths():
    return [
        os.path.join(ART_DIR, "articles_grade9a.json"),   # 陈涉世家 art_022
        os.path.join(ART_DIR, "articles_grade9b.json"),   # 送东阳马生序 art_005
    ]

# ─── 工具函数 ───────────────────────────────────────

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    """保存 JSON，保持中文不转义、美化输出"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # 校验
    with open(path, 'r', encoding='utf-8') as f:
        json.load(f)
    print(f"  ✅ 已保存并校验: {path}")

def find_qi(entries, qi_id):
    """在词书 entries 中查找指定 quizItem"""
    for entry in entries:
        for qi in entry.get('quizItems', []):
            if qi['id'] == qi_id:
                return entry, qi
    return None, None

# ─── 阶段一 #3: 正确答案有误 ──────────────────────

# (quiz_id, new_definition)
FIXES_3 = [
    ('s_c_0470', '穿在身上或披在身上（通“披”）'),
    ('s_c_0471', '穿在身上或披在身上（通“披”）'),
    ('s_c_0482', '通“德”，感激、感恩'),
    ('s_c_0484', '通“欤”，句末语气词（吗/呢）'),
    ('s_c_0497', '通“智”，智慧、明智'),
    ('s_c_0505', '详细'),
]

# 阶段一配套: articles JSON 中需要修改的 keyWord definition
# (quiz_id, article_id, sentence_index, word, new_definition)
ARTICLES_KEYWORD_UPDATES = [
    # 被: "同舍生皆被绮绣" 送东阳马生序 art_005 s04
    ('s_c_0470', 'art_005', 4, '被', '穿在身上或披在身上（通“披”）'),
    # 被: "将军身被坚执锐" 陈涉世家 art_022 s05
    ('s_c_0471', 'art_022', 5, '被', '穿在身上或披在身上（通“披”）'),
]

# ─── 阶段二 #4+#5: 选项重复 + 干扰项含答案 ────────

# (quiz_id, old_distractor_text, new_distractor_text)
FIXES_45 = [
    # #4: s_c_0470 被: "被（介词）" 被 "被迫"/"被子"包含
    ("s_c_0470", "被（介词）", "遭受，蒙受"),
    # #4: s_c_0471 被: 同上
    ("s_c_0471", "被（介词）", "遭受，蒙受"),
    # #4: s_c_0482 得: "获得"与"得到"近义重复
    ("s_c_0482", "获得", "丢失，失去"),
    # #4/#5: s_c_0495 不: "不（否定副词）"被"不是"/"不要"包含
    ("s_c_0495", "不（否定副词）", "否则，不然"),
    # #4/#5: s_c_0496 不: 同上
    ("s_c_0496", "不（否定副词）", "否则，不然"),
    # #4: s_c_0497 知: "知晓"与"知道"近义重复（def已改为通"智"）
    ("s_c_0497", "知晓", "了解，懂得"),
]

# 整组替换的干扰项（三个全换）
# (quiz_id, [new_dist0, new_dist1, new_dist2])
FIXES_45_REPLACE_ALL = [
    # #4/#5: s_c_1464 衡: 干扰项含元概念标签+正确答案
    ("s_c_1464", ["平衡", "衡量", "均衡"]),
]

# 部分替换的干扰项（换指定位置）
# (quiz_id, {index: new_text, ...})
FIXES_45_REPLACE_INDEX = [
    # #4: s_c_1465 尔: dist[1]="通假字，同某字"、dist[2]="古今异义，不同于今义" → 元概念标签
    ("s_c_1465", {1: "你，你的", 2: "这样，如此"}),
    # #4: s_c_1466 华: dist[1]="通假字，同某字"、dist[2]="古今异义，不同于今义" → 元概念标签
    ("s_c_1466", {1: "中华", 2: "光华"}),
]

# ─── #7: sentenceText/targetWord 修正 ───────────────

# s_c_0496 不: sentenceText="或能免乎？" 应为 "或能免不？"
FIXES_7_SENTENCE = [
    ("s_c_0496", "或能免乎？", "或能免不？"),
]

# ─── 阶段三 #8: kidRef 修正 ───────────────────────

# (quiz_id, new_kidRef_or_null)
# None = 设为 null（句子不在 articles 中）
FIXES_8 = [
    # s_c_0465 反: "寒暑易节，始一反焉" 出自愚公移山，但句子不在 articles 中
    ("s_c_0465", None),
    # s_c_0475 阙: "必能裨补阙漏" 出自出师表，但句子不在 articles 中
    ("s_c_0475", None),
    # s_c_0482 得: "所识穷乏者得我与？" 句子不在 articles 中
    ("s_c_0482", None),
    # s_c_0483 与: "所识穷乏者得我与？" 出自鱼我所欲也（非唐雎），句子不在 articles 中
    ("s_c_0483", None),
    # s_c_0484 与: "而君逆寡人者，轻寡人与？" 唐雎不辱使命 — kidRef应指 kw_art_042_s01_与_1（def=通"欤"...）
    ("s_c_0484", "kw_art_042_s01_与_1"),
    # s_c_0494 尔: "非死则徙尔" 出自捕蛇者说，句子不在 articles 中
    ("s_c_0494", None),
    # s_c_0495 不: "尊君在不？" 出自陈太丘与友期 — 壳文章 art_shell_049 有 keyword
    ("s_c_0495", "kw_art_shell_049_s01_不_0"),
    # s_c_0496 不: 出自冯婉贞 art_shell_010 s06 "或能免乎？" 无"不"字 keyword
    ("s_c_0496", None),
    # s_c_0497 知: "知之为知之...是知也" 出自论语十二章，句子不在 articles 中
    ("s_c_0497", None),
    # s_c_0503 道: "道之以政，齐之以刑" 出自论语，句子不在 articles 中
    ("s_c_0503", None),
    # s_c_0505 具: "此人一一为具言所闻" 出自桃花源记 — 句不在 articles 中（仅"具答之"），设 NULL
    ("s_c_0505", None),
]

# ─── 主逻辑 ─────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="wb_zhongkao_tongjia 审核修复")
    parser.add_argument("--apply", action="store_true", help="实际修改（缺省为 dry-run）")
    args = parser.parse_args()

    if not args.apply:
        print("🔍 DRY-RUN 模式 —— 只显示将要修改的内容，不实际写入\n")

    # ── 加载数据 ──
    wb = load_json(WB_PATH)
    entries = wb.get('wordEntries', [])

    # 加载 articles
    all_articles = {}
    article_files = {}
    for fn_path in art_paths():
        data = load_json(fn_path)
        fn = os.path.basename(fn_path)
        article_files[fn] = data
        for art in data:
            all_articles[art['id']] = art

    changes_log = []

    def log_change(category, qi_id, field, old_val, new_val):
        changes_log.append((category, qi_id, field, str(old_val)[:80], str(new_val)[:80]))

    # ── 阶段一: #3 修正 definition ──
    print("=" * 60)
    print("阶段一 #3: 修正正确答案 definition（6条）")
    print("=" * 60)
    for qi_id, new_def in FIXES_3:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        old_def = qi.get('definition', '')
        if old_def == new_def:
            print(f"  ⏭  {qi_id} ({entry['character']}) 已一致: {old_def}")
            continue
        print(f"  ✏️  {qi_id} ({entry['character']}) | {old_def[:50]} → {new_def[:50]}")
        log_change("#3", qi_id, "definition", old_def, new_def)
        if args.apply:
            qi['definition'] = new_def

    # ── 阶段一配套: 修改 articles JSON 中的 keyWord definition ──
    print("\n" + "=" * 60)
    print("阶段一配套: 修改 articles JSON 中的 keyWord definition（2处）")
    print("=" * 60)

    for qi_id, art_id, sent_idx, word, new_def in ARTICLES_KEYWORD_UPDATES:
        art = all_articles.get(art_id)
        if not art:
            print(f"  ⚠️  未找到文章 {art_id}")
            continue
        if sent_idx >= len(art.get('sentences', [])):
            print(f"  ⚠️  {art_id} 无句子索引 {sent_idx}")
            continue
        sent = art['sentences'][sent_idx]
        kw_found = None
        for kw in sent.get('keyWords', []):
            if kw.get('word') == word:
                kw_found = kw
                break

        if kw_found:
            old_def = kw_found.get('definition', '')
            if old_def == new_def:
                print(f"  ⏭  {art_id} s{sent_idx} {word}: 已一致 ({old_def})")
                continue
            print(f"  ✏️  {art_id} s{sent_idx} {word}: '{old_def}' → '{new_def}' | kid={kw_found.get('kid')}")
            log_change("#3-art", qi_id, f"keyword.{art_id}.s{sent_idx}.{word}", old_def, new_def)
            if args.apply:
                kw_found['definition'] = new_def
        else:
            print(f"  ⚠️  {art_id} s{sent_idx} 未找到 keyWord '{word}'，跳过")

    # ── 阶段二: #4+#5 选项重复 + 干扰项含答案 ──
    print("\n" + "=" * 60)
    print("阶段二 #4+#5: 选项重复/干扰项含答案（9条）")
    print("=" * 60)

    # 逐个替换
    for fix in FIXES_45:
        qi_id, old_dist, new_dist = fix
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        dists = qi.get('distractors', [])
        if old_dist in dists:
            idx = dists.index(old_dist)
            print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{old_dist[:50]}' → '{new_dist[:50]}'")
            log_change("#4/#5", qi_id, f"distractors[{idx}]", old_dist, new_dist)
            if args.apply:
                dists[idx] = new_dist
        else:
            print(f"  ⚠️  {qi_id} ({entry['character']}) 未找到干扰项: '{old_dist[:50]}'")
            print(f"      当前干扰项: {dists}")

    # 整组替换
    for qi_id, new_dists in FIXES_45_REPLACE_ALL:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        old_dists = qi.get('distractors', [])
        print(f"  ✏️  {qi_id} ({entry['character']}) 整组替换: {old_dists} → {new_dists}")
        log_change("#4/#5", qi_id, "distractors", str(old_dists), str(new_dists))
        if args.apply:
            qi['distractors'] = new_dists

    # 按索引部分替换
    for qi_id, idx_map in FIXES_45_REPLACE_INDEX:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        dists = qi.get('distractors', [])
        for idx, new_val in sorted(idx_map.items()):
            if idx < len(dists):
                old_val = dists[idx]
                print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{old_val[:50]}' → '{new_val[:50]}'")
                log_change("#4/#5", qi_id, f"distractors[{idx}]", old_val, new_val)
                if args.apply:
                    dists[idx] = new_val
            else:
                print(f"  ⚠️  {qi_id} ({entry['character']}) dist[{idx}] 越界（共{len(dists)}项）")

    # ── #7: sentenceText 修正 ──
    print("\n" + "=" * 60)
    print("#7: sentenceText 修正（1条）")
    print("=" * 60)
    for qi_id, old_text, new_text in FIXES_7_SENTENCE:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        cur_text = qi.get('sentenceText', '')
        if cur_text == old_text:
            print(f"  ✏️  {qi_id} ({entry['character']}) sentenceText: '{old_text}' → '{new_text}'")
            log_change("#7", qi_id, "sentenceText", old_text, new_text)
            if args.apply:
                qi['sentenceText'] = new_text
        elif cur_text == new_text:
            print(f"  ⏭  {qi_id} ({entry['character']}) sentenceText 已正确: '{cur_text}'")
        else:
            print(f"  ⚠️  {qi_id} ({entry['character']}) sentenceText 不匹配: 期望旧值'{old_text}'，实际'{cur_text}'")

    # ── 阶段三: #8 kidRef 修正 ──
    print("\n" + "=" * 60)
    print("阶段三 #8: kidRef 修正（10条）")
    print("=" * 60)

    # 验证 kidRef 目标存在
    # 构建 kid 索引（包含所有 articles 文件）
    print("  构建全量 kid 索引...")
    import glob
    all_kids = {}
    for f in sorted(glob.glob(os.path.join(ART_DIR, 'articles_*.json'))):
        data = load_json(f)
        for art in data:
            for sent in art.get('sentences', []):
                for kw in sent.get('keyWords', []):
                    kid = kw['kid']
                    all_kids[kid] = {
                        'article_id': art['id'],
                        'article_title': art.get('title', ''),
                        'def': kw.get('definition', ''),
                    }

    for qi_id, new_kid in FIXES_8:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        old_kid = qi.get('kidRef', '')
        if old_kid == new_kid:
            print(f"  ⏭  {qi_id} ({entry['character']}) 已一致: {old_kid}")
            continue

        # 验证目标 kid 存在（仅对非 NULL 值的）
        if new_kid is not None and new_kid not in all_kids:
            print(f"  ⚠️  {qi_id} ({entry['character']}): 目标 kid '{new_kid}' 不存在于 articles 中!")
            continue

        if new_kid is not None:
            ki = all_kids[new_kid]
            print(f"  ✏️  {qi_id} ({entry['character']}): '{old_kid}' → '{new_kid}'")
            print(f"       → {ki['article_id']} '{ki['article_title']}' def='{ki['def'][:40]}'")
        else:
            print(f"  ✏️  {qi_id} ({entry['character']}): '{old_kid}' → NULL（句子不在 articles 中）")

        log_change("#8", qi_id, "kidRef", old_kid or "(空)", new_kid or "(null)")
        if args.apply:
            qi['kidRef'] = new_kid

    # ── 检查 def 修改后干扰项是否包含新正确答案 ──
    print("\n" + "=" * 60)
    print("自动检查: 干扰项是否包含新正确答案")
    print("=" * 60)
    issues_found = 0
    for qi_id, new_def in FIXES_3:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            continue
        defn = qi.get('definition', '')
        dists = qi.get('distractors', [])
        for idx, d in enumerate(dists):
            # 检查是否包含性重复或完全一致
            if d == defn or defn in d or d in defn:
                print(f"  ⚠️  {qi_id} ({entry['character']}): def='{defn[:40]}' 与 dist[{idx}]='{d[:40]}' 冲突!")
                issues_found += 1
    if not issues_found:
        print("  ✅ 无冲突")

    # ── 保存 ──
    if args.apply:
        print("\n" + "=" * 60)
        print("保存修改...")
        print("=" * 60)

        # 保存词书
        save_json(WB_PATH, wb)

        # 保存修改过的 articles 文件
        saved_articles = set()
        for qi_id, art_id, sent_idx, word, new_def in ARTICLES_KEYWORD_UPDATES:
            for fn, art_list in article_files.items():
                for art in art_list:
                    if art.get('id') == art_id:
                        if fn not in saved_articles:
                            fp = os.path.join(ART_DIR, fn)
                            save_json(fp, art_list)
                            saved_articles.add(fn)
                        break

        # 统计
        print(f"\n  📊 总计修改:")
        print(f"    #3 definition: {len(FIXES_3)} 处")
        print(f"    articles keyword: {len(ARTICLES_KEYWORD_UPDATES)} 处（{len(saved_articles)} 个文件）")
        print(f"    #4/#5 distractors: {len(FIXES_45)} + {len(FIXES_45_REPLACE_ALL)*3} + {sum(len(m) for _, m in FIXES_45_REPLACE_INDEX)} 处")
        print(f"    #7 sentenceText: {len(FIXES_7_SENTENCE)} 处")
        print(f"    #8 kidRef: {len(FIXES_8)} 处")
        print(f"    共 {len(changes_log)} 处修改")

        # 输出导入命令提示
        print(f"\n  📋 导入命令（请在终端执行）：")
        print(f"  ────────────────────────────────────────────")
        print(f"  # 1. 先导入 articles（全量，因为修改了 keyWord definition）")
        print(f'  curl -X POST http://localhost:8080/api/admin/import/articles \\')
        print(f'    -H "Content-Type: application/json" \\')
        print(f'    -d "$(python3 -c \"')
        print(f'import json, glob, os')
        print(f'd = []')
        print(f'for f in sorted(glob.glob(os.path.expanduser(\\\"~/knowledge_library/文言文/选篇/正文/articles_*.json\\\"))):')
        print(f'    with open(f) as fp: d.extend(json.load(fp))')
        print(f'print(json.dumps(d, ensure_ascii=False))')
        print(f'\")"')
        print()
        print(f"  # 2. 再导入词书")
        print(f"  curl -X POST http://localhost:8080/api/admin/import/wordbook/wb_zhongkao_tongjia \\")
        print(f'    -H "Content-Type: application/json" \\')
        print(f'    -d @$HOME/knowledge_library/文言文/词书/wb_zhongkao_tongjia.json')
        print(f"  ────────────────────────────────────────────")
    else:
        print(f"\n  📊 dry-run 统计:")
        print(f"    #3 definition: {len(FIXES_3)} 处")
        print(f"    articles keyword: {len(ARTICLES_KEYWORD_UPDATES)} 处")
        print(f"    #4/#5 distractors: {len(FIXES_45)} + {len(FIXES_45_REPLACE_ALL)*3} + {sum(len(m) for _, m in FIXES_45_REPLACE_INDEX)} 处")
        print(f"    #7 sentenceText: {len(FIXES_7_SENTENCE)} 处")
        print(f"    #8 kidRef: {len(FIXES_8)} 处")
        print(f"    共 {len(changes_log)} 处待修改")
        print(f"\n  💡 使用 --apply 参数实际执行修改")

if __name__ == '__main__':
    main()
