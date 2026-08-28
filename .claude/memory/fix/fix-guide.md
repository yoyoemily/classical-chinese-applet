---
name: fix-guide
description: 全系统修复总纲——按问题症状（9个检查点）索引到 A/B/C/D 四类操作标准，涵盖词书审核修复、选篇纠错、经典调整。触发词：修复问题、答案错了、释义错误、kidRef 错误、句子有误、选项重复、fix
metadata:
  type: project
---

## 一、数据架构速查（所有修复的基础认知）

```
definition_standard.json（唯一规范源，408 字 / 1,005 义项）
    │  keyWord.definition 必须原文复制自标准表，不做同义改写
    │
articles_*.json（唯一权威源）
    │  keyWord.definition —— 来自标准义项表
    │  keyWord.kid ───────── 全局唯一，圣杯，永远不变
    │  keyWord.wordBookId ─── 必填，不能为 null
    │  sentence.text / translation / source
    │
    ▼ 词书导入时拷贝（防火墙）
词书 JSON quizItem
    │  quizItem.kidRef ─────── 引用 article_keyword.kid
    │  quizItem.definition ─── 独立副本，从 article_keyword 拷贝
    │  quizItem.sentenceText ─ 独立副本，从 article_sentence 拷贝
    │  quizItem.sentenceTranslation / sentenceSource —— 独立副本
    │  quizItem.targetWord ─── 应与 entry.character 一致
    │  quizItem.distractors ── 干扰项数组
    │
    ▼ 运行时读取（防火墙保护）
用户答题界面 ← 读 quiz_item 表（不 JOIN article_keyword）
```

### 核心约束

| 约束 | 说明 | 详见 |
|------|------|------|
| **kid 圣杯原则** | 已有 kid 永远不变。要么保留，要么整条删除。新增才生成新 kid | — |
| **quizItem ID 不可变性** | 删除不复用，新增用新 ID。ID 被 `study_mistake_sentence` 和 `user_answer_history` FK 引用 | [[quizitem-id-invariance-rule]] |
| **导入顺序铁律** | 先导入 articles（权威源），再导入词书（防火墙副本）。顺序反了，词书导入时 quizItem.definition 会从旧 article_keyword 重新拷贝，覆盖掉修正 | — |
| **定义来源** | keyWord.definition 必须原文复制自 `definition_standard.json`，不做同义改写。标准表无匹配 → 先与用户确认后扩充标准表 | — |
| **JSON 安全** | 修改 >50KB JSON 前 `cp file file.bak`；改后 `python3 -c "import json; json.load(open('file'))"` 校验；字符串值内禁止 ASCII `"`，引用原文用中文引号 `""` | — |

### 词书 quizItem 字段 vs article_keyword 字段对照

| quizItem 字段 | 来源 | 修复时改哪边 |
|---------------|------|-------------|
| `definition` | article_keyword.definition（词书导入时拷贝） | **先改 articles，再改词书** |
| `kidRef` | article_keyword.kid | 改词书 JSON 的 kidRef 值 |
| `sentenceText` | article_sentence.text（词书导入时拷贝） | 改 articles sentence.text → 重导词书同步 |
| `sentenceTranslation` | article_sentence.translation（拷贝） | 改 articles → 重导词书同步 |
| `sentenceSource` | article.title + dynasty | 改 articles → 重导词书同步 |
| `targetWord` | entry.character | 改词书 JSON |
| `distractors` | 词书 JSON 独立定义 | 改词书 JSON |
| `difficulty` | 词书 JSON 独立定义 | 改词书 JSON |

---

## 二、问题速查表

按用户反馈的"症状"定位到对应的操作类别和章节：

