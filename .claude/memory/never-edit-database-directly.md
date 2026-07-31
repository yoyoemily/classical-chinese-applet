---
name: never-edit-database-directly
description: 永远不要直接修改数据库——知识库JSON是唯一数据源，数据库由用户通过导入API同步
metadata:
  type: feedback
---

修复流程的铁律：**知识库 JSON 是唯一权威数据源，数据库是 JSON 导入后的镜像。** 修复时必须改知识库 JSON，由用户执行导入 API 来同步数据库。

**Why:** 数据库是 JSON 的"编译产物"。直接改数据库会与 JSON 源文件产生差异，下次导入时会覆盖掉手动修改。正确的数据管线是：知识库 JSON → 导入 API → 数据库 → 小程序读取。

**How to apply:** 任何涉及 quizItem/kidRef/definition/sentence/distractor 的修复，一律改 JSON 源文件：
1. 词书 JSON：`~/knowledge_library/文言文/词书/wb_*.json`
2. 选篇 JSON：`~/knowledge_library/文言文/选篇/正文/articles_*.json`
3. 标准义项表：`~/knowledge_library/文言文/词书/definition_standard.json`

改完后校验 JSON 语法，然后告知用户执行导入（顺序：先 articles 全量，再词书）。

[[fix-guide]]
[[word-book-audit]]
[[word-book-audit-fix-list]]
