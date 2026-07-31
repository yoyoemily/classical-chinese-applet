---
name: word-book-audit
description: 8本打卡型词书逐字地毯式审核——审核方法论+进度跟踪，9点检查流程。每个字输出完整表格。触发词：逐字审核、打卡字词审核、词书地毯式排查
metadata:
  type: project
---

## 工作范式（重启会话必读）

### 取数：一条命令搞定

```bash
bash .claude/scripts/audit_one_char.sh <entry_id>
# 示例：bash .claude/scripts/audit_one_char.sh wb_c_001
```

依赖：Docker MySQL 容器 `mysql-8.4` 必须在运行。脚本输出 5 块数据：
1. Entry 基本信息（字、拼音、词书）
2. 全部 quizItem + 干扰项
3. kidRef 交叉验证
4. 同字全部 keyword（辅助核验句子出处）
5. **选项重复自动检测**

### 选项重复（检查点④）三级判定

| 级别 | 定义 | 示例 | 严重度 |
|:---:|------|------|:---:|
| 完全重复 | 两个选项文字完全一致 | "安定，安稳" vs "安定，安稳" | 🔴 |
| 包含性重复 | 一个选项的核心义项被另一选项完全覆盖 | "完，没有了" vs "完、没有了（杨花已全部飘落）" | 🔴 |
| 近义重复 | 两选项义项不同但高度接近，上下文无法区分 | "安定，安稳" vs "平安" | 🟡 |

**不视为重复**：使动/意动/为动 vs 非使动。

### 9 点检查

| # | 检查点 |
|---|--------|
| ① | 例句出处是否正确 |
| ② | 例句译文是否正确 |
| ③ | 正确答案是否有误（def vs 句中实际义项） |
| ④ | 选项之间是否重复 |
| ⑤ | 干扰项是否包含正确答案 |
| ⑥ | sentenceText 是否完整可读 |
| ⑦ | targetWord 与 entry.character 是否一致 |
| ⑧ | kidRef 是否存在+指向句子是否匹配sentenceSource |
| ⑨ | 非壳文章：sentence需在article_sentence中。壳文章标"—" |

> **壳文章**：词书 keyWords 的句子容器，非用户可读。详见 [[articles-section]]#壳文章。

### 严重度

| 标记 | 含义 |
|:----:|------|
| 🔴 | 答案/数据错误，影响答题正确性 |
| 🟡 | 格式/规范问题，kidRef偏差归此类 |
| 🟢 | 壳kid无定义等不影响功能 |

### 工作流程

1. 在 audit 文件中更新词书列表进度表（下方）
2. 逐字执行 `audit_one_char.sh`，9 点检查
3. 发现的问题按 🔴/🟡/🟢 分类记录到 [[word-book-audit-fix-list]]
4. 修复完成后在 fix-list 中标记阶段完成，在本文件统计摘要

---

## 审核进度

### 词书列表

| # | 词书 | ID | 字数 | 状态 |
|---|------|----|:---:|:---:|
| 1 | 中考实词虚词一本通 | wb_zhongkao_shixu | 168 | ✅ 已完成 |
| 2 | 中考通假字一本通 | wb_zhongkao_tongjia | 35 | 待开始 |
| 3 | 中考古今异义一本通 | wb_zhongkao_gujinyi | 50 | 待开始 |
| 4 | 中考词类活用一本通 | wb_zhongkao_cileihuoyong | 26 | 待开始 |
| 5 | 高考实词虚词一本通 | wb_gaokao_shixu | 135 | 待开始 |
| 6 | 高考通假字一本通 | wb_gaokao_tongjia | 53 | 待开始 |
| 7 | 高考古今异义一本通 | wb_gaokao_gujinyi | 50 | 待开始 |
| 8 | 高考词类活用一本通 | wb_gaokao_cileihuoyong | 30 | 待开始 |

### 词书 1：中考实词虚词一本通 — ✅ 168/168 完成

**审核时间**：2026-07-30

**最终统计**：
- 🔴 #3 正确答案有误：59 处
- 🔴 #4 选项重复：8 处
- 🔴 #5 干扰项包含答案：8 处
- 🔴 #7 targetWord 不一致：1 处
- 🟡🟢 #8 kidRef 问题：约 90 处
- ✅ 9/9 全部通过：约 30 字

全部问题已修复，详见 [[word-book-audit-fix-list]]。

### 词书 2：中考通假字一本通 — 待开始

（35 字，identify_first 模式。按上方工作范式逐字执行。）

---

## 相关联记忆

[[word-book-audit-fix-list]]
[[quiz-item-definition-fix]]
[[article-keyword-correction]]
[[study-section]]
[[articles-section]]
