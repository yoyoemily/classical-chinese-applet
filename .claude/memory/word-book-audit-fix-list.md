---
name: word-book-audit-fix-list
description: 词书审核——待修复问题清单（独立于审核进度）。按🔴严重/🟡轻量分类记录，每本词书审核完成后按此模板填写。触发词：修复词书问题、fix quizItem
metadata:
  type: project
---

## 记录模板说明

每本词书审核完成后，在下方追加一个修复进度表和一个问题章节。严重度标记：

| 标记 | 含义 |
|:----:|------|
| 🔴 | 答案/数据错误，影响答题正确性 |
| 🟡 | 格式/规范问题，kidRef偏差归此类 |
| 🟢 | 壳kid无定义等不影响功能 |

---

## 中考古今异义一本通（wb_zhongkao_gujinyi）— ✅ JSON 修复完成

> ⚠️ 2026-07-31 首次"修复"直接改了数据库，JSON 数据源未动。2026-08-01 重新从 JSON 数据源修复，需用户重新导入。

### 修复进度（JSON 数据源）

| 阶段 | 问题 | 状态 | 完成日期 |
|------|------|:--:|---------|
| 阶段一 | #3 正确答案有误（6条：三/虽×2/国/微/谢） | ✅ JSON已修复 | 2026-08-01 |
| 阶段二 | #4+#5 选项/干扰项含答案（4条+去重同步） | ✅ JSON已修复 | 2026-08-01 |
| 阶段三 | #8 kidRef 指向错误（8条：3条改指+5条NULL） | ✅ JSON已修复 | 2026-08-01 |
| 阶段四 | 🟡 轻量问题（9条选项+1条译文+1条kidRef壳→非壳） | ✅ JSON已修复 | 2026-08-01 |

### 修复方案明细

| # | quizItem | 修复内容 |
|---|----------|---------|
| 1 | s_c_0556 三 | def→"第三次（序数）"，标准表新增义项 |
| 2 | s_c_0577 虽 | def→"即使、纵然"，dist[0]"即使，纵然"→"虽然" |
| 3 | s_c_0578 虽 | def→"即使、纵然"，kidRef→NULL（句不在任何文章中） |
| 4 | s_c_0597 国 | def→"国都，京城"，dist[0]"国都，都城"→"国家" |
| 5 | s_c_0598 微 | def→"如果没有，若非"，dist全面替换，标准表新增义项 |
| 6 | s_c_0614 谢 | def→"道歉，请罪"，dist[0]"道歉"→"感谢" |
| 7 | s_c_0564 走 | kidRef→kw_art_025_s03_走_0（口技），articles 中该 keyWord def 从"逃跑"→"古代指疾行，即跑" |
| 8 | s_c_0580 奔 | kidRef→kw_art_038_s01_奔_0（与朱元思书） |
| 9 | s_c_0585 曾 | kidRef→kw_art_023_s21_曾_0（核舟记），def→"表意外，竟然，居然，简直" |
| 10 | s_c_0554/0565/0570/0578/0591 共5条 | kidRef→NULL（句不在任何文章 sentence 中） |
| 11 | s_c_0552/0555/0560/0562/0590/0600/1459/1460 共8条 | 干扰项去近义重复 |
| 12 | s_c_1459 但 | 译文→"只是感到离别已久"，articles 同步修改 |
| 13 | s_c_0612 池 | kidRef→kw_art_030_s02_池_0（非壳文章得道多助） |

### 涉及文件

- `definition_standard.json`：新增"三"义项1条、"微"义项1条
- `articles_grade7b.json`：kw_art_025_s03_走_0 def 修正
- `articles_grade8a.json`：kw_art_017_s01_虽_0 def 修正 + art_119 s03 译文修正
- `articles_grade9a.json`：kw_art_001_s03_国_0 / kw_art_001_s05_微_0 def 修正
- `articles_grade9b.json`：kw_art_006_s03_三_0 / kw_art_042_s05_谢_0 def 修正
- `wb_zhongkao_gujinyi.json`：共 22 条 quizItem 修改

### 导入顺序

1. 先导入 articles（全量）
2. 再导入词书 wb_zhongkao_gujinyi

### 保持现状

| # | quizItem | 原因 |
|---|----------|------|
| — | s_c_1463 是 def="指示代词：这" | 存疑，保持现状

---

## 相关联记忆

[[fix-guide]]
[[word-book-audit]]
[[word-book-audit-table-enforcement]]
[[never-edit-database-directly]]
