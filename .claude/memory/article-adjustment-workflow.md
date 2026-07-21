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

**数据关系**：选篇 keyWords 是唯一权威源，词书通过 `kid` 引用。标注新选篇时，以 8 本打卡型词书的 `wordEntries` 作为**考纲参照**——词书定义了"哪些字是考点"，选篇负责"这些考点在具体语境中怎么用"。

**判断流程**：
1. 分析句中每个字/词的语义和用法
2. 在 8 本词书的 `wordEntries[].character` 中检查该字是否属于考纲范围
3. 命中后核对**释义是否匹配句中的实际用法**——义项不匹配的不标
4. 匹配的词条，在选篇中标注 keyWord（同时关联对应词书的 `wordBookId`）：

```json
{
  "word": "字",
  "definition": "结合句中用法，从词书 explanation 中提取匹配的义项，简洁表述",
  "wordType": "shi/xu/tongjia/gujinyi/huoyong",
  "kid": "kw_{articleId}_s{sentenceIndex:02d}_{word}_{序号}",
  "wordBookId": "词书 ID"
}
```

**约束**：
- 选篇中的字如果不在任何词书中，不代表它不标注——但如果标注了，就无法关联 `wordBookId`（学习回路中该字不会出现在词书答题中）
- `wordBookId` 填写后，词书通过 `keyWordRefs` 自动引用该 keyWord 的 `kid`，无需在词书侧手工维护
- `kid` 序号从 0 开始递增，同句同字可以有多个序号（如不同义项来自不同词书）
- 同句同字有多个 kid 时，`definition` 应区分（如"介词/连词：和、跟、同" vs "和、同"）
- kid 全局唯一，新增前先确认不重复

### 4. 典故注释 (glossary) 标准

标准来自知识库 `文言文/选篇/典故注释/readme.md`：

| 标注 ✅ | 不标 ✗ |
|----------|--------|
| 地名、人名、年号 | 动词、形容词——词书已覆盖 |
| 器物、草木、动物 | 虚词——词书已覆盖 |
| 官职、制度 | 代词——词书已覆盖 |
| 文化隐喻、典故 | 常见名词（春年山日）——现代汉语常用 |
| 名句、哲理表达 | |

判断口诀：学生不看解释就知道 → 不标；有文化背景可讲、能提升阅读乐趣 → 标；词书已覆盖的实词/虚词 → 不标。

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
- [ ] 新 keyWord 的 `wordBookId` 已填写
- [ ] JSON 校验通过
- [ ] 数据已导入数据库

[[articles-section]]
