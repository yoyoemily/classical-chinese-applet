---
name: quizitem-id-invariance-rule
description: 词书 quizItem ID 不可变性原则——删除不复用，新增用新ID
metadata:
  type: project
---

# quizItem ID 不可变性原则

词书 JSON 中 quizItem 的 `id`（如 `s_c_0001`）由 JSON 硬编码，后端 `DataImportService.importWordBook()` 的 INSERT 语句直接取 `qi.getId()` 写入 `quiz_item.id`，不走数据库 auto-increment。

## 引用关系

```
quiz_item.id  ←──  study_mistake_sentence.quiz_item_id  (错题本句子)
quiz_item.id  ←──  user_answer_history.quiz_item_id     (答题历史→ProgressService判断新学/复习)
quiz_item.id  ←──  quiz_distractor.quiz_item_id         (干扰项，幂等重导无影响)
```

## 规则

1. **已有 quizItem 的 id 永远不变**——修改 definition、sentenceText 等字段时保持 id 不变，重新导入后 FK 引用不丢失
2. **删除 quizItem 时，其 id 永久退役**——不得在新 quizItem 中复用已删除的 id
3. **新增 quizItem 时，生成全新的 id**——使用下一个可用序号（如当前最大 `s_c_1365`，新 ID 从 `s_c_1467` 起）
4. **SQL 导入逻辑不可改为 auto-increment**——历史数据依赖 ID 匹配，改为自增会断裂全部引用

## 检查清单

- 删除词书 JSON 中的 quizItem 前，确认是否有用户数据引用（错题本/答题历史）
- 新增 quizItem 时，确认新 ID 在所有 8 本词书中全局唯一
- 重新导入前在 JSON 中 grep 确认无重复 ID

**Why:** quiz_item.id 被 `study_mistake_sentence` 和 `user_answer_history` 两个用户数据表 FK 引用。ID 复用会导致 A 词的错题记录错误地指向 B 词的 quizItem，用户数据污染不可逆。

**How to apply:**
- Phase 3/4 只改 definition 不动 id
- 后续任何词书编辑工作都必须遵守此原则
- 当前 quizItem ID 最大值为 `s_c_1468`（wb_gaokao_tongjia.json），新增 ID 从 `s_c_1469` 起
