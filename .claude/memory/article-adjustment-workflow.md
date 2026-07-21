---
name: article-adjustment-workflow
description: 选篇调整标准工作流程——句子增删/移位、keyWords 标注、典故注释、导入数据库的完整 SOP。触发词：调整选篇、修改选篇、优化选篇
metadata:
  type: project
---

## 选篇调整标准工作流程

> 涉及句子增删/移位、keyWords 增减、典故注释增删时，严格按此流程执行。
> 
> **触发词**：用户说"调整选篇""修改选篇""优化选篇"时，读取本文件，询问具体选篇，确认后严格按规范执行。
> 调整过程中如发现规范本身需要优化，告知用户。

### 1. 改什么文件

| 文件 | 用途 |
|------|------|
| `articles.json` (知识库) | 选篇正文唯一权威源：标题、句子文本/译文、keyWords |
| `art_XXX.json` (知识库) | 该篇的典故注释 |
| `wb_*.json` (词书, 8本打卡型) | 若 keyWords 有增删，对应 wordEntry 的 keyWordRefs 需同步 |

### 2. 句子增删/移位

1. 在 `articles.json` 中修改 `sentences` 数组（插入/删除/移位）
2. 同步修改 `art_XXX.json` 中 `sentences` 数组占位，并重新编号 `sentenceIndex`（从 0 连续）
3. **移位后必须遍历原有 keyWords 的 `kid` 和 glossary 的 `sentenceIndex`，同步修正编号**
   - keyWord 没有独立的 `sentenceIndex` 字段，编号嵌在 `kid` 字符串中（格式 `kw_{articleId}_s{XX}_{word}_{序号}`），移位后必须更新 `kid` 中的 `sXX` 部分
   - glossary 的 `sentenceIndex` 是独立字段，也需要同步修正
4. **修改译文后必须校验原文与译文的分句数一致**：逐句释义模式的 `buildClauses()` 按标点位置索引配对原文与译文分句，若某句的原文和译文 `split(/[。！？；]/)` 后非空段数不等，会导致子句释义全部错位。修改时用脚本对比每句的分句数，确保一一对应

### 3. keyWords 标注标准

> ⚠️ **【最重要的一课】2026-07-21 高一下补齐踩坑**：4 首诗词 36 个 keyWord 中仅 1 个与词书对应，其余全为地名/典故/文化隐喻（"坼""乾坤""故国""星河""门外楼头""西江""北斗""姹紫嫣红""朝飞暮卷"等）。根因是没有逐字核对词书，凭感觉把"有文化内涵"的词全标成了 keyWord。**keyWord 的唯一判定标准是：该字/词是否在 9 本词书的 `wordEntries[].character` 中存在，且义项匹配句中的实际用法。** 不在词书 = 不是 keyWord（有典故价值的归 glossary）。

**数据关系**：选篇 keyWords 是唯一权威源，词书通过 `kid` 引用。标注新选篇时，以 **9 本词书**（8 本考纲打卡型 + wb_function_words）的 `wordEntries` 作为**唯一参照**——词书定义了"哪些字是考点"，选篇负责"这些考点在具体语境中怎么用"。

**硬性边界（keyWord vs glossary 不可混淆）**：

| 标注为 keyWord ✅ | 不标为 keyWord ✗ → 归 glossary |
|-------------------|-------------------------------|
| 词书中有该字 + 义项匹配句中用法 | 地名、人名、年号 |
| 必须关联 `wordBookId` | 器物、草木、动物 |
| 定义来自词书 explanation | 官职、制度、文化隐喻 |
| | 典故、名句、哲理表达 |
| | 多字词（如"乾坤""星河""西江"），即使含有词书字也不标 |
| | 词书中有该字但义项不匹配句中用法 |

**判断流程（必须逐字执行）**：
1. 分析句中每个字/词的语义和用法
2. 在 9 本词书的 `wordEntries[].character` 中精确查该字（**单字优先，多字词通常不标**）
3. 命中后核对**释义是否匹配句中的实际用法**——义项不匹配的不标（如"涕"在词书中义为"眼泪"但句中指"鼻涕"，不标）
4. 匹配的词条，在选篇中标注 keyWord：

```json
{
  "word": "字",
  "definition": "结合句中用法，从词书 explanation 中提取匹配的义项，简洁表述",
  "wordType": "shi/xu/tongjia/gujinyi/huoyong",
  "kid": "kw_{articleId}_s{sentenceIndex:02d}_{word}_{序号}",
  "wordBookId": "词书 ID（必填，不能为 null）"
}
```

**约束**：
- ⚠️ **不在词书中的字绝不标 keyWord**——标了也无法关联 `wordBookId`，学习回路中不会出现，标注毫无意义
- ⚠️ **`wordBookId` 必填**，不能为 null/空——无词书可关联的字若确有文化价值，归 glossary
- `kid` 序号从 0 开始递增，同句同字可以有多个序号（如不同义项来自不同词书）
- 同句同字有多个 kid 时，`definition` 应区分（如"介词/连词：和、跟、同" vs "和、同"）
- kid 全局唯一，新增前先确认不重复
- **标注完成后必须跑交叉验证脚本**：提取全部 keyWord 的 `word`，在 9 本词书中逐一查存在性，报告命中和遗漏

