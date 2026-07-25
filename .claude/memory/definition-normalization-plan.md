---
name: definition-normalization-plan
description: 词书 quizItem 释义统一规范化实施计划——清理近义表述不统一+导入重复，建立标准义项表+标注规范
metadata:
  type: project
---

# 词书 quizItem 释义统一规范化

## Context

摸底发现 8 本非 readonly 词书中存在以下问题：

| 问题类型 | 数量 | 说明 |
|---------|:--:|------|
| A. 导入重复 | ~25 | 同定义 + 同出处的真正冗余 quizItem |
| B. 近义表述不统一 | 45 | 同义但文字不一致，如"进入"与"进入，与出相对"、"窄"与"窄，不宽阔"、"处于，在"与"处在、处于" |
| **合计待处理** | **~70** | |

**根因**：quizItem 的 definition 在词书编撰时直接从选篇 keyWord 的 definition 复制。不同人/不同时期的标注习惯不统一，导致同一个义项在不同文章中定义文字不一致。

**当前影响**：用户搜索一个字时，义项列表冗余混乱——明明是一个意思，却分成多条（如"处于，在"和"处在、处于"），用户体验差。

**长远风险**：不建立规范，未来新增选篇时问题持续累积。

## 核心思路

建立**"字 × 义项"标准定义表**（`definition_standard.json`）作为唯一规范源：

- 选篇 keyWord 的 definition 可自由标注（保持灵活性）
- 词书 quizItem 的 definition **不再直接从选篇复制，而是映射到标准定义**
- 未来新增选篇 → keyWord 标注者参考标准定义表，选最接近的匹配

## 分三个层面

### 层面一：清理现有数据（本次）

1. 为 8 本非 readonly 词书中的每个字，建立**标准义项清单**：去重 + 合并近义 + 统一表述
2. 用标准义项重写 quizItem 的 definition（不改 kidRef、不改选篇数据）
3. 删除导入产生的重复 quizItem（同定义 + 同出处）
4. 标准义项清单产出为知识库文件

### 层面二：修改词书导入脚本

改造 `fill_missing_quizitems.py`，quizItem 的 definition 不再直接从选篇 keyWord 取，而是：
1. 取选篇 keyWord 的 definition
2. 查标准义项表，找最接近的匹配
3. 用标准义项的 key 作为 quizItem.definition

### 层面三：建立选篇标注规范（知识库，长期）

在 `~/knowledge_library/文言文/选篇/正文/readme.md` 中增加"keyWord definition 标注规范"：
- 每个字附带**推荐的标准义项列表**（引用 `definition_standard.json`）
- 标注时从列表中选择，不自由发挥
- 无需调整已有标注，仅约束新标注

## 涉及文件

| 文件 | 改动 |
|------|------|
| `~/knowledge_library/文言文/词书/wb_*.json`（8 本非 readonly） | quizItem definition 统一 |
| `~/knowledge_library/文言文/词书/definition_standard.json` | **新建**——"字 × 义项"标准定义表 |
| `scripts/normalize_definitions.py` | **新建**——释义统一脚本 |
| `scripts/fill_missing_quizitems.py` | 改造 definition 生成逻辑引用标准表 |
| `~/knowledge_library/文言文/选篇/正文/readme.md` | 增加 definition 标注规范章节 |

## 执行步骤

### Phase 1：生成标准义项表

1. 读取 8 本词书的全部 quizItem，按字分组
2. 对每个字的义项做语义归一化（人工审核 + 脚本辅助）：
   - "进入" ← "进入，与出相对"、"进入（战场入梦）"等
   - "处于，在" ← "处在、处于"、"处于，在"
   - "用、拿" ← "介词：用、拿"、"用"
3. 产出 `definition_standard.json`，格式：

```json
{
  "以": [
    { "key": "用、拿", "aliases": ["用、拿", "介词：用、拿", "用"], "wordType": "xu" },
    { "key": "凭借、靠", "aliases": ["凭借、靠", "介词：凭借、靠"], "wordType": "xu" }
  ]
}
```

### Phase 2：修正词书 JSON

1. 遍历每本词书的每个 quizItem
2. 将 definition 映射到标准义项的 `key`
3. 删除导入重复（同 entry 内 definition 相同且 sentenceSource 相同的重复 quizItem）
4. JSON 校验 + 人工抽查

### Phase 3：导入 + 验证

1. 备份词书 JSON → 重新导入后端（幂等，8 本）
2. 搜索验证（重点查"居""乘""以""入""见"等高频问题字）
3. 学习页答题验证

### Phase 4：建立长远规范

1. 选篇正文 readme 增加"keyWord definition 标注规范"
2. `fill_missing_quizitems.py` 改造：definition 生成时查标准表映射

## 验证方法

1. JSON 语法校验：8 本词书全部 `python3 -c "import json; json.load(...)"`
2. 搜索验证：
   - 搜"居"→ 义项不再出现"处在、处于"和"处于，在"两条
   - 搜"乘"→ 义项不再出现"驾、骑"和"驾、坐"两条
   - 搜"入"→ 义项不再出现"进入"和"进入，与出相对"两条
   - 搜"见"→ 义项不再出现"看见"、"看见，看到"、"看见、见到"三条
3. 学习页答题：随机 10 个字走完整答题回路，确认 quizItem 正常展示

[[fill-missing-quizitems-summary]]
