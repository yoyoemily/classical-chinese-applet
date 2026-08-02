---
name: word-quiz-expansion-plan
description: 词书例句扩充实施方案——8本词书（虚词除外）按"每义项≥3条quizItem"标准，从选篇keyWord语料池补收例句
metadata:
  type: project
---

## 目标

消除"义项少→打卡1-2题就过→体验仓促"的问题。对8本打卡型词书（虚词深度解析除外），按**每个义项至少 3 条 quizItem** 的标准，从选篇 keyWord 语料池中补收例句。

## 范围

| 范畴 | 包含 | 排除 |
|------|------|------|
| 词书 | 8 本打卡型词书 | 虚词深度解析（readonly，不走答题回路） |
| 词性 | shi、tongjia、gujinyi、huoyong | xu（虚词例句已很充足） |
| 高频虚词 | — | 之乎者也以而何于为其则乃焉与且所因矣耶哉耳盖夫诸虽然亦或既遂辄（共 31 字） |

## 缺口统计

### 按词书

| 词书 | 当前quizItem≤2的字数 | 理想缺额（每义项≥3条） |
|------|:--:|:--:|
| 中考实词虚词一本通 | 86 字 | +213 条 |
| 高考实词虚词一本通 | 46 字 | +165 条 |
| 中考通假字一本通 | 23 字 | +35 条 |
| 中考古今异义一本通 | 21 字 | +34 条 |
| 高考词类活用一本通 | 20 字 | +34 条 |
| 高考古今异义一本通 | 16 字 | +21 条 |
| 中考词类活用一本通 | 13 字 | +20 条 |
| 高考通假字一本通 | 15 字 | +19 条 |
| **合计** | **240 字** | **+541 条** |

### 选篇语料池

选篇正文共 **1,725 条 keyWord**（覆盖 408 个不同的字/词），排除虚词后的实词+通假+古今异义+活用约 1,440 条，是充足的候选池。

### 注意：同义项去重

选篇 keyWord 中同义项重复标注很普遍（如"信"的 4 条中有 2 条都是"诚实，讲信用"）。收录时需按 **同一义项最多 3 条** 的原则筛选，避免学生在同一义项上机械重复 5-6 题。

## 操作流程

本任务属于 E 类修复（[[fix-guide]] → 七、E 类），但规模远大于逐个修复，需要批量化处理。

### 第 1 步：生成每字/每义项的选篇候选清单

对 8 本词书中 quizItem ≤ 2（或义项覆盖不足 3 条）的字，输出：

```
字 | 词书 | wordType | 当前quizItem数 | 当前义项列表 | 选篇candidate数 | 选篇义项分布
```

用脚本自动从 articles_*.json 中提取匹配该字的所有 keyWord（含 sentenceText、definition、kid、articleId），并与词书已有 quizItem 的 kidRef 做差集，得出"标注了但没收录"的候选池。

### 第 2 步：按义项分组，每义项筛选至多 3 条

- 每个字，按 definition 分组
- 每义项组：已有 N 条 quizItem → 补到 min(3, 选篇候选数)
- 同一义项内选代表性最强的句子（优先教材原文、语境清晰、句长适中）
- 如果选篇确实只有 1 条 keyWord，就 1 条，不硬凑

### 第 3 步：逐本词书补 quizItems

按 fix-guide 七、E 类第 4 步的模板新增 quizItem，遵循：

**ID 分配**：
```bash
grep -roh '"id": "s_c_[0-9]*"' ~/knowledge_library/文言文/词书/ | sed 's/"id": "s_c_//' | sed 's/"//' | sort -n | tail -1
```
从当前最大 ID+1 起连续分配，不跳号、不复用。

**字段来源（防火墙原则）**：

| quizItem 字段 | 来源 |
|---------------|------|
| `id` | 全局最大 +1 |
| `kidRef` | 文章 keyWord 的 `kid`（直接引用） |
| `targetWord` | 词书条目 `entry.character` |
| `definition` | 文章 keyWord 的 `definition`（独立副本） |
| `distractors` | 新造，与已有同字 quizItem 风格一致 |
| `sentenceText` | 文章 sentence 的 `text` |
| `sentenceTranslation` | 文章 sentence 的 `translation` |
| `sentenceSource` | `《文章标题》` |
| `difficulty` | `basic` / `medium` |

**干扰项原则**：同字异义、形近字释义、微殊表述。不包含正确释义。与已有 quizItem 干扰项风格一致。

**处理边界情况**：
- 选篇 keyWord 的 definition 为空 → 跳过该候选（无法出题）
- 选篇 keyWord 的 wordBookId 与词书不匹配 → 检查是否需要补 wordBookId（通常需要）
- 句子已在词书其他 quizItem 中使用（同一 sentenceText） → 跳过，避免同一句重复出题