### 4. 典故注释 (glossary) 标准

> ⚠️ keyWord 标注中不该标的地名/典故/文化隐喻等条目，应移入 glossary（而不是直接丢弃）。

标准来自知识库 `文言文/选篇/典故注释/readme.md`：

| 标注 ✅ | 不标 ✗ |
|----------|--------|
| 地名、人名、年号 | 动词、形容词——词书已覆盖 |
| 器物、草木、动物 | 虚词——词书已覆盖 |
| 官职、制度 | 代词——词书已覆盖 |
| 文化隐喻、典故 | 常见名词（春年山日）——现代汉语常用 |
| 名句、哲理表达 | |
| keyWord 误标移入的条目 | |

判断口诀：学生不看解释就知道 → 不标；有文化背景可讲、能提升阅读乐趣 → 标；词书已覆盖的实词/虚词 → 不标；不在词书的非考点字但有典故价值 → 标 glossary。

### 5. 词书 keyWordRefs 同步

若 keyWords 有增删，在对应词书 JSON 中找到匹配的 `wordEntries[]` 条目，增/删其 `keyWordRefs` 数组中的 `{"kid": "kw_xxx"}` 引用。

### 6. 导入数据库

每个文件修改后分别导入，**一律使用 `-d @文件路径` 方式**（客户端发送文件内容，不依赖服务器本地文件系统），本地和线上通用。导入顺序无依赖：

```bash
# 正文（含 keyWords）—— 全量导入（拼接 12 个分文件后发送）
curl -X POST {BASE_URL}/api/admin/import/articles \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json, glob, os
d = []
for f in sorted(glob.glob(os.path.expanduser('~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json'))):
    with open(f) as fp: d.extend(json.load(fp))
print(json.dumps(d, ensure_ascii=False))
")"

# 典故注释 —— 单篇导入
curl -X POST {BASE_URL}/api/admin/import/glossary/{articleId} \
    -H "Content-Type: application/json" \
    -d @$HOME/Documents/knowledge_library/文言文/选篇/典故注释/{articleId}.json

# 词书 —— 单本导入
curl -X POST {BASE_URL}/api/admin/import/wordbook \
    -H "Content-Type: application/json" \
    -d @$HOME/Documents/knowledge_library/文言文/词书/{wordbookFile}.json
```

**BASE_URL**：本地 `http://localhost:8080`，线上 `https://wyq.yinqueai.com`。

> 注：`importArticles` 接口同时支持无请求体模式（服务器端从本地知识库读取），仅限本地开发环境使用。线上必须带请求体。

### 7. 安全措施

- 修改超过 30KB 的 JSON 前，先 `cp` 备份
- 每次写入后 `python3 -c "import json; json.load(open('file'))"` 校验
- 排除中文引号问题（ASCII `"` vs 中文 `"``"`），见 [[work-manual]]#9
- 全部导入成功后删除 `.bak` 文件

### 8. 完成后检查清单

- [ ] 每句都有译文，无 `null`/空值
- [ ] 每句原文-译文分句数对齐（`split(/[。！？；]/)` 后非空段数相等）
- [ ] 所有 keyWord 的 `kid` 中的 `sXX` 编号与当前 sentenceIndex 一致
- [ ] 所有 glossary 的 `sentenceIndex` 与当前句子编号一致
- [ ] kid 全局唯一，无重复
- [ ] **每个 keyWord 的 `word` 在 9 本词书中有对应 `character`，且义项匹配句中用法**（运行 `scripts/validate_keywords.py` 交叉验证）
- [ ] **每个 keyWord 的 `wordBookId` 非空**，指向正确的词书
- [ ] JSON 校验通过
- [ ] 数据已导入数据库

> ⚠️ 第 6-7 项是 2026-07-21 高一下补齐后的教训——36 条 keyWord 中 35 条不在词书中（地名/典故/文化隐喻误标），根源在于标注后没有交叉验证。

### 9. keyWords 词书关联校验脚本

每次新增或修改 keyWords 后，运行以下脚本确认全部 keyWord 与词书的对应关系：

```bash
# 校验全部选篇 keyWords 的词书覆盖率
python3 scripts/validate_keywords.py
```

脚本行为：
- 读取全部 articles_*.json，提取所有 keyWord
- 在 8 本词书(打卡型)中逐一查 `wordEntries[].character`
- 报告每条 keyWord 的词书命中状态
- 统计各年级命中率
- **不在任何词书中的 keyWord → 输出警告 + 建议移入 glossary**

此脚本应作为标注完成后的**硬性校验步骤**，不通过不得导入数据库。

[[articles-section]]
