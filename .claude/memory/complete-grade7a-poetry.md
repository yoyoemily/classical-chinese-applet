---
name: complete-grade7a-poetry
description: 七上诗词补齐任务清单——11首缺失诗词的逐首补充计划
metadata:
  type: project
---

## 七上诗词补齐任务

### 背景

articles.json 拆分为 12 个分文件后，七上 (`articles_grade7a.json`) 当前 8 篇：7 篇文言/论说文 + 1 首诗词（观沧海 art_052）。按部编版教材大纲，七上应包含 12 首诗词，需新增 **11 首**。

### 当前已有
- ✅ art_052: 观沧海 (曹操, poem)

### 需新增 11 首（按教材顺序）

| # | 篇名 | 作者 | 朝代 | 类型 | 课内/诵读 |
|---|------|------|------|------|-----------|
| 1 | 闻王昌龄左迁龙标遥有此寄 | 李白 | 唐代 | poem | 课内 |
| 2 | 次北固山下 | 王湾 | 唐代 | poem | 课内 |
| 3 | 天净沙·秋思 | 马致远 | 元代 | poem | 课内 |
| 4 | 峨眉山月歌 | 李白 | 唐代 | poem | 课外诵读 |
| 5 | 江南逢李龟年 | 杜甫 | 唐代 | poem | 课外诵读 |
| 6 | 行军九日思长安故园 | 岑参 | 唐代 | poem | 课外诵读 |
| 7 | 夜上受降城闻笛 | 李益 | 唐代 | poem | 课外诵读 |
| 8 | 秋词（其一） | 刘禹锡 | 唐代 | poem | 课外诵读 |
| 9 | 夜雨寄北 | 李商隐 | 唐代 | poem | 课外诵读 |
| 10 | 十一月四日风雨大作（其二） | 陆游 | 南宋 | poem | 课外诵读 |
| 11 | 潼关 | 谭嗣同 | 清代 | poem | 课外诵读 |

### 每首操作流程

按 [[article-adjustment-workflow]] 严格执行：

1. **分配 ID**：从 art_086 开始，逐个分配新的 art_XXX 编号
2. **正文+切句**：写入 `articles_grade7a.json`（textbook: grade7a, category: poem）
3. **逐句译文**：每句原文→白话译文
4. **keyWords 标注**：从 8 本打卡型词书匹配，含 kid/wordType/wordBookId
5. **典故注释**：新建知识库 `art_XXX.json`（人名/地名/典故），导入 `POST /api/admin/import/glossary/art_XXX`
6. **创作背景**：补 `background` 字段（约 100 字）
7. **导入数据库**：拼接分文件后 `POST /api/admin/import/articles`
8. **完成后检查清单**：见 [[article-adjustment-workflow]]#8

### ID 分配方案

从 art_086 开始顺序分配（当前最大为 art_085），11 个新 ID：art_086 ~ art_096。

### 词书关联

这 11 首诗词属于初中阶段，关联词书以 `wb_zhongkao_*`（中考）为主。keyWords 标注时从 8 本打卡型词书匹配（不含 wb_function_words）。

[[articles-section]]
[[article-adjustment-workflow]]