### 第 4 步：补 articles JSON 的 relatedWordIds 和词书的 keyWordRefs

1. **articles JSON**：如果文章的 `relatedWordIds` 中缺少对应词书 ID，需追加
2. **词书 JSON**：`wordEntries[].keyWordRefs` 中追加新收录的 kid 引用

### 第 5 步：校验

```bash
# JSON 合法性
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/词书/wb_*.json'))"
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/选篇/正文/articles_*.json'))"

# kidRef ↔ keyWordRefs 一致性（每个 quizItem.kidRef 都在 keyWordRefs 中）
python3 -c "
import json
wb = json.load(open('词书/wb_xxx.json'))
for e in wb['wordEntries']:
    ref_kids = {r['kid'] for r in e['keyWordRefs']}
    quiz_kids = {q['kidRef'] for q in e['quizItems']}
    assert quiz_kids <= ref_kids, f'{e[\"character\"]}: quizItems ref {quiz_kids - ref_kids} not in keyWordRefs'
print('OK')
"

# kidRef 指向的 keyWord 确实存在且 definition 一致
python3 -c "
import json, glob
articles = []
for f in sorted(glob.glob('选篇/正文/articles_*.json')):
    articles.extend(json.load(open(f)))
kw_map = {}
for a in articles:
    for s in a['sentences']:
        for kw in s.get('keyWords', []):
            kw_map[kw['kid']] = kw
wb = json.load(open('词书/wb_xxx.json'))
for e in wb['wordEntries']:
    for q in e['quizItems']:
        kw = kw_map.get(q['kidRef'])
        assert kw, f'{q[\"id\"]}: kidRef {q[\"kidRef\"]} not found'
        if kw['definition'] != q['definition']:
            print(f'WARN: {q[\"id\"]} def mismatch: quiz=\"{q[\"definition\"]}\" kw=\"{kw[\"definition\"]}\"')
print('OK')
"
```

### 第 6 步：通知用户导入

**顺序不能反**：先导入 articles（全量），再逐本导入词书。

```bash
BASE_URL="http://localhost:8080"

# 1. 全量导入选篇正文
curl -X POST $BASE_URL/api/admin/import/articles \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, glob, os
d = []
for f in sorted(glob.glob(os.path.expanduser('~/knowledge_library/文言文/选篇/正文/articles_*.json'))):
    with open(f) as fp: d.extend(json.load(fp))
print(json.dumps(d, ensure_ascii=False))
")"

# 2. 逐本导入词书
curl -X POST $BASE_URL/api/admin/import/wordbook/wb_zhongkao_shixu \
  -H "Content-Type: application/json" \
  -d @$HOME/knowledge_library/文言文/词书/wb_zhongkao_shixu.json
# ... 其余 7 本同理
```

### 第 7 步：前端验证

1. 打开小程序 → 选择一本词书 → 开始学习
2. 确认之前只有 1-2 题的短字现在有 ≥3 题
3. 每题 4 个选项中正确释义在列
4. 选择正确答案 → 判定正确
5. 字总结页义项展示正确

## 硬性约束（来自 fix-guide）

| 约束 | 说明 |
|------|------|
| **kid 圣杯原则** | 已有 kid 永远不变。新收录只需在词书 quizItem 中引用已有的 kidRef |
| **quizItem ID 不可变性** | 新增用新 ID（全局最大+1），不修改现有 ID |
| **防火墙原则** | quizItem 的 definition/sentenceText/sentenceTranslation/sentenceSource 从 articles 拷贝独立副本 |
| **导入顺序铁律** | 先导入 articles，再导入词书 |
| **definition 来源** | 必须与 article_keyword.definition 一致（该 definition 又来自 definition_standard.json） |

## 建议执行顺序

1. **中考实词虚词一本通**（最大缺口 213 条，覆盖 86 字）→ 影响最大
2. **高考实词虚词一本通**（165 条，46 字）
3. 其余 6 本 identify_first 词书（缺口小，逐个处理）

每完成一本词书，校验 + 导入 + 前端验证后再做下一本。

## 相关联记忆

- [[fix-guide]] — 修复总纲，E 类修复操作标准
- [[study-section]] — 学习板块代码集成手册
- [[backend-infrastructure]] — 后端导入命令与架构

## 参考脚本

| 脚本 | 用途 |
|------|------|
| `.claude/memory/articles/fill_kidref.py` | kidRef 填充（可作为本次批量补齐的词书侧操作参考） |
| `.claude/memory/articles/normalize_articles.py` | 选篇数据规范化 |
| `scripts/articles_io.py` | 选篇读写公共模块 |
