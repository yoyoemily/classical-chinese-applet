---
name: vocab-performance-todo
description: 待办：生词本查询性能改造（实时统计 → 独立表），小英雀已有可对照方案
metadata:
  type: project
---

## 待办：生词本查询性能改造（未排期）

**问题**：生词本（`VocabularyController` / `VocabularyService`，后端 `/Users/zhutx/IdeaProjects/classical-chinese/`）目前是**实时统计**方案——每次请求从 `user_word_progress` 拉全部进度 + 全量拉 `word_book_entry` 词条在内存映射，前端逐词书遍历调用。数据量大了（单本词书学满上千词）查询与传输都会膨胀。

**影响评估**：每本词书固定 2 次查询（进度 + 全量词条），词条自带字词字段（character/pinyin 在 entry 里）无需反查 word 表，比小英雀当时（1+2N 次单查）轻，但同样是"查询时现算 + 逐本遍历"结构。

**参考方案**：小英雀已实施独立表方案可对照：新建独立生词本表，答题时 upsert（单词快照 + 四档分类冗余 + 词书名快照），查询按分类分页一次返回，前端不再遍历词书。详见小英雀记忆 [[vocab-independent-table]]（english-applet 项目 .claude/memory 外，实际在用户 auto-memory：`~/.claude/projects/-Users-zhutx-weixin-applet-space-english-applet/memory/vocab-independent-table.md`）。

**触发**：用户说"文言雀生词本改造"或相关性能优化时执行；改造前先对照小英雀方案，注意文言雀分类阈值（wrongCount≥2 判定模糊，小英雀是 ≥1）与 8 本词书的存量数据迁移策略。
