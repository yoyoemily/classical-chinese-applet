---
name: glossary-audit-master-plan
description: 选篇典故注释全量梳理与更新——187 篇 1955 条深度审查扩充，新标注标准，范本先行批量跟进
metadata:
  type: project
---

## 概述

选篇典故注释全量深度审查与更新。179 篇选篇、2,125 条典故注释（知识库 179 个 JSON 文件），按新标准逐篇重新梳理，扩充注释覆盖面和深度。1~8 批梳理完成后平均 126 字/条，第 9~10 批待处理。

## 核心决策

- **原则**：凡是能增加阅读乐趣的文化内容都标注，读懂+有乐趣，不搞文学分析
- **数据结构不变**：`{word, definition}`，不加 matchWord，不加新字段
- **执行方式**：先范本（art_001 岳阳楼记）→ 用户确认 → 批量处理 186 篇
- **导入方式**：逐文件 curl 批量导入，每篇幂等（先删后插）
- **壳文章不标注**：壳文章（仅在 `articles_shell.json` 中的选篇）不需要典故注释，其对应的 glossary JSON 文件应删除
- **ID 缺失直接跳过**：articles.json 中不存在的 ID 说明该选篇已被删除，跳过即可，不深究原因

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

## 当前状态（2026-07-22 更新）

### 知识库

- 目录：`~/Documents/knowledge_library/文言文/选篇/典故注释/`
- JSON 文件：179 个（art_001 ~ art_187，删除 8 个无正文/壳文章/已删除 ID 对应的 glossary）
- 注释条目：2,125 条（第8批完成后，全部已导入数据库）
- 平均字数：126 字/条（梳理后 1~8 批加权平均）

### 修订进度

| 批次 | 范围 | 状态 |
|------|------|------|
| 1 | art_002 ~ art_020 | ✅ 完成。19 篇 366 条，均 138 字，引号 94%，已导入 |
| 2 | art_021 ~ art_039 | ✅ 完成。12 篇修订 + 4 篇底子好跳过，均约 170 字。art_035 glossaryItems bug 已修复。art_039 正文缺失待确认 |
| 3 | art_041 ~ art_059 | ✅ 完成。13 篇（art_040/046/047/048/049/053/055 已删除无正文或壳文章，art_039 已删除），76 句 197 条，均 95 字。补充 art_056/057/058 缺失句（共+11 句 18 条），新增缺词（art_042/043/045/052 +7 条），全量补齐句号。已导入 |
| 4 | art_060 ~ art_077 | ✅ 完成并已导入。18 篇 341 条（原 247 → +94 条新增），均 140 字。全量 JSON 校验通过，已导入数据库 |
| 5 | art_078 ~ art_096 | ✅ 完成并已导入。19 篇 260 条（原 120 → +140 条新增/扩充），全量 JSON 校验通过。8 篇长文全部 100% 句子覆盖，11 篇短诗深度扩充。均约 170 字/条。已导入数据库 |
| 6 | art_097 ~ art_115 | ✅ 完成并已导入。19 篇 106 条（均为七下古诗词，原均 78 字 → 均 179 字），全量 JSON 校验通过。补充 art_109 sent1 缺词（「秋色」新增）。均约 179 字/条。已导入数据库 |
| 7 | art_116 ~ art_134 | ✅ 完成并已导入。19 篇 140 条（原 139 条，均 78 字 → 均 150 字），全量 JSON 校验通过。八上/八下古诗词深度扩充，合并「关雎/蒹葭」多词条注释、拆分「石壕吏/卖炭翁」单句注释。修复 art_116「易水」归属句子错误。已导入数据库 |
| 8 | art_135 ~ art_153 | ✅ 完成并已导入。19 篇 174 条（原 179 条，合并 art_139/141/151 的多词合注，均 54 字 → 均 130 字），全量 JSON 校验通过。九上/九下古诗词深度扩充，补齐 art_151 sent2/3、art_152 sent3/4、art_153 sent4 共 6 条空句注释。已导入数据库 |
| 9 | art_154 ~ art_172 | ✅ 完成并已导入。19 篇 189 条，均 129 字/条（原 377 条/均 69 字→合并扩充为 189 条/均 129 字），全量 JSON 校验通过。九下课外古诗词+高一上/下古诗词深度扩充，含短歌行/琵琶行/永遇乐/声声慢/虞美人/鹊桥仙/登岳阳楼等经典名篇。已导入数据库 |
| 10 | art_173 ~ art_187 | ✅ 完成并已导入。15 篇 128 条，均 186 字/条（原均 69 字），全量 JSON 校验通过。高二上/下古诗词深度扩充，含燕歌行/李凭箜篌引/锦瑟/书愤/临安春雨初霁等名篇。已导入数据库 |

**全量导入完成**：179 篇 2,065 条全部导入数据库，1~10 批全量梳理完成。所有注释已上线可用。

### 已修复问题

1. ✅ **art_035.json bug**：`glossaryItems` → `glossary`，已修复
2. ✅ **art_039.json 删除**：articles.json 中无 art_039，已删除对应 glossary 文件
3. ✅ **第3批 7 篇壳文章 glossary 删除**：art_040/046/047/048/049/053/055，均已删除

### 已知问题（待处理）

1. **18 个空 `glossary: []` 句子**：可能是故意占位，需确认
2. **前端 `IGlossaryItem` 无 matchWord**：当前设计不打算加，但如果未来遇到同句同字异义再考虑
3. **前端类型标注 bug**：`buildGlossarySegments` 中合并逻辑的变量类型为 `IVocabSegment[]` 而非 `IGlossarySegment[]`

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

### Phase 2: 批量处理剩余篇目

按批次逐篇梳理，每批约 13-19 篇。处理时：
1. **壳文章跳过**：仅出现在 `articles_shell.json`、不在 `articles.json` 中的选篇不标注
2. **ID 缺失跳过**：articles.json 中不存在的 ID 说明已删除，跳过即可
3. 已有的 glossary JSON 如对应壳文章/已删除 ID，直接删除

| 批次 | 范围 | 篇数 |
|------|------|------|
| 1 | art_002 ~ art_020 | 19 |
| 2 | art_021 ~ art_039 | 19 |
| 3 | art_040 ~ art_058 | 19 |
| 4 | art_060 ~ art_077 | 18 |
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
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/art_*.json`（约 180 个，不含已删除/壳文章的） | 逐篇更新 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/readme.md` | 更新统计数据 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/正文/articles.json` | 只读参考（仅处理主文章中存在的 ID） |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/正文/articles_shell.json` | 壳文章——不需要典故注释，忽略 |
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
