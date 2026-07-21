---
name: poetry-keywords-quality-issue
description: 全部诗词选篇 keyWords 标注质量问题——地名/典故/文化隐喻误标为 keyWords，需全量排查修复
metadata:
  type: project
---

## 诗词选篇 keyWords 标注质量问题

**发现时间**：2026-07-21（高一下补齐时）

**问题**：高一下 4 首诗词（art_172~175）36 个 keyWords 中，仅 1 个（"但"）与词书实际对应，其余 35 个如"坼""乾坤""故国""星河""门外楼头""西江""北斗""姹紫嫣红""朝飞暮卷"等均为地名、典故、文化隐喻——按 [[article-adjustment-workflow]]#3 标准，这些应该标注为 **glossary（典故注释）** 而非 **keyWords**。

**根因**：keyWords 标注时没有严格核对词书——标准流程是先查词书 `wordEntries[].character` 是否包含该字、义项是否匹配句中用法，匹配的才标 keyWord 并关联 `wordBookId`。不匹配的实词/虚词不标，地名/人名/典故/文化隐喻归 glossary。

**影响范围**：**全部诗词选篇**——不仅高一下，七上~高一上补齐的 100+ 首诗词也可能存在同类问题。需要全量排查。

## 排查范围

所有 `category: "poem"` 的选篇（含原有诗词 + 补齐诗词），按年级：

| 年级 | 文件 | 诗词数（估） | 排查状态 |
|------|------|-------------|----------|
| 七上 | articles_grade7a.json | 12 | ⚪ 待排查 |
| 七下 | articles_grade7b.json | 14 | ⚪ 待排查 |
| 八上 | articles_grade8a.json | 18 | ⚪ 待排查 |
| 八下 | articles_grade8b.json | 13 | ⚪ 待排查 |
| 九上 | articles_grade9a.json | 11 | ⚪ 待排查 |
| 九下 | articles_grade9b.json | 13 | ⚪ 待排查 |
| 高一上 | articles_grade10a.json | 12 | ⚪ 待排查 |
| 高一下 | articles_grade10b.json | 4 | ⚪ 待排查 |
| 高三 | articles_grade11a~12a.json | 3（氓、离骚、孔雀东南飞） | ⚪ 待排查 |

> 共约 100 首诗词，每首逐一核对 9 本词书。

## 修复方案

1. 导出全部诗词选篇的 keyWords 清单
2. 与 9 本词书逐一交叉核对（`wordEntries[].character` + 义项匹配）
3. 不在词书中或义项不匹配的 keyWord → 移除，有典故价值的移入 glossary
4. 在词书中且义项匹配的 → 保留 keyWord，修正 `wordBookId` 和 `definition`
5. 全量重新导入数据库（articles + glossary）

## 涉及文件

- 知识库 `articles_grade7a.json` ~ `articles_grade12a.json`（12 个分文件）
- 知识库 `art_*.json`（典故注释）
- 词书 `wb_*.json`（9 本，作为核对参照）
- `scripts/data/poems_grade*.json` + `glossaries_grade*.json`

**Why:** keyWords 与词书解耦会导致学习回路中断——学生答题时看不到这些字的 quizItem，标注无意义。

**How to apply:** 全量排查，按 [[article-adjustment-workflow]]#3 标准逐个 keyWord 核对 9 本词书，修正后重新导入。参考 [[poetry-backfill-master]] 了解各年级清单。
