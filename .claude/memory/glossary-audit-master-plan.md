---
name: glossary-audit-master-plan
description: 选篇典故注释全量梳理与更新——187 篇 1955 条深度审查扩充，新标注标准，范本先行批量跟进
metadata:
  type: project
---

## 概述

选篇典故注释全量深度审查与更新。187 篇选篇、1,955 条典故注释（知识库 187 个 JSON 文件），按新标准逐篇重新梳理，扩充注释覆盖面和深度。

## 核心决策

- **原则**：凡是能增加阅读乐趣的文化内容都标注，读懂+有乐趣，不搞文学分析
- **数据结构不变**：`{word, definition}`，不加 matchWord，不加新字段
- **执行方式**：先范本（art_001 岳阳楼记）→ 用户确认 → 批量处理 186 篇
- **导入方式**：逐文件 curl 批量导入，每篇幂等（先删后插）

## 标注标准（新）

| 标注 ✅ | 不标 ✗ |
|---|---|
| 地名、人名、年号 | 现代汉语极度常见的词（的、了、是、我、你、他...） |
| 器物、草木、动物 | 学生 100% 确定的词 |
| 官职、制度 | 文学技法、修辞手法、文章结构——不搞文学分析 |
| 文化隐喻、典故、成语出处 | |
| 名句、哲理表达 | |
| 词书已覆盖但此处有独特文化含义的实词 | |
| 历史事件、文化背景概念 | |
| 引经据典的出处（如引用《诗经》《论语》等） | |
| 与作者生平/时代背景相关的关键信息 | |

## 注释深度标准

- 每条 2-4 句话（不是现在的 1-2 句）
- 结构：词义解释 → 文化背景/出处 → 在本文中的意味
- 语言通俗，面向中学生
- 目标：读懂 + 有乐趣

## 数据格式规范

- `sentenceIndex`：从 0 开始，无注释的句子省略
- 数组键名统一 `glossary`（不是 `glossaryItems`）
- 每条 definition 以中文句号结尾
- 引用原文使用中文直角引号「」
- JSON 缩进 2 空格

## 当前状态（2026-07-22）

### 知识库

- 目录：`~/Documents/knowledge_library/文言文/选篇/典故注释/`
- JSON 文件：187 个（art_001 ~ art_187，连续无缺失）
- 注释条目：1,955 条，覆盖 817 句
- README.md 声明 85 个/1089 条——严重过时，需更新

### 已知问题

1. **art_035.json bug**：`sentenceIndex: 2` 下用了 `glossaryItems` 而非 `glossary`，此条被后端静默跳过
2. **18 个空 `glossary: []` 句子**：可能是故意占位，需确认
3. **释义末尾标点不统一**：825 条有句号，1,066 条没有
4. **前端 `IGlossaryItem` 无 matchWord**：当前设计不打算加，但如果未来遇到同句同字异义再考虑
5. **前端类型标注 bug**：`buildGlossarySegments` 中合并逻辑的变量类型为 `IVocabSegment[]` 而非 `IGlossarySegment[]`

### 后端

- 表：`article_glossary`（id, article_sentence_id, word, definition, sort_order）
- 导入 API：`POST /api/admin/import/glossary/{articleId}`，幂等（删除旧数据后批量插入）
- 导入逻辑：先查句子 ID 映射，DELETE 旧记录，JDBC batchInsert 新记录
- 序列化：ArticleService.toArticleMap 批量查 glossary 后内联到句子的 `glossary` 字段

### 前端

- 类型：`IGlossaryItem { word, definition }`
- 渲染：金色下划线 + 底部面板弹窗（暖色调 #fef9f0）
- 与 keyWords 独立，不关联词书

## 执行计划

### Phase 1: 范本制作 — art_001 岳阳楼记

1. 读取完整原文和句子切分
2. 按新标准逐句重新标注
3. 每条 definition 按深度标准重写
4. 用户确认范本

### Phase 2: 批量处理 186 篇

分 10 批，每批约 18-19 篇：

| 批次 | 范围 | 篇数 |
|------|------|------|
| 1 | art_002 ~ art_020 | 19 |
| 2 | art_021 ~ art_039 | 19 |
| 3 | art_040 ~ art_058 | 19 |
| 4 | art_059 ~ art_077 | 19 |
| 5 | art_078 ~ art_096 | 19 |
| 6 | art_097 ~ art_115 | 19 |
| 7 | art_116 ~ art_134 | 19 |
| 8 | art_135 ~ art_153 | 19 |
| 9 | art_154 ~ art_172 | 19 |
| 10 | art_173 ~ art_187 | 15 |

每批流程：
1. 读取文章正文（从 knowledge_library 正文 JSON）
2. 逐篇逐句审查：保留/修改/删除/新增
3. 写入 JSON，校验 `python3 -c "import json; json.load(open('art_XXX.json'))"`
4. 逐文件 curl 导入数据库
5. 抽查前端验证

### Phase 3: 收尾

1. 修复 art_035 的 `glossaryItems` → `glossary`
2. 清理空 `glossary: []` 句子（确认意图）
3. 更新知识库 readme.md
4. 更新 `.claude/memory/articles-section.md`

## 关键文件索引

| 层 | 文件 | 操作 |
|----|------|------|
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/art_*.json`（187 个） | 逐篇更新 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/readme.md` | 更新统计数据 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json`（12 个） | 只读参考 |
| 前端 | `pages/article-reader/index.*` | 不改 |
| 后端 | `DataImportService.java` | 不改 |
| 项目记忆 | `.claude/memory/articles-section.md` | 更新条目数 |

## 批量导入脚本

```bash
#!/bin/bash
BASE_URL="http://localhost:8080"
KNOWLEDGE_DIR="$HOME/Documents/knowledge_library/文言文/选篇/典故注释"

for f in "$KNOWLEDGE_DIR"/art_*.json; do
  article_id=$(basename "$f" .json)
  echo "Importing $article_id ..."
  curl -s -X POST "$BASE_URL/api/admin/import/glossary/$article_id" \
    -H "Content-Type: application/json" \
    -d "@$f" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  OK: {d[\"data\"][\"glossaryCount\"]} 条')"
done
echo "Done."
```

## 验证

1. 每篇 JSON 校验：`python3 -c "import json; json.load(open('art_XXX.json'))"`
2. 批量导入后抽查 10 篇前端典故注释模式
3. 导入日志确认全部成功（无静默跳过）

[[articles-section]]