| # | 症状 | 检查点 | 类别 | 跳转 |
|---|------|:---:|:---:|------|
| 1 | 答题正确答案错了（释义和句子语境不匹配） | ③ | **B** | [四、B 类：释义修正双改](#四b-类修复释义修正双改检查点-) |
| 2 | 选项之间有重复/太接近分不清 | ④ | **A** | [三、A 类：只改词书 JSON](#三a-类修复只改词书-json检查点-) |
| 3 | 干扰项里混入了正确答案 | ⑤ | **A** | [三、A 类：只改词书 JSON](#三a-类修复只改词书-json检查点-) |
| 4 | 句子文本显示不完整/有乱码/混入语法说明 | ⑥ | **A** | [三、A 类：只改词书 JSON](#三a-类修复只改词书-json检查点-) |
| 5 | 句中高亮的字和要学的字不一样 | ⑦ | **A** | [三、A 类：只改词书 JSON](#三a-类修复只改词书-json检查点-) |
| 6 | kidRef 指错了文章（例句出自 A 文，kidRef 指到 B 文） | ⑧ | **C** | [五、C 类：keyWord 标注与 kidRef](#五c-类修复-keyword-标注与-kidref检查点-) |
| 7 | 例句出处/作者/朝代写错了 | ① | **D** | [六、D 类：句子/译文/出处](#六d-类修复句子译文出处检查点-) |
| 8 | 例句译文有误 | ② | **D** | [六、D 类：句子/译文/出处](#六d-类修复句子译文出处检查点-) |
| 9 | 句子在选篇 article_sentence 中不存在 | ⑨ | **D** | [六、D 类：句子/译文/出处](#六d-类修复句子译文出处检查点-) |
| 10 | 某个 keyWord 不应该标注（不在词书中、义项不匹配、误标） | — | **C** | [五、C 类](#五c-类修复-keyword-标注与-kidref检查点-) |
| 11 | 文章标注了 keyWord，但词书没收录对应例句（quizItems 漏收） | ⑩ | **E** | [七、E 类：词书漏收例句](#七e-类修复词书漏收例句检查点-) |

---

## 三、A 类修复：只改词书 JSON（检查点 ④⑤⑥⑦）

**适用场景**：选项重复（④）、干扰项含正确答案（⑤）、sentenceText 不完整/混入乱码（⑥）、targetWord 与 entry.character 不一致（⑦）。

**操作范围**：只改词书 JSON（`~/knowledge_library/文言文/词书/wb_*.json`），不动 articles JSON。

**涉及字段**：`distractors`、`sentenceText`、`targetWord`。

### 操作步骤

1. 备份：`cp ~/knowledge_library/文言文/词书/wb_xxx.json ~/knowledge_library/文言文/词书/wb_xxx.json.bak`
2. 修改词书 JSON（示例见下方各场景）
3. 校验：`python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/词书/wb_xxx.json'))"`
4. **通知用户执行导入**（导入命令见[八、导入命令速查](#八导入命令速查)）
5. 前端验证：打开小程序 → 词书 → 学习，确认问题已修复

### ④⑤ 选项/干扰项修改

**选项重复三级判定**：

| 级别 | 定义 | 示例 | 处理 |
|:---:|------|------|:--:|
| 完全重复 | 两个选项文字完全一致 | "安定，安稳" vs "安定，安稳" | 删掉一个，换成其他义项 |
| 包含性重复 | 核心义项被另一选项覆盖 | "完，没有了" vs "完、没有了（杨花…）" | 去除括号内例句，保留纯义项 |
| 近义重复 | 上下文无法区分 | "安定，安稳" vs "平安" | 换掉一个，拉开语义距离 |

不视为重复：使动/意动/为动 vs 非使动。

**干扰项含正确答案**：改干扰项中与正确答案一致的条目，替换为其他合理的错误义项（同字异义、形近字释义、微殊表述）。

**修改示例**：

```json
{
  "id": "s_c_1386",
  "definition": "完，没有了",
  "distractors": [
    "完、没有了（杨花已全部飘落）",  // ← 包含性重复，改为其他义项如"全部，都"
    "用尽，用完",
    "结束，终止"
  ]
}
```

### ⑥ sentenceText 修改

- 确认 quizItem 的 kidRef → 到 articles JSON 找到对应 sentence 的原文
- 将 sentenceText 替换为纯句子文本（去除序号、语法说明、圈号等）
- **改动仅限词书 JSON**（articles JSON 的 sentence text 是正确的源），导入词书即可

### ⑦ targetWord 修改

将 `targetWord` 改为与 `entry.character` 一致。如果句子中确实没有该字（如"从"的 quizItem 指向了含"随"而非"从"的句子），则需要走 C 类删除该 quizItem。

---

## 四、B 类修复：释义修正双改（检查点 ③）

**适用场景**：答题正确答案有误——quizItem.definition 在句中实际义项与正确释义不符。

**根因链路**：

```
articles_*.json keyWord.definition 写错（权威源）
    ↓ 词书导入时拷贝
quizItem.definition 拷贝了错误值（防火墙副本）
    ↓ 用户答题
正确答案显示的是错误释义
```

**操作范围**：articles JSON + 词书 JSON 双改。**必须先改 articles 再导入词书**。

### 操作步骤

#### 第 1 步：定位错误 quizItem

```bash
# 快速定位（替换 X字 为目标字）
python3 -c "
import json
data = json.load(open('$HOME/knowledge_library/文言文/词书/wb_*.json'))
for entry in data['wordEntries']:
    if entry['character'] == 'X字':
        for qi in entry['quizItems']:
            print(qi['id'], qi['sentenceText'][:50], '→', qi['definition'])
" 2>/dev/null
```

记下 quizItem 的 `id`、`definition`、`kidRef`、`distractors`。

#### 第 2 步：确定正确释义

1. 在标准义项表 `~/knowledge_library/文言文/词书/definition_standard.json` 中查找该字在句中的正确义项
2. **原文复制**匹配的义项，不做同义改写
3. **标准表无匹配** → 先与用户确认正确义项 → 扩充标准表 → 再引用

#### 第 3 步：修改 articles JSON（权威源）

根据 quizItem 的 `kidRef` 找到选篇 JSON 中对应的 keyWord：

```bash
grep -r 'kid.*kw_xxx' ~/knowledge_library/文言文/选篇/正文/articles_*.json
```

修改匹配的 keyWord 的 `definition` 字段：

```json
{
  "word": "强",
  "definition": "有余，略多",          // ← 只改这个字段，原文复制自标准义项表
  "wordType": "shi",
  "kid": "kw_art_008_s02_强_0",       // ← kid 不动
  "wordBookId": "wb_zhongkao_shixu"   // ← wordBookId 不动
}
```

#### 第 4 步：修改词书 JSON

找到对应的 quizItem，修改 `definition` + 检查 `distractors`：

```json
{
  "id": "s_c_0164",
  "kidRef": "kw_art_008_s02_强_0",   // ← 不动
  "targetWord": "强",                 // ← 不动
  "definition": "有余，略多",          // ← 修改为与 keyWord 一致
  "distractors": ["强大", "勉强", "强壮"],  // ← 检查：不应包含新正确释义
  "sentenceText": "赏赐百千强。",      // ← 不动
  "sentenceTranslation": "...",        // ← 不动
  "sentenceSource": "《木兰诗》"        // ← 不动
}
```

#### 第 5 步：校验 + 通知用户导入（顺序不能反）

```bash
# 校验
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/选篇/正文/articles_xxx.json'))"
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/词书/wb_xxx.json'))"
```

**通知用户按顺序执行导入**：先导入选篇正文，再导入词书。导入命令见[八、导入命令速查](#八导入命令速查)。

#### 第 6 步：前端验证

1. 打开小程序 → 词书 → 开始学习
2. 找到对应字/句的题目 → 确认 4 个选项中正确释义在列
3. 选择正确答案 → 确认判定正确
4. 进入字总结 → 确认义项展示正确

### 额外检查项

- **干扰项同步**：释义改了之后，干扰项是否还合理——不应包含新正确释义，语义距离足够
- **同字跨词书**：该字是否同时在多本词书中（如中考+高考）→ 每本词书都要检查
- **译文同步**：sentenceTranslation 是否需要随释义变化微调

---

## 五、C 类修复：keyWord 标注与 kidRef（检查点 ⑧）

**适用场景**：kidRef 指错文章、keyWord 不应标注（误标/不在词书/义项不匹配）、缺少 keyWord 需新增。

**操作范围**：articles JSON（keyWord 增删改）+ 词书 JSON（kidRef/quizItem 同步）。

### 三类场景

| 场景 | 判定 | 操作 |
|------|------|------|
| kidRef 指错，正确文章中有匹配 keyWord | quizItem 句子在 A 文，kidRef 指向 B 文，A 文中有该字 keyWord 且义项匹配 | 改词书 kidRef 指向 A 文的 keyWord.kid |
| kidRef 指错，正确文章中无匹配 keyWord | A 文中没有该字的 keyWord | 在 A 文中**新增 keyWord** → 改词书 kidRef |
| keyWord 不应标注 | 字不在任何词书中 / 义项不匹配句中用法 / 误标为通假字等 | 删除 articles JSON 中的 keyWord → 同步清理词书引用 |

### 场景 1：kidRef 指错，正确文章中有匹配 keyWord

1. 确认 quizItem 句子的真实出处 → 在 articles JSON 中定位正确的那句
2. 确认该句中已有匹配的 keyWord（含正确的 definition）→ 取它的 kid
3. 改词书 JSON 中 quizItem 的 `kidRef` 为该 kid
4. 如 definition 也需同步修正 → 同时改 definition
5. **通知用户执行导入**：先导入 articles（全量），再导入词书。导入命令见[八、导入命令速查](#八导入命令速查)。

### 场景 2：kidRef 指错，正确文章中无匹配 keyWord → 新增 keyWord

1. 在正确文章的 articles JSON 中新增 keyWord 条目：

```json
{
  "word": "字",
  "definition": "从标准义项表 definition_standard.json 中原文复制",
  "wordType": "shi/xu/tongjia/gujinyi/huoyong",
  "kid": "kw_{articleId}_s{sentenceIndex:02d}_{word}_{序号}",
  "wordBookId": "词书 ID（必填，不能为 null）"
}
```

2. kid 全局唯一，序号从 0 起递增
3. 改词书 JSON 中 quizItem 的 `kidRef` 为新 kid
4. **通知用户执行导入**：先导入 articles（全量），再导入词书。导入命令见[八、导入命令速查](#八导入命令速查)。

### 场景 3：keyWord 不应标注（删除 keyWord）

该字不在任何打卡型词书（8 本）的 `wordEntries[].character` 中，或义项不匹配句中用法，或误标为通假字/词类活用等。

**第 1 步：检查词书引用（关键！）**

```sql
-- 在数据库中检查（通过 .claude/memory/audit/audit_one_char.sh 或直接查 DB）
SELECT * FROM quiz_item WHERE kid_ref = 'kw_xxx';
```

**第 2 步：清理词书侧引用**（如有）

在知识库词书 JSON 中找到引用该 kid 的 `quizItems` 条目（`kidRef` 为该值） → 删除。（通知用户重导该词书）

> quizItem 被删除后用户答题历史失去关联——这是标注纠错的必要代价，范围可控（仅影响该词该句）。

**第 3 步：删除 articles JSON 中的 keyWord 条目**

kid 永远不修改——要么保留，要么整条删除。如果同一句中还有其他 keyWord，只删这一个。

**第 4 步：校验 → 通知用户导入**（先 articles 全文导入，如改了词书则后导词书。导入命令见[八、导入命令速查](#八导入命令速查)）

### 选篇结构调整

如果涉及句子增删/移位、译文分句对齐等更复杂的操作，按 [[article-adjustment-workflow]] 执行。

---

## 六、D 类修复：句子/译文/出处（检查点 ①②⑨）

**适用场景**：例句出处错误（①）、例句译文错误（②）、句子在选篇中不存在即缺少该句（⑨）。

**操作范围**：articles JSON（修改/新增 sentence 数据）+ 词书 JSON（同步sentenceText/sentenceTranslation/sentenceSource）。

### 纯译文/出处修改（不涉及结构变化）

只改 articles JSON 中对应 sentence 的 `translation` 或 article 的 `title`/`author`/`dynasty` 字段 → 通知用户全量导入 articles → 重导词书同步 quizItem 副本字段。导入命令见[八、导入命令速查](#八导入命令速查)。

### 句子增删/移位/译文分句对齐

涉及结构变化时，严格按照 [[article-adjustment-workflow]] 执行，关键约束：

- 旧 kid 永远不动（kid 圣杯原则），新 kid 使用未被占用的最大编号。`sXX` 与数组位置不对齐是允许的
- 修改译文后必须校验原文与译文分句数一致（`split(/[。！？；]/)` 非空段数相等）
- 新增句子后检查是否需要新增 keyWord
- **新增句子后反向搜索词书 quizItem**：用新句子的关键词 grep 词书 JSON，检查是否有 quizItem 的 sentenceText 匹配新句但 kidRef 指错，如有则修正（D 类缺句几乎必然伴随 C 类 kidRef 错指）
- 标注完成后运行 `python3 .claude/memory/articles/validate_keywords.py` 交叉验证

---

## 七、E 类修复：词书漏收例句（检查点 ⑩）

**适用场景**：文章句子的 keyWord 标注正确（wordType/wordBookId/kid/definition 都对），但词书没收录对应 quizItem，用户在该词书里看不到这个句子的打卡题。

**症状特征**：
- 用户在选篇阅读时看到某个字标注了古今异义/实词/虚词等
- 但去对应词书学习时，这个字的打卡题里没有该句

**根因**：词书 JSON 的 quizItems 是手动维护的，没有自动从文章标注同步。标注阶段可以做到句子级精准，但词书 JSON 维护时可能漏收。

**操作范围**：articles JSON 的 `relatedWordIds` + 词书 JSON 的 `quizItems`。

### 排查脚本

```bash
python3 -c "
import json

# 1. 读文章，找到该字的所有 keyWord（含 kid、wordBookId、sentenceText）
ARTICLE = '$(readlink -f ~/knowledge_library/文言文/选篇/正文/articles_grade7b.json)'
WORD = '但'

data = json.load(open(ARTICLE))
for a in data:
    for s in a['sentences']:
        for kw in s.get('keyWords', []):
            if kw['word'] == WORD:
                print(f'文章 {a[\"id\"]} {a[\"title\"]}: {kw[\"kid\"]} wordBookId={kw[\"wordBookId\"]} \"{s[\"text\"][:40]}\"')
" 2>/dev/null

# 2. 读词书，找到该字的 quizItems
echo '---'
python3 -c "
import json
WB = '$(readlink -f ~/knowledge_library/文言文/词书/wb_zhongkao_gujinyi.json)'
WORD = '但'

data = json.load(open(WB))
for entry in data['wordEntries']:
    if entry['character'] == WORD:
        kids_in_quiz = {qi['kidRef'] for qi in entry['quizItems']}
        print(f'词书 {entry[\"id\"]} quizItems: {sorted(kids_in_quiz)}')
        break
"
```

### 修复步骤

#### 第 1 步：确认文章标注完整

确认文章句子中的 keyWord 包含正确的 `wordType`、`wordBookId`、`definition`（来自标准义项表）、`kid`。如果文章标注本身有问题，先按 B/C/D 类修复。

#### 第 2 步：补 articles JSON 的 relatedWordIds

文章级 `relatedWordIds` 应包含该字所属词书的 wordBookId。漏了会导致文章关联词书时找不到这个字。

```json
// articles_*.json 的 relatedWordIds 数组中追加
"wb_c_238"  // 例如：古今异义
```

#### 第 3 步：补词书 JSON 的 quizItems

在词书条目的 `quizItems` 中追加新的 quizItem 条目（含 `kidRef` 指向该 keyWord 的 kid）。如果该句已存在只是义项不同，调整现有 quizItem 的 `definition`/`difficulty` 即可。

#### 第 4 步：补词书 JSON 的 quizItems

为每个漏收的句子创建 quizItem。ID 用全局最大编号 +1：

```bash
grep -roh '"id": "s_c_[0-9]*"' ~/knowledge_library/文言文/词书/ | sed 's/"id": "s_c_//' | sed 's/"//' | sort -n | tail -1
```

新增 quizItem 模板：

```json
{
  "id": "s_c_1471",
  "kidRef": "kw_art_028_s02_但_0",
  "targetWord": "但",
  "difficulty": "basic",
  "definition": "只、仅仅",
  "distractors": ["但是", "然而", "不过"],
  "sentenceText": "见其发矢十中八九，但微颔之。",
  "sentenceTranslation": "看他射箭十支能中八九支，只是微微点头。",
  "sentenceSource": "《卖油翁》"
}
```

字段来源（防火墙原则）：

| quizItem 字段 | 来源 |
|---------------|------|
| `kidRef` | 文章中对应 keyWord 的 `kid`（不改） |
| `targetWord` | 词书条目 `entry.character` |
| `definition` | 文章中 keyWord 的 `definition`（独立副本） |
| `distractors` | 新造，与已有同字 quizItem 风格一致，不包含正确释义 |
| `sentenceText` | 文章中 sentence 的 `text`（纯句子原文） |
| `sentenceTranslation` | 文章中 sentence 的 `translation` |
| `sentenceSource` | `《文章标题》` |
| `difficulty` | 按句长和语境判断：短句/直译→`basic`，中长/需辨析→`medium` |

#### 第 5 步：校验 + 导入

```bash
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/选篇/正文/articles_*.json'))"
python3 -c "import json; json.load(open('$HOME/knowledge_library/文言文/词书/wb_*.json'))"
```

**通知用户执行导入**：先导入 articles（全量），再导入词书。命令见[八、导入命令速查](#八导入命令速查)。

---

## 八、导入命令速查
BASE_URL="http://localhost:8080"  # 本地
# BASE_URL="https://wyq.yinqueai.com"  # 线上

# 只导入词书（A 类修复，或 C 类场景 1 只改词书）
curl -X POST $BASE_URL/api/admin/import/wordbook/{wordbookId} \
  -H "Content-Type: application/json" \
  -d @$HOME/knowledge_library/文言文/词书/{wordbookFile}.json

# 全量导入选篇正文（B/C/D 类修复，改了 articles 时必须做）
curl -X POST $BASE_URL/api/admin/import/articles \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, glob, os
d = []
for f in sorted(glob.glob(os.path.expanduser('~/knowledge_library/文言文/选篇/正文/articles_*.json'))):
    with open(f) as fp: d.extend(json.load(fp))
print(json.dumps(d, ensure_ascii=False))
")"

# B 类修复：先导 articles，再导词书（顺序不能反）
# 对照上方两条命令依次执行
```

---

## 九、相关联记忆

```
修复总纲 ──┬── fix-guide.md（本文件）
           │
           ├── 硬性规则 ── quizitem-id-invariance-rule.md
           │
           ├── 选篇调整 SOP ── article-adjustment-workflow.md（D 类引用）
           │
           ├── 审核 ── word-book-audit.md（发现问题入口）
           │          word-book-audit-fix-list.md（问题记录模板）
           │
           ├── 板块参考 ── study-section.md
           │              articles-section.md
           │              classics-section.md
           │
           └── 工作约定 ── work-manual.md
                          backend-infrastructure.md
```
