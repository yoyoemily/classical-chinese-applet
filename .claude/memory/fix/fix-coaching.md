---
name: fix-coaching
description: 修复教练模式——用户自己动手修，Claude 只指导+审 SOP；已过 A/B/D 类问题，含进度与已验证后端事实
metadata:
  type: project
---

# 修复教练模式（2026-08-28 起）

## 工作模式

项目已上线，日常工作是用户反馈的错误修复。用户要**自己动手**修，我的角色是教练：

- 用户抛出一个问题类型（真实或假设），我按 [[fix-guide]] 给分步指导，用户手动执行修改
- 用户会把自己的 SOP 记录在知识库（Obsidian），我负责审阅、补漏
- **不要代办修改**，只引导；与用户确认过的事实才允许写进 fix-guide
- 教学固定示例：「前人之述备矣·备」= quizItem `s_c_0005`（`wb_zhongkao_shixu.json`，kidRef `kw_art_001_s01_备_0` → art_001《岳阳楼记》）

## 进度（已过的问题类型）

| 类型 | 类别 | 要点 |
|------|------|------|
| 正确答案错误 | B 类 | 查标准表→有则逐字原文复制 / 无则确认后扩充；双改；先导 articles 后导词书；新正确释义必须移出 distractors，用旧错误释义补位 |
| 干扰项错误 | A 类 | 只改词书 distractors；取材优先级 ①标准表同字其他义项 ②形近字释义 ③微殊表述（已写入 fix-guide ④⑤） |
| 译文错误 | D 类 | 双改；选篇 sentence 是大段、quizItem 是小句，只改对应小句的那截；译文不增删断句标点 |
| 出处错误 | D/C 类 | 先诊断：kidRef 指的文章里有没有这句话 → 三种情形（kidRef 错指 / 文章元数据错 / 词书 sentenceSource 手误） |
| 未过 | ④⑤⑥⑦⑧⑨⑩ | 选项重复、sentenceText 不完整、targetWord 不一致、kidRef 错指、句子不存在、漏收例句 |

## 本次会话验证的关键事实（后端代码已核实）

- **词书导入后端行为**：先删后插（`DataImportService.importWordBook` → `deleteWordBookData` → 重建），quiz_item 全部字段（definition/sentenceTranslation/sentenceSource…）直读词书 JSON，**不交叉拷贝** → 任何 quizItem 字段修改都必须手动改词书 JSON，不存在"重导自动同步"
- `definition_standard.json` 后端完全不读（全工程无引用），纯维护规范文档，扩充后无需导入
- 导入脚本位于 `~/IdeaProjects/classical-chinese/`：`import_article.sh`（`--all` / `art_xxx` 单篇 / `prd` 正式环境）、`import_wordbook.sh`（`--all` / `wb_xxx` 单本 / `prd`）
- kid 的 `sXX` 编号与 sentences 数组下标**可能不对齐**（句子增删移位后），定位必须按完整 kid 字符串 grep，不能按编号取下标

关联 [[fix-guide]] [[backend-infrastructure]]
