---
name: definition-normalization-plan
description: 词书 quizItem 释义统一规范化实施计划——清理近义表述不统一+导入重复，建立标准义项表+标注规范
metadata:
  type: project
---

# 词书 quizItem 释义统一规范化

## Context

摸底发现 8 本非 readonly 词书中存在以下问题：

| 问题类型 | 说明 |
|---------|------|
| A. 导入重复 | 同定义 + 同出处的真正冗余 quizItem |
| B. 近义表述不统一 | 同义但文字不一致，如"进入"与"进入，与出相对"、"窄"与"窄，不宽阔"、"处于，在"与"处在、处于" |

**根因**：quizItem 的 definition 在词书编撰时直接从选篇 keyWord 的 definition 复制。不同人/不同时期的标注习惯不统一，导致同一个义项在不同文章中定义文字不一致。

**当前影响**：用户搜索一个字时，义项列表冗余混乱——明明是一个意思，却分成多条（如"处于，在"和"处在、处于"），用户体验差。

## 核心思路

建立**"字 × 义项"标准定义表**（`definition_standard.json`）作为唯一规范源：

- 选篇 keyWord 的 definition 可自由标注（保持灵活性）
- 词书 quizItem 的 definition **不再直接从选篇复制，而是映射到标准定义**
- 未来新增选篇 → keyWord 标注者参考标准定义表，选最接近的匹配

## 执行进度

### ✅ Phase 1：生成标准义项表（已完成）

- 产出：`~/knowledge_library/文言文/词书/definition_standard.json`
- 规模：229 字、826 个标准义项、243 条合并别名
- 方法：人工逐字审计 + 脚本辅助，合并原则——明确是同一义项的才合并，不确定的保持分开
- 脏数据标记：部分虚词（与、且、为、之、乎、也、于、其、则、因、所、焉、者）的 quizItem definition 含原始例句而非义项描述，已识别但暂未修复（不在本次清理范围）

### ✅ Phase 2：修正词书 JSON（已完成）

- 标准化 284 条 quizItem definition
- 删除 37 条重复 quizItem（同 entry 内同 definition + 同 sentenceSource）
- 8 本词书全部 JSON 校验通过

### ✅ Phase 3：导入后端 + 验证（已完成）

- 8 本词书全部幂等导入后端（code=0）
- 待验证：搜索高频问题字（居/乘/见/入/以/归/去/亡/善/故/道/何）+ 学习页答题回路

### ⬜ Phase 4：建立长远规范

1. `~/knowledge_library/文言文/选篇/正文/readme.md` 增加"keyWord definition 标注规范"章节，引用标准义项表
2. `scripts/fill_missing_quizitems.py` 改造：definition 生成时查标准表映射
3. 更新项目记忆（[[study-section]]、[[articles-section]]）

### ⬜ Phase 5：清理脏数据

部分虚词 quizItem 的 definition 是原始例句而非义项描述（约 55 条），需要在知识库词书 JSON 中修复后重新导入。

## 涉及文件

| 文件 | 状态 |
|------|------|
| `~/knowledge_library/文言文/词书/definition_standard.json` | ✅ 已创建（229字/826义项/243合并别名） |
| `~/knowledge_library/文言文/词书/wb_*.json`（8 本非 readonly） | ✅ 已修正并导入后端 |
| `scripts/fill_missing_quizitems.py` | ⬜ 待改造 |
| `~/knowledge_library/文言文/选篇/正文/readme.md` | ⬜ 待增加标注规范章节 |

## 后续会话恢复指引

1. 读取本文件和 [[study-section]]、[[articles-section]] 即可了解项目状态
2. 标准义项表位于 `~/knowledge_library/文言文/词书/definition_standard.json`
3. 8 本词书已标准化并导入后端（code=0），可直接进入 Phase 4
4. 词书备份文件 `*.bak` 可删除（确认无误后）

[[study-section]]
[[articles-section]]
