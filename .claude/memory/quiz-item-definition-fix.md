---
name: quiz-item-definition-fix
description: 答题正确答案有误的标准修复流程——keyWord/quizItem 释义不正确的修正步骤。触发词：正确答案有误、释义错误、definition 不对、答案错了、正确选项错误
metadata:
  type: project
---

## quizItem 释义错误修复标准流程

> 当用户在打卡学习时发现某个题目的正确答案实际是错误的（如"赏赐百千强"的"强"被标记为"勉强，硬要"，实际应是"有余，略多"），按此流程执行。

### 错误类型识别

| 错误类型 | 表现 | 专属流程 |
|---------|------|---------|
| **keyWord 不应标注** | 该字/词不在任何词书中，不应有下划线 | [[article-keyword-correction]] |
| **keyWord 释义错误** | 该字/词存在且应标注，但 definition 写错了 → quizItem 正确答案也是错的 | **本流程** |
| **句子增删/移位** | 结构变化需调整 keyWords | [[article-adjustment-workflow]] |

### 根因链路

```
articles_*.json keyWord.definition 写错（唯一权威数据源）
    ↓ 词书导入时拷贝
word book quizItem.definition 拷贝了错误值（防火墙副本）
    ↓ 用户答题
正确答案显示的是错误释义
```

> **关键认知**：quizItem 是独立副本（防火墙），只改 articles JSON 不动词书，quizItem 不会更新。必须两端都改 + 重导入词书。

### 第 1 步：定位错误的 quizItem

用户反馈通常是"某句某字答案不对"。从用户反馈出发，定位到具体 quizItem：

1. 在知识库词书 JSON 中找到该字的 quizItems 数组
2. 找到 `sentenceText` 匹配用户反馈句子的那条 quizItem
3. 记下该 quizItem 的 `id`、`definition`、`kidRef`、`distractors`

```bash
# 快速定位（替换 XXXX 为目标字）
python3 -c "
import json
data = json.load(open('$HOME/knowledge_library/文言文/词书/wb_*.json'))
for entry in data['wordEntries']:
    if entry['character'] == 'X字':
        for qi in entry['quizItems']:
            print(qi['id'], qi['sentenceText'][:30], '→', qi['definition'])
" 2>/dev/null
```

### 第 2 步：核对选篇 keyWord 原始定义

根据 quizItem 的 `kidRef`，找到选篇 JSON 中对应的 keyWord：

```bash
grep -r 'kid.*kw_xxx' ~/knowledge_library/文言文/选篇/正文/articles_*.json
```

确认 keyWord.definition 是否正确：
- **如果 articles JSON 中 definition 本身就是错的** → 进入第 3 步（最典型的情况）
- **如果 articles JSON 是对的但 quizItem 不对** → 可能是导入时的数据异常，跳到第 4 步直接改词书即可

### 第 3 步：修正选篇 keyWord definition

**确定正确释义**：查阅权威资料（教材注释、古汉语词典等），确定该字在**该句语境中**的正确释义。

在 `articles_*.json` 中修改该 keyWord 的 `definition` 字段：

```json
{
  "word": "强",
  "definition": "有余，略多",        // ← 只改这个字段
  "wordType": "shi",
  "kid": "kw_art_008_s02_强_0",     // ← kid 不动
  "wordBookId": "wb_zhongkao_shixu"  // ← wordBookId 不动
}
```

> ⚠️ kid 是圣杯，永远不变。只改 definition，不改 kid。

### 第 4 步：修正词书 quizItem

在词书 JSON 中找到对应的 quizItem，修改两处：

1. **`definition`**：改为正确释义（与 keyWord 一致）
2. **`distractors`**：确认干扰项中不包含正确释义（否则正确选项会出现在干扰项里），必要时调整

```json
{
  "id": "s_c_0164",
  "kidRef": "kw_art_008_s02_强_0",  // ← 不动
  "targetWord": "强",                // ← 不动
  "definition": "有余，略多",         // ← 修改：与 keyWord 一致
  "distractors": ["强大", "勉强", "强壮"],  // ← 检查：不应包含正确释义
  "sentenceText": "赏赐百千强。",     // ← 不动
  "sentenceTranslation": "...",       // ← 不动
  "sentenceSource": "《木兰诗》"       // ← 不动
}
```

**一并检查同字其他 quizItems**：一个 `kidRef` 可能被多个 quizItem 共用（如"强"在木兰诗中同时被"赏赐百千强"和"非夫人之物而强假焉"引用）。如果其他 quizItem 也有该 kidRef，检查它们的 definition 是否需要随 keyWord 一起更新。

### 第 5 步：校验 + 导入

```bash
# 1. JSON 校验
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/选篇/正文/articles_grade7b.json'))"
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/词书/wb_zhongkao_shixu.json'))"

# 2. 导入选篇（如果改了 articles JSON）
curl -X POST {BASE_URL}/api/admin/import/articles \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, glob, os
d = []
for f in sorted(glob.glob(os.path.expanduser('~/knowledge_library/文言文/选篇/正文/articles_*.json'))):
    with open(f) as fp: d.extend(json.load(fp))
print(json.dumps(d, ensure_ascii=False))
")"

# 3. 导入词书（幂等，覆盖 quizItem）
curl -X POST {BASE_URL}/api/admin/import/wordbook/wb_zhongkao_shixu \
  -H "Content-Type: application/json" \
  -d @$HOME/knowledge_library/文言文/词书/wb_zhongkao_shixu.json
```

> **导入顺序**：先导入选篇，再导入词书。词书导入时 quizItem 会从 article_keyword 重新拷贝 definition，顺序反了会覆盖掉修正。

### 第 6 步：前端验证

1. 打开小程序的词书 → 开始学习
2. 找到对应字/句的题目 → 确认 4 个选项中有正确释义
3. 选择正确答案 → 确认判定为正确
4. 进入字总结 → 确认义项展示正确

### 额外检查项

- **kidRef 是否正确**：quizItem.sentenceText 所述句子，是否真的属于 kidRef 指向的那篇文章和那句。如果例句和 kidRef 不匹配（如"非夫人之物而强假焉"的 quizItem 却引用了木兰诗的 kid），需要修正 kidRef——但这属于更复杂的选篇调整，涉及新增句子/keyWords，应走 [[article-adjustment-workflow]]。
- **译文同步检查**：sentenceTranslation 是否也需要修正。释义变了，译文可能需要微调。
- **同字跨词书检查**：如果该字被多本词书引用（如同时在中考和高考词书中），每本词书都要检查。

### 典型案例

| 日期 | 字 | 例句 | 错误 definition | 正确 definition | 根因 |
|------|---|------|----------------|----------------|------|
| 2026-07-25 | 强 | 赏赐百千强 | 勉强，硬要 | 有余，略多 | article_keyword.definition 写错 → quizItem 拷贝错误值 |

[[article-keyword-correction]]
[[article-adjustment-workflow]]
[[study-section]]
[[articles-section]]
