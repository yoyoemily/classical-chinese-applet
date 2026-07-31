#!/usr/bin/env python3
"""
高考实词虚词一本通（wb_gaokao_shixu）批量修复脚本

修复内容：
  阶段一 #3: 正确答案有误（40条）— 修改 definition
  阶段二 #4: 选项包含性重复（20条）— 修改 distractors
  阶段三 #5: 干扰项含正确答案（2条）— 修改 distractors
  阶段四 #8: kidRef 指向错误（48条）— 修改 kidRef

用法:
  python3 fix_gaokao_shixu.py           # dry-run，显示将要修改的内容
  python3 fix_gaokao_shixu.py --apply   # 实际修改
"""

import argparse
import json
import os
import sys
import copy

# ─── 路径配置 ───────────────────────────────────────

HOME = os.path.expanduser("~")
WB_PATH = os.path.join(HOME, "knowledge_library/文言文/词书/wb_gaokao_shixu.json")
ART_DIR = os.path.join(HOME, "knowledge_library/文言文/选篇/正文")
WB_BACKUP = WB_PATH + ".bak"

# 需要修改的 articles 文件集
def art_paths():
    return [
        os.path.join(ART_DIR, "articles_shell.json"),
        os.path.join(ART_DIR, "articles_grade7a.json"),
        os.path.join(ART_DIR, "articles_grade8a.json"),
        os.path.join(ART_DIR, "articles_grade9a.json"),
        os.path.join(ART_DIR, "articles_grade9b.json"),
        os.path.join(ART_DIR, "articles_grade10b.json"),
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

def find_keyword_in_articles(articles_data, article_id, word, sentence_idx=None):
    """在 articles 数据中查找指定 keyWord"""
    for art in articles_data:
        if art.get('id') != article_id:
            continue
        for si, sent in enumerate(art.get('sentences', [])):
            if sentence_idx is not None and si != sentence_idx:
                continue
            for kw in sent.get('keyWords', []):
                if kw.get('word') == word:
                    return art, sent, kw, si
    return None, None, None, None

def generate_kid(article_id, sentence_idx, word, seq):
    return f"kw_{article_id}_s{sentence_idx:02d}_{word}_{seq}"

def find_next_seq(sentence, word):
    """找到某个句子中某个字的下一个可用序号"""
    existing = [kw.get('kid', '') for kw in sentence.get('keyWords', []) if kw.get('word') == word]
    max_seq = -1
    for kid in existing:
        parts = kid.rsplit('_', 1)
        if parts:
            try:
                max_seq = max(max_seq, int(parts[-1]))
            except ValueError:
                pass
    return max_seq + 1

# ─── 修复数据定义 ───────────────────────────────────

# 阶段一 #3: (quiz_id, new_definition)
FIXES_3 = [
    ("s_c_0758", "给人恩惠"),
    ("s_c_0763", "安全，安定"),
    ("s_c_0826", "危险"),
    ("s_c_0834", "判处，应当"),
    ("s_c_0858", "覆盖"),
    ("s_c_0860", "背"),
    ("s_c_0807", "连接，一个接一个"),
    ("s_c_0810", "诚心诚意"),
    ("s_c_0923", "厌恶、痛恨"),
    ("s_c_0824", "追赶"),
    ("s_c_0998", "只，仅仅"),
    ("s_c_1005", "期限"),
    ("s_c_1008", "满一周年（读jī）"),
    ("s_c_1013", "好、佳、适宜"),
    ("s_c_1025", "穷困、困窘"),
    ("s_c_1049", "如果，表假设"),
    ("s_c_1050", "好的"),
    ("s_c_1052", "好好地"),
    ("s_c_1056", "稍微，略微"),
    ("s_c_1058", "徒步渡水"),
    ("s_c_1059", "渡过"),
    ("s_c_1060", "进入，跋涉"),
    ("s_c_1063", "胜利"),
    ("s_c_1076", "致使，使得"),
    ('s_c_1086', '通"谪"，强迫征发'),
    ('s_c_1088', '字条，帛书'),
    ('s_c_1100', '管辖，掌管'),
    ('s_c_1128', '哭泣'),
    ('s_c_1134', '逃跑，逃亡'),
    ('s_c_1137', '通"无"，没有'),
    ("s_c_1140", "帝王，王侯（名词）"),
    ("s_c_1151", "凶恶，险恶（形容词）"),
    ("s_c_1182", "运行"),
    ("s_c_1189", "幸运"),
    ("s_c_1210", "符合，适合"),
    ("s_c_1217", "送给，给予，读wèi"),
    ("s_c_1221", "改变"),
    ("s_c_1255", "资质"),
    ("s_c_1257", "治理"),
    ("s_c_1269", "杀害（动词）"),
]

# 阶段一配套: articles JSON 中需要修改的 keyWord definition
# (quiz_id, article_id, sentence_index, word, new_kid_or_none, new_definition)
# sentence_index 使用 0-based 索引
ARTICLES_KEYWORD_UPDATES = [
    # s_c_0763 (安): 冯婉贞 art_shell_010 s00 安 definition 为空 → "安全，安定"
    ("s_c_0763", "art_shell_010", 0, "安", None, "安全，安定"),
    # s_c_0860 (负): 愚公移山 art_004 s05 负 def="以背载物" → "背"
    ("s_c_0860", "art_004", 5, "负", None, "背"),
    # s_c_0807 (乘): 论积贮疏 art_shell_004 s02 乘 无keyword → 新增，def="连接，一个接一个"
    ("s_c_0807", "art_shell_004", 2, "乘", None, "连接，一个接一个"),
    # s_c_0810 (诚): 愚公移山 art_004 s05 诚 def="诚心诚意" → 保持一致
    ("s_c_0810", "art_004", 5, "诚", None, "诚心诚意"),
    # s_c_0923 (疾): 季氏将伐颛臾 art_shell_011 s01 疾 无keyword → 新增，def="厌恶、痛恨"
    ("s_c_0923", "art_shell_011", 1, "疾", None, "厌恶、痛恨"),
    # s_c_0824 (从): 孙子·军争 art_shell_057 s00 从 def="" → "追赶"
    ("s_c_0824", "art_shell_057", 0, "从", None, "追赶"),
    # s_c_1008 (期): 邹忌讽齐王纳谏 art_007 s04 期 def="期望，希望" → "满一周年（读jī）"
    ("s_c_1008", "art_007", 4, "期", None, "满一周年（读jī）"),
    # s_c_1050 (善): 出师表 art_014 s06 善 def="善于，擅长" → "好的"
    ("s_c_1050", "art_014", 6, "善", None, "好的"),
    # s_c_1056 (少): 荆轲刺秦王 art_shell_016 s01 少 无keyword → 新增，def="稍微，略微"
    ("s_c_1056", "art_shell_016", 1, "少", None, "稍微，略微"),
    # s_c_1059 (涉): 吕氏春秋 art_shell_115 s00 涉 def="" → "渡过"
    ("s_c_1059", "art_shell_115", 0, "涉", None, "渡过"),
    # s_c_1060 (涉): 赤壁之战 art_shell_002 s11 涉 无keyword → 新增，def="进入，跋涉"
    ("s_c_1060", "art_shell_002", 11, "涉", None, "进入，跋涉"),
    # s_c_1063 (胜): 谋攻 art_shell_008 s01 胜 无keyword → 新增，def="胜利"
    ("s_c_1063", "art_shell_008", 1, "胜", None, "胜利"),
    # s_c_1076 (使): 阿房宫赋 art_070 s06 使 def="主使" → "致使，使得"
    ("s_c_1076", "art_070", 6, "使", None, "致使，使得"),
    # s_c_1134 (亡): 陈涉世家 art_022 s07 亡 无keyword → 新增，def="逃跑，逃亡"
    ("s_c_1134", "art_022", 7, "亡", None, "逃跑，逃亡"),
    # s_c_1137 (亡): 论积贮疏 art_shell_004 s07 亡 def="" → "通"无"，没有"
    ("s_c_1137", "art_shell_004", 7, "亡", None, "通“无”，没有"),
    # s_c_1151 (恶): 指南录后序 art_shell_007 s03 恶 无keyword → 新增，def="凶恶，险恶（形容词）"
    ("s_c_1151", "art_shell_007", 3, "恶", None, "凶恶，险恶（形容词）"),
    # s_c_1182 (行): 观沧海 art_052 s00 行 无keyword → 新增，def="运行"
    ("s_c_1182", "art_052", 0, "行", None, "运行"),
    # s_c_1217 (遗): 赤壁之战 art_shell_002 s22 遗 def="" → "送给，给予，读wèi"
    ("s_c_1217", "art_shell_002", 22, "遗", None, "送给，给予，读wèi"),
    # s_c_1269 (贼): 韩非子·内储说下 art_shell_098 s00 贼 def="" → "杀害（动词）"
    ("s_c_1269", "art_shell_098", 0, "贼", None, "杀害（动词）"),
]

# 阶段二 #4: 选项包含性重复
# (quiz_id, distractor_index_to_replace, new_distractor_text)
FIXES_4 = [
    # s_c_0765: def="安定，安稳" vs dist="安稳" 包含性 → 替换 dist 为 "平安"
    ("s_c_0765", "安稳", "平安"),
    # s_c_0810: def="表肯定，确实，的确" vs dist="副词，表肯定，确实，的确" 完全重复 → 替换 dist 为 "果真，如果"
    ("s_c_0810", "副词，表肯定，确实，的确", "果真，如果"),
    # s_c_0826: def="表约略，几乎，接近，差不多" vs dist="表约略，几乎，接近，差不" 包含性 → 替换 dist 为 "懈怠，怠慢"
    ("s_c_0826", "表约略，几乎，接近，差不", "懈怠，怠慢"),
    # s_c_0900: def="什么" vs dist="哪里，什么地方" 近义 → 替换 dist 为 "是谁"
    ("s_c_0900", "哪里，什么地方", "是谁，什么人"),
    # s_c_0901: def="哪里，什么地方" vs dist="什么" 近义 → 替换 dist 为 "为何"
    ("s_c_0901", "什么", "为何，为什么"),
    # s_c_0902: def="怎么，为什么" vs dist="什么" 近义 → 替换 dist 为 "哪里"
    ("s_c_0902", "什么", "何处，哪里"),
    # s_c_0907: def="怨恨" vs dist="名词，怨恨" 包含性 → 替换 dist 为 "遗憾"
    ("s_c_0907", "名词，怨恨", "遗憾，悔恨"),
    # s_c_0910: def="什么" vs dist="为什么，怎么" 近义 → 替换 dist 为 "哪里"
    ("s_c_0910", "为什么，怎么", "哪里，何处"),
    # s_c_0911: def="什么" vs dist="为什么，怎么" 近义 → 替换 dist 为 "哪里"
    ("s_c_0911", "为什么，怎么", "哪里，何处"),
    # s_c_0932: def="表时间的相连，相当于"立即"" vs dist="表时间的相连，相当于"立"" 截断包含 → 替换
    # s_c_0932: dist[2] uses Chinese curly quote - match by prefix
    # s_c_0932: dist[2]="表时间的相连，相当于"立'"(truncated) 包含de f"表时间的相连，相当于"立即"" → 替换
    ("s_c_0932", '表时间的相连', '已经'),
    # Special handling: match by substring for this entry
    # s_c_0991: def="没有（谁）" vs dist="没有" 包含性 → 替换 dist 为 "无人"
    ("s_c_0991", "没有", "不，不能"),
    # s_c_0992: def="没有（谁）" vs dist="没有" 包含性 → 替换 dist 为 "无人"
    ("s_c_0992", "没有", "不，不能"),
    # s_c_1035: def="退" vs dist="使退，击退" 包含性 → 替换 dist 为 "回头"
    ("s_c_1035", "使退，击退", "回头"),
    # s_c_1049: def="代词：你，你的" vs dist="代词" 包含性 → 替换 dist 为 "相似"
    ("s_c_1049", "代词", "像，相似"),
    # s_c_1051: def="好" 与3个dist均近义包含 → 替换第1条dist "好的，善良的" → "善良，慈善"
    ("s_c_1051", "好的，善良的", "善良，慈善"),
    # s_c_1054: def="好" 与3个dist均近义包含 → 替换dist1 "好的，善良的" → "善良，慈善"
    ("s_c_1054", "好的，善良的", "善良，慈善"),
    # s_c_1449: def="爱、怜爱" vs dist#2="爱戴，敬爱" + dist#3="爱戴" → 替换dist#2
    ("s_c_1449", "爱戴，敬爱", "同情，怜悯"),
    # s_c_1019: def="请求（允许我做某事）" vs dist#1="请人允许自己做某事" 等价 → 替换dist#1
    ("s_c_1019", "动词", "邀请，宴请"),
    # s_c_1270: def="（筋骨）丛聚集结之处" vs dist#2="丛聚集结之处" 包含性 → 替换dist#2
    ("s_c_1270", "丛聚集结之处", "灭族，灭门"),
]

# 阶段三 #5: 干扰项含正确答案
# (quiz_id, distractor_text_to_replace, new_distractor)
# NOTE: These are checked AFTER definition changes are applied
FIXES_5 = [
    # s_c_0807: After def changes to "连接，一个接一个", check if any dist matches
    ("s_c_0807", "连接，一个接一个", "趁着，凭借"),
    # s_c_1128: After def changes to "哭泣", dist "名词，眼泪" conflicts
    ("s_c_1128", "名词，眼泪", "鼻涕"),
]

# 阶段四 #8: kidRef 修正
# (quiz_id, new_kidRef_or_null)
FIXES_8 = [
    # s_c_0758 爱: 句出陈涉世家"吴广素爱人"→ 句子不在articles中，kidRef设为null
    ("s_c_0758", None),
    # s_c_0763 安: 句出冯婉贞"谢庄遂安"→ 修复 def=filled, kidRef 已指向正确kid
    ("s_c_0763", "kw_art_shell_010_s00_安_0"),
    # s_c_0793 病: 句出论语→ 不在articles中，设为null
    ("s_c_0793", None),
    # s_c_0795 病: 句出捕蛇者说→ 不在articles中，设为null
    ("s_c_0795", None),
    # s_c_0807 乘: 句出论积贮疏"兵旱相乘"→ 新增kw后kidRef应为kw_art_shell_004_s02_乘_0
    ("s_c_0807", "kw_art_shell_004_s02_乘_0"),
    # s_c_0810 诚: 句出愚公移山"帝感其诚"→ kidRef已正确(kw_art_004_s05_诚_0)
    ("s_c_0810", "kw_art_004_s05_诚_0"),
    # s_c_0817 辞: 句出信陵君窃符救赵→ 不在articles中，设为null
    ("s_c_0817", None),
    # s_c_0824 从: 句出孙子·军争"佯北勿从"→ kw已存在 kw_art_shell_057_s00_从_0
    ("s_c_0824", "kw_art_shell_057_s00_从_0"),
    # s_c_0826 殆: 句出庄子·秋水→ 不在articles中，设为null
    ("s_c_0826", None),
    # s_c_0834 当: 句是"失期当斩"→ 不在articles中，设为null
    ("s_c_0834", None),
    # s_c_0858 复: 句出促织"复之以掌"→ 不在articles中，设为null
    ("s_c_0858", None),
    # s_c_0860 负: 句出愚公移山art_004→ kidRef应指向kw_art_004_s05_负_0
    ("s_c_0860", "kw_art_004_s05_负_0"),
    # s_c_0998 乃: 句出垓下之围→ 不在articles中，设为null
    ("s_c_0998", None),
    # s_c_1005 期: 句出陈涉世家"度已失期"→ 不在articles中，设为null
    ("s_c_1005", None),
    # s_c_1013 奇: 句出孔雀东南飞"恐此事非奇"→ 不在articles中，设为null
    ("s_c_1013", None),
    # s_c_1025 穷: 句出鱼我所欲也"所识穷乏者"→ 不在articles中，设为null
    ("s_c_1025", None),
    # s_c_1049 若: 句出活板"若止印二三本"→ 不在articles中，设为null
    ("s_c_1049", None),
    # s_c_1052 善: 句出鸿门宴"不如因而善遇之"→ 不在articles中，设为null
    ("s_c_1052", None),
    # s_c_1056 少: 句出荆轲刺秦王"愿大王少假借之"→ 新增kw后kidRef
    ("s_c_1056", "kw_art_shell_016_s01_少_0"),
    # s_c_1058 涉: 句出察今"循表而夜涉"→ 不在articles中，设为null
    ("s_c_1058", None),
    # s_c_1059 涉: 句出察今"楚人有涉江者"→ kw_art_shell_115_s00_涉_0
    ("s_c_1059", "kw_art_shell_115_s00_涉_0"),
    # s_c_1060 涉: 句出赤壁之战→ 新增kw后kidRef
    ("s_c_1060", "kw_art_shell_002_s11_涉_0"),
    # s_c_1063 胜: 句出谋攻"知胜之道也"→ 新增kw后kidRef
    ("s_c_1063", "kw_art_shell_008_s01_胜_0"),
    # s_c_1086 适: 句出陈涉世家"发闾左适戍渔阳"→ 不在articles中，设为null
    ("s_c_1086", None),
    # s_c_1088 书: 句出陈涉世家"得鱼腹中书"→ 不在articles中，设为null
    ("s_c_1088", None),
    # s_c_1096 属: 句出曹刿论战"忠之属也"→ 不在articles中，设为null
    ("s_c_1096", None),
    # s_c_1100 属: 句出扁鹊见蔡桓公"司命之所属"→ 不在articles中，设为null
    ("s_c_1100", None),
    # s_c_1112 说: 句出捕蛇者说"故为之说"→ 不在articles中，设为null
    ("s_c_1112", None),
    # s_c_1127 涕: 句出捕蛇者说"蒋氏大戚，汪然出涕"→ 不在articles中，设为null
    ("s_c_1127", None),
    # s_c_1128 涕: 句出促织"儿涕而去"→ 不在articles中，设为null
    ("s_c_1128", None),
    # s_c_1134 亡: 句出陈涉世家"今亡亦死"→ 新增kw后kidRef
    ("s_c_1134", "kw_art_022_s07_亡_0"),
    # s_c_1140 王: 句出陈涉世家"王侯将相"→ 不在articles中，设为null
    ("s_c_1140", None),
    # s_c_1151 恶: 句出指南录后序"境界危恶"→ 新增kw后kidRef
    ("s_c_1151", "kw_art_shell_007_s03_恶_0"),
    # s_c_1171 信: 句出老子"信言不美"→ 不在articles中，设为null
    ("s_c_1171", None),
    # s_c_1179 兴: 句出陈涉世家"大楚兴"→ 不在articles中，设为null
    ("s_c_1179", None),
    # s_c_1182 行: 句出观沧海"日月之行"→ 新增kw后kidRef
    ("s_c_1182", "kw_art_052_s00_行_0"),
    # s_c_1189 幸: 句出捕蛇者说"吾斯役之不幸"→ 不在articles中，设为null
    ("s_c_1189", None),
    # s_c_1196 徐: 句出庄子·天道"不徐不疾"→ 不在articles中，设为null
    ("s_c_1196", None),
    # s_c_1198 许: 句出廉颇蔺相如列传"宁许以负秦曲"→ 不在articles中，设为null
    ("s_c_1198", None),
    # s_c_1205 阳: 句出察今"阴阳之变"→ 不在articles中，设为null
    ("s_c_1205", None),
    # s_c_1210 要: 句出察今"有要于时"→ 不在articles中，设为null
    ("s_c_1210", None),
    # s_c_1217 遗: 句出赤壁之战→ kidRef当前指向kw_art_shell_002_s22_遗_0（同文），但def=舍弃→已修正为送给wèi
    ("s_c_1217", "kw_art_shell_002_s22_遗_0"),
    # s_c_1219 贻: 句出庄子·秋水→ 不在articles中，设为null
    ("s_c_1219", None),
    # s_c_1221 易: 句出察今"世易时移"→ 不在articles中，设为null
    ("s_c_1221", None),
    # s_c_1226 阴: 句出察今"审堂下之阴"→ 不在articles中，设为null
    ("s_c_1226", None),
    # s_c_1230 右: 句出游褒禅山记→ 不在articles中，设为null
    ("s_c_1230", None),
    # s_c_1237 再: 句出活板"用讫再火"→ 不在articles中，设为null
    ("s_c_1237", None),
    # s_c_1244 知: 句出捕蛇者说→ 不在articles中，设为null
    ("s_c_1244", None),
    # s_c_1255 质: 句出送东阳马生序→ 不在articles中，设为null
    ("s_c_1255", None),
    # s_c_1257 治: 句出察今"故治国无法则乱"→ 不在articles中，设为null
    ("s_c_1257", None),
]

# ─── 主逻辑 ─────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="wb_gaokao_shixu 批量修复")
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
    print("阶段一 #3: 修正正确答案 definition（40条）")
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
        print(f"  ✏️  {qi_id} ({entry['character']}) | {old_def[:40]} → {new_def[:40]}")
        log_change("#3", qi_id, "definition", old_def, new_def)
        if args.apply:
            qi['definition'] = new_def

    # ── 阶段一配套: 修改 articles JSON 中的 keyWord definition ──
    print("\n" + "=" * 60)
    print("阶段一配套: 修改 articles JSON 中的 keyWord definition")
    print("=" * 60)

    for qi_id, art_id, sent_idx, word, _, new_def in ARTICLES_KEYWORD_UPDATES:
        art = all_articles.get(art_id)
        if not art:
            print(f"  ⚠️  未找到文章 {art_id}")
            continue
        if sent_idx >= len(art.get('sentences', [])):
            print(f"  ⚠️  {art_id} 无句子索引 {sent_idx}")
            continue
        sent = art['sentences'][sent_idx]
        # 查找已有 keyWord
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
                kw_found['wordBookId'] = 'wb_gaokao_shixu'
        else:
            # 新增 keyWord
            seq = find_next_seq(sent, word)
            new_kid = generate_kid(art_id, sent_idx, word, seq)
            new_kw = {
                "word": word,
                "definition": new_def,
                "kid": new_kid,
                "wordType": "shi",
                "wordBookId": "wb_gaokao_shixu"
            }
            print(f"  ➕  {art_id} s{sent_idx} {word}: 新增 keyWord | kid={new_kid} def={new_def}")
            log_change("#3-art", qi_id, f"keyword.{art_id}.s{sent_idx}.{word}", "(新增)", new_def)
            if args.apply:
                sent.setdefault('keyWords', []).append(new_kw)

    # 同时更新 keyWordRefs
    # 读取现有的 quizItem 找到对应 entry 的 keyWordRefs，新增/修改
    if args.apply:
        char_kw_map = {}  # character -> set of kids
        for qi_id, art_id, sent_idx, word, _, new_def in ARTICLES_KEYWORD_UPDATES:
            art = all_articles.get(art_id)
            if not art or sent_idx >= len(art.get('sentences', [])):
                continue
            sent = art['sentences'][sent_idx]
            for kw in sent.get('keyWords', []):
                if kw.get('word') == word:
                    char_kw_map.setdefault(word, set()).add(kw['kid'])

        for entry in entries:
            char = entry['character']
            if char in char_kw_map:
                existing_kids = {r['kid'] for r in entry.get('keyWordRefs', [])}
                new_kids = char_kw_map[char] - existing_kids
                if new_kids:
                    for kid in sorted(new_kids):
                        entry.setdefault('keyWordRefs', []).append({"kid": kid})
                    print(f"  📎 {char}: keyWordRefs 新增 {new_kids}")

    # ── 阶段二: #4 选项包含性重复 ──
    print("\n" + "=" * 60)
    print("阶段二 #4: 选项包含性重复（20条）")
    print("=" * 60)
    for fix in FIXES_4:
        qi_id, old_dist, new_dist = fix
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        dists = qi.get('distractors', [])
        # s_c_1051 特殊标记：def vs dist 重复问题
        if qi_id == "s_c_1051_def":
            # 这个实际上是 def="好" 本身需要和 dist 拉距离
            # def 不变（已经是"好"），但 dist 中包含近义项
            # 实际处理在 s_c_1051 的 FIXES_4 条目
            continue

        if qi_id == "s_c_0932":
            # Special handling: match by substring prefix (Chinese curly quote issue)
            matched = False
            for idx, d in enumerate(dists):
                if old_dist in d:
                    print(f"  ✏️  {qi_id} -> s_c_0932 ({entry['character']}) dist[{idx}]: '{d[:40]}' → '{new_dist[:40]}'")
                    log_change("#4", "s_c_0932", f"distractors[{idx}]", d, new_dist)
                    if args.apply:
                        dists[idx] = new_dist
                    matched = True
                    break
            if not matched:
                print(f"  ⚠️  s_c_0932 (即) 未找到干扰项包含: '{old_dist[:40]}'")
                print(f"      当前干扰项: {dists}")
            continue

        if old_dist in dists:
            idx = dists.index(old_dist)
            print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{old_dist[:40]}' → '{new_dist[:40]}'")
            log_change("#4", qi_id, f"distractors[{idx}]", old_dist, new_dist)
            if args.apply:
                dists[idx] = new_dist
        else:
            print(f"  ⚠️  {qi_id} 未找到干扰项: '{old_dist[:40]}'")
            print(f"      当前干扰项: {dists}")

    # Handle s_c_1051 and s_c_1054 specially
    for qi_id in ["s_c_1051", "s_c_1054"]:
        entry, qi = find_qi(entries, qi_id)
        if qi:
            dists = qi.get('distractors', [])
            # Replace the first distractor that's too close to "好"
            targets = {"s_c_1051": ["善于，擅长", "善良，慈善"],
                       "s_c_1054": ["应答之词", "善良，慈善"]}
            old_d, new_d = targets.get(qi_id, [None, None])
            if old_d and old_d in dists:
                idx = dists.index(old_d)
                print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{old_d[:40]}' → '{new_d[:40]}'")
                log_change("#4", qi_id, f"distractors[{idx}]", old_d, new_d)
                if args.apply:
                    dists[idx] = new_d

    # ── 阶段三: #5 干扰项含正确答案 ──
    print("\n" + "=" * 60)
    print("阶段三 #5: 干扰项含正确答案（2条）")
    print("=" * 60)
    for qi_id, old_dist, new_dist in FIXES_5:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        dists = qi.get('distractors', [])
        if qi_id == "s_c_0807":
            # After #3 fix, definition is now "连接，一个接一个"
            # The problem was that a distractor matched the CORRECT answer (old def)
            # Old def was "驾，坐" → the correct answer in the sentence was "连接，一个接一个"
            # Wait - re-reading the fix list: #5 says dist "连接，一个接一个" IS the correct answer
            # and def was "驾，坐" (wrong). Now we've fixed def to "连接，一个接一个"
            # So we need to check: does the new def "连接，一个接一个" appear in distractors?
            # Let's check all distractors for matches with the new definition
            new_def = qi.get('definition', '')
            found_issue = False
            for idx, d in enumerate(dists):
                if d == new_def or new_def in d or d in new_def:
                    found_issue = True
                    print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{d[:40]}' == def '{new_def[:40]}' → '{new_dist[:40]}'")
                    log_change("#5", qi_id, f"distractors[{idx}]", d, new_dist)
                    if args.apply:
                        dists[idx] = new_dist
            if not found_issue:
                print(f"  ℹ️  {qi_id} ({entry['character']}): 新 def='{new_def[:40]}' 与当前干扰项无冲突 (dist={dists})")
        elif old_dist in dists:  # normal matching
            idx = dists.index(old_dist)
            print(f"  ✏️  {qi_id} ({entry['character']}) dist[{idx}]: '{old_dist[:40]}' → '{new_dist[:40]}'")
            log_change("#5", qi_id, f"distractors[{idx}]", old_dist, new_dist)
            if args.apply:
                dists[idx] = new_dist
        else:
            print(f"  ⚠️  {qi_id} 未找到干扰项: '{old_dist[:40]}'")
            print(f"      当前干扰项: {dists}")

    # ── 阶段四: #8 kidRef 修正 ──
    print("\n" + "=" * 60)
    print("阶段四 #8: kidRef 修正（48条）")
    print("=" * 60)
    for qi_id, new_kid in FIXES_8:
        entry, qi = find_qi(entries, qi_id)
        if not qi:
            print(f"  ⚠️  未找到 {qi_id}")
            continue
        old_kid = qi.get('kidRef', '')
        if old_kid == new_kid:
            print(f"  ⏭  {qi_id} ({entry['character']}) 已一致: {old_kid}")
            continue
        print(f"  ✏️  {qi_id} ({entry['character']}): '{old_kid}' → '{new_kid}'")
        log_change("#8", qi_id, "kidRef", old_kid or "(空)", new_kid or "(null)")
        if args.apply:
            qi['kidRef'] = new_kid

    # ── 保存 ──
    if args.apply:
        print("\n" + "=" * 60)
        print("保存修改...")
        print("=" * 60)

        # 保存词书
        save_json(WB_PATH, wb)

        # 保存修改过的 articles 文件
        saved_articles = set()
        for qi_id, art_id, sent_idx, word, _, new_def in ARTICLES_KEYWORD_UPDATES:
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
        print(f"    #4 distractors: {len(FIXES_4)} 处")
        print(f"    #5 distractors: {len(FIXES_5)} 处")
        print(f"    #8 kidRef: {len(FIXES_8)} 处")
        print(f"    共 {len(changes_log)} 处修改")
    else:
        print(f"\n  📊 dry-run 统计:")
        print(f"    #3 definition: {len(FIXES_3)} 处")
        print(f"    articles keyword: {len(ARTICLES_KEYWORD_UPDATES)} 处")
        print(f"    #4 distractors: {len(FIXES_4)} 处")
        print(f"    #5 distractors: {len(FIXES_5)} 处")
        print(f"    #8 kidRef: {len(FIXES_8)} 处")
        print(f"    共 {len(changes_log)} 处待修改")
        print(f"\n  💡 使用 --apply 参数实际执行修改")

if __name__ == '__main__':
    main()
