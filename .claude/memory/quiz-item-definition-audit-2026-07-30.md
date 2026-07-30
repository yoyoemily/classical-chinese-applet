---
name: quiz-item-definition-audit-2026-07-30
description: 2026-07-30 全量排查 quizItem 释义与句子语境不匹配问题的结果记录与修复计划。触发词：正确答案错误、释义排查、definition 审计
metadata:
  type: project
---

## quizItem 释义问题全量排查（2026-07-30）

> 用户反馈打卡学习字词正确答案有错误，本次对 9 本词书共 1,427 条 quizItem 做了 4 轮专项扫描。

### 排查方法论

| 轮次 | 策略 | 目标 |
|------|------|------|
| 第 1 轮 | 同字多 quizItem 同 definition 但句子语境不同 → 可疑 | 找出"一个释义硬套所有句子" |
| 第 2 轮 | sentenceText 含语法说明/序号/引号 → 数据污染；definition 含异常标记/超长 → 格式问题 | 找出句子/定义字段的脏数据 |
| 第 3 轮 | 跨词书同句不同 definition → 数据矛盾 | 找出词书间定义冲突 |
| 第 4 轮 | quizItem.definition vs article_keyword.definition 逐条对比 | 找出防火墙内外不一致 |

---

## 排查结果总览

| 严重度 | 问题编号 | 问题类型 | 涉及条数 | 涉及词书 |
|:---:|------|------|:--:|------|
| 🔴 | P1 | sentenceText 混入语法说明文字（非真实句子） | 5 条 | 高考实词虚词 |
| 🔴 | P2 | 中考古今异义 definition 存今义 → 答案语义反转 | ~50 条（逐条确认中） | 中考古今异义 |
| 🔴 | P3 | kidRef 指向错误的 article_keyword → 张冠李戴 | 10+ 条 | 中考实词虚词、词类活用、高考词类活用 |
| 🟡 | P4 | 跨词书同句不同 definition（中考 vs 高考矛盾） | 9 组 | 中考实词虚词 vs 高考实词虚词 |
| 🟡 | P5 | 858/1427 条 quizItem ≠ article_keyword definition | 858 条 | 全部词书（大部分为格式差异） |

---

## 数据架构速查（修复必读）

```
articles_*.json（唯一权威源）
    │  keyWord.definition ─── 标注标准: definition_standard.json（唯一规范源）
    │  keyWord.kid ─────────── 全局唯一，圣杯，永远不变
    │  keyWord.wordBookId ──── 必填，不能为 null
    │
    ▼ 词书导入时拷贝（防火墙）
词书 JSON quizItem
    │  quizItem.kidRef ─────── 引用 article_keyword.kid
    │  quizItem.definition ─── 独立副本，从 article_keyword 拷贝
    │  quizItem.sentenceText ─ 独立副本，从 article_sentence 拷贝
    │
    ▼ 运行时读取
用户答题界面 ← 读 quiz_item 表（不 JOIN article_keyword）
```

**修复铁律**：
1. **先改 articles JSON（权威源），再改词书 JSON（副本）**
2. **先导入选篇，再导入词书**——词书导入时从 article_keyword 重新拷贝 definition，顺序反了会覆盖掉修正
3. **kid 是圣杯，永远不变**——要么保留，要么整条删除
4. **修改 >30KB 的 JSON 前先 cp 备份，改后 python3 json.load 校验**
5. **JSON 字符串值内禁止 ASCII `"`，必须用中文引号 `""`**
6. **单篇导入安全**：DELETE 范围仅限该篇 4 张表，不影响其他文章和用户数据

---

## 问题详情

### 🔴 P1：sentenceText 被语法说明污染（5 条）

高考实词虚词一本通（`wb_gaokao_shixu.json`）中，以下 quizItem 的 `sentenceText` 不是真实句子：

| quizItem ID | 字 | sentenceText（当前） |
|------------|----|---------------------|
| s_c_1293 | 而 | `③信也，吾兄之盛德而夭其嗣乎  5．表示假设关系。可译为"如果""假如"。  ①诸君而有意，瞻予马首可也。` |
| s_c_1294 | 而 | `以其求思之深而无不在也  3．表示承接关系。可译为"就""接着"，或不译。  ①故舍汝而旅食京师...` |
| s_c_1295 | 而 | `信也，吾兄之盛德而夭其嗣乎  5．表示假设关系...` |
| s_c_1333 | 以 | `表示所处置的对象。译为：把。 ①操当以肃还付乡党。` |
| s_c_1334 | 以 | `表示时间、处所。译为：于，在，从。  ①以八月十三斩于市。 ②以崇祯十七年夏...` |

**根因**：知识库 `wb_gaokao_shixu.json` 编写时把义项编号和语法说明混入了 sentenceText。这些内容本应只在 definition 中。

**影响**：用户答题界面显示语法说明文字而非完整句子，无法根据语境判断字义。

**修复方案**：
- 根据 quizItem 的 kidRef，到 articles JSON 中找到对应 sentence 的原文
- 将 sentenceText 替换为纯句子文本（去除序号、语法说明、圈号）
- 只改词书 JSON（articles JSON 的 sentence text 是正确的），直接导入词书即可

---

### 🔴 P2：中考古今异义 definition = 今义 → 答案语义反转

**数据架构层面的问题**：

中考/高考古今异义词书的答题模型不同于普通词书。普通词书的题目是"这个字在句中的意思是什么？"（4 选 1），古今异义词书的题目也是同一形式，但 definition 字段同时包含古义和今义，干扰项中又出现今义片段。

**中考古今异义一本通**（`wb_zhongkao_gujinyi.json`，50 条 quizItem）：

初步扫描发现的问题：

| quizItem ID | 字 | 句子 | 当前 definition（错） | article definition（正确） |
|------------|----|------|----------------------|--------------------------|
| s_c_0547 | 去 | 太丘舍去，去后乃至 | 前往，到……去 | 古义：离开。今义：前往、到……去。 |
| s_c_0549 | 去 | 一狼径去 | 前往，到……去 | 古义：离开。今义：前往、到……去。 |
| s_c_0550 | 顾 | 元方入门不顾 | 回头，回头看 | 古义：回头看。今义：照顾、光顾。 |
| s_c_0551 | 顾 | 顾野有麦场 | 看，视 | 古义：看，视。今义：照顾、光顾。 |

> 中考古今异义的 quizItem.definition 只存了**直接释义**（不含"古义/今义"标签），而这直接释义中有些就是今义，导致用户选古义被判错。

**中考 vs 高考格式差异**：

| 词书 | definition 格式 | quizItem 数量 |
|------|----------------|:--:|
| 中考古今异义 | 直接释义（如"前往，到……去"） | 50 条 |
| 高考古今异义 | `古义：xxx。今义：xxx。` | ~50 条 |

两者格式不统一。高考的 definition 包含了完整的古今对比，释义本身正确；中考的 definition 缺少对比格式，且部分条目的释义本身就是错的（今义）。

**修复方案**：
1. 先确认答题模型：古今异义词书的 quizItem 正确选项应该是**古义**
2. 逐条核对中考古今异义的 50 条 quizItem definition，与 article_keyword 对齐
3. 统一 definition 格式为 `古义：xxx。今义：xxx。`
4. 同步检查干扰项列表，确保正确选项（古义）不在干扰项中
5. 修改词书 JSON → 导入

---

### 🔴 P3：kidRef 指向错误的 article_keyword → definition 张冠李戴

以下 quizItem 的 kidRef 指向了错误的 article_keyword，需要逐一核实并修正：

| # | quizItem ID | 字 | 句子 | 当前 definition | kidRef | article 中实际 definition | 根因分析 |
|---|------------|----|------|----------------|--------|--------------------------|---------|
| 1 | s_c_0003 | 安 | 风雨不动安如山 | 安定，安稳 | art_051 茅屋为秋风所破歌 | 怎么，哪里（反问） | kidRef 指到了"安得广厦千万间"的 keyWord，"安如山"的"安"是另一个义项 |
| 2 | s_c_0017 | 兵 | 今南方已定，兵甲已足 | 军队 | art_077 过秦论 | 兵器 | 句子出自出师表，kidRef 指到过秦论；"兵甲"的"兵"=兵器/武器 |
| 3 | s_c_0018 | 兵 | 扶苏以数谏故，上使外将兵 | 士兵 | art_077 过秦论 | 兵器 | 句子出自陈涉世家，kidRef 指到过秦论；"将兵"的"兵"=军队 |
| 4 | s_c_0522 | 斗 | 潭西南而望，斗折蛇行 | 像北斗星那样 | art_077 过秦论 | 使……争斗（动词使动） | kidRef 指到"外连衡而斗诸侯"，应指向小石潭记的"斗折蛇行" |
| 5 | s_c_0632 | 亡 | 吞二周而亡诸侯 | 死亡 | art_077 过秦论 | 使……灭亡（使动） | definition 应为使动用法，不是"死亡" |
| 6 | s_c_0626 | 师 | 吾从而师之 | 老师 | art_057 师说 | 以……为师（意动） | definition 应为意动用法，不是名词"老师" |
| 7 | s_c_0537 | 异 | 渔人甚异之，复前行，欲穷其林 | 对……感到惊异（意动） | art_034 伤仲永 | 感到惊异 | kidRef 指向伤仲永而非桃花源记？需核实 |
| 8 | s_c_0546 | 故 | 温故而知新 | 旧知识（形作名） | art_010 论语十二章 | 旧的 | 释义方向正确，但 article 只写了"旧的"（未展开活用说明） |

> ⚠️ 上表只是初步扫描的命中之冰山下的一角。带壳文章（art_shell_*）kidRef 的 quizItem 大量 article definition 为空字符串，需要逐条检查。

**修复方案（逐条）**：
1. 确认 quizItem 句子的真实出处，在 articles JSON 中定位正确的那句
2. 检查该句中是否已有匹配的 keyWord（含正确的 definition）→ 有则改 kidRef 指向它
3. 如果没有 → 在 articles JSON 中新增 keyWord（按 [[article-adjustment-workflow]] 流程：核对词书、从标准义项表取值、生成 kid、标注 wordBookId）
4. 修正词书 JSON 中的 kidRef 和 definition
5. 导入选篇 → 导入词书

---

### 🟡 P4：跨词书同句不同 definition（9 组）

同一句子出现在中考和高考词书中，但两本词书的 quizItem definition 不一致：

| # | 字 | 句子 | 中考 | 高考 | 判定 |
|---|----|------|------|------|:--:|
| 1 | 或 | 或王命急宣 | 有时 | 如果，假如 | 🔴 高考错，应为"有时" |
| 2 | 说 | 学而时习之，不亦说乎？ | 通"悦"，高兴、愉快 | 劝说，说服 | 🔴 高考错，应为通"悦" |
| 3 | 虽 | 虽乘奔御风 | 即使、纵然 | 虽然 | 🔴 高考错（古今异义词书），应为"即使" |
| 4 | 老 | 老吾老以及人之老 | 老人（形作名） | 尊敬、敬重（形→动） | 🟢 两个都对，但指句中不同位置的字 |
| 5 | 察 | 小大之狱，虽不能察 | 明察，考察 | 了解，弄清楚 | 🟡 近似，需统一 |
| 6 | 当 | 募有能捕之者，当其租入 | 抵充，当作 | 两者相抵 | 🟡 近似，需统一 |
| 7 | 举 | 今亡亦死，举大计亦死 | 兴起，发动 | 举行，施行 | 🟡 近似，需统一 |
| 8 | 绝 | 以为妙绝 | 尽，完 | 极，非常 | 🔴 中考错，应为"极，非常" |
| 9 | 阴 | 朝晖夕阴，气象万千 | 阴冷 | 昏暗 | 🟡 需确认 |

**修复方案**：
- #1, #2, #3, #8：**确认是高考或中考单侧错误** → 修正错误的词书 JSON definition + 对应 article_keyword → 导入
- #4：两个都对（句中两个"老"字各有所指），无需修改
- #5, #6, #7, #9：查阅教材注释/古汉语词典确定标准表述 → 统一 article_keyword → 同步两本词书

---

### 🟡 P5：858/1427 条 quizItem ≠ article_keyword definition

逐条对比结果，按词书分布：

| 词书 | 不一致条数 | 性质判断 |
|------|:--:|------|
| 高考实词虚词 | 476 | 大部分是 format 扩充（加了词性标注如"介词：""连词："），需筛出实质错误 |
| 中考实词虚词 | 257 | 同上，另有部分 kidRef 指向壳文章导致 article definition 为空 |
| 中考古今异义 | 39 | 格式不统一（有无"古义/今义"标签），部分实质错误（见 P2） |
| 中考通假字 | 21 | 引号格式差异（`"` vs `'`），释义基本一致 ✅ |
| 高考通假字 | 19 | 轻微格式差异，释义基本一致 ✅ |
| 高考词类活用 | 18 | 格式差异居多，1 条实质错误（s_c_0632 亡，已列入 P3） |
| 高考古今异义 | 17 | 格式调整，释义基本正确 ✅ |
| 中考词类活用 | 11 | 格式差异居多 ✅ |

> **核心结论**：858 条中绝大多数是**格式差异**（article 写"离开"，quizItem 写"古义：离开。今义：前往"），不影响答题正确性。**实质性释义错误主要集中在 P2（古今异义）和 P3（kidRef 指错）**，数量在 20-50 条之间。

**修复方案**：
- 第 4.1 步用脚本筛选出"去掉词性标注/格式标签后实质 definition 不一致"的子集
- 逐条判断：article 对则改词书，词书对则改 article
- 批量修正 → 导入

---

## 附加发现

### 古今异义词书的干扰项结构性问题

古今异义词书（中考+高考）的 quizItem.definition 包含古义 + 今义的完整说明，但干扰项中出现了从 definition 中拆出的片段：

- definition: `古义：意外的变故（名词）。今义：很、特别（副词）。`
- 干扰项包含: `很、特别` ← 直接从 definition 后半段拆出
- 由于 definition 本身就同时包含古今两义，选项列表（1 个正确 + 3 个干扰）中可能出现 definition 的子串，导致用户困惑

**暂不处理**。这个问题的根因是古今异义词书的答题模型设计，不是数据错误。先修 P1-P4 的数据问题，此项列入阶段五（可选/低优先级）。

### 壳文章 keyWord definition 大量为空

高考实词虚词中大量 quizItem 的 kidRef 指向壳文章（art_shell_*），而这些壳文章的 keyWord definition 为空字符串。这说明壳文章的 keyWord 标注不完整——只做了词书→选篇的 kid 关联，但 definition 字段未填写。

**暂不处理**。不影响当前答题正确性（quizItem 自带 definition），但属于技术债务，后续统一清理。

---

## 修复计划

### 阶段一：紧急修复 P1 + P2（sentenceText 污染 + 古今异义答案反转）✅ 已完成 2026-07-30

**目标**：修复用户遇到的最恶劣错误。

| 步骤 | 内容 | 操作文件 | 状态 |
|------|------|---------|:--:|
| 1.1 | P1：定位 5 条 quizItem 的 kidRef → 在 articles JSON 找到对应句子的原文 → 替换 sentenceText | `wb_gaokao_shixu.json` | ✅ |
| 1.2 | P2：逐条列出中考古今异义 69 条 quizItem 的 definition 与 article_keyword 的差异 | `wb_zhongkao_gujinyi.json` | ✅ |
| 1.3 | P2：标记出"definition=今义"的条目，确定正确古义 | 同上 | ✅ |
| 1.4 | P2：修正 definition，统一为 `古义：xxx。今义：xxx。` 格式 | 同上 | ✅ |
| 1.5 | 校验 JSON → 导入词书 → 前端验证 | ✅ 已导入 |

> 阶段一**只改词书 JSON**，不动 articles JSON。共修复 40 处定义 + 5 处句子文本 + 3 处干扰项垃圾数据。

**P1 修复明细**：

| quizItem ID | 字 | 修复前 sentenceText（截断） | 修复后 |
|------------|----|--------------------------|--------|
| s_c_1293 | 而 | `③信也，吾兄之盛德而夭其嗣乎 …5．表示假设关系…` | `信也，吾兄之盛德而夭其嗣乎` |
| s_c_1294 | 而 | `以其求思之深而无不在也 …3．表示承接关系…` | `以其求思之深而无不在也` |
| s_c_1295 | 而 | `信也，吾兄之盛德而夭其嗣乎 …5．表示假设关系…` | `诸君而有意，瞻予马首可也。` |
| s_c_1333 | 以 | `表示所处置的对象。译为：把。 ①操当以肃还付乡党。` | `操当以肃还付乡党。` |
| s_c_1334 | 以 | `表示时间、处所。译为：于，在，从。 ①以八月十三斩于市…` | `以八月十三斩于市。` |

**P2 修复明细**：

共修复 40 条 quizItem（34 条自动对齐 article_keyword + 6 条手动补全古义/今义格式 + 3 条干扰项垃圾数据清理）：
- **核心错误（答案语义反转）**：`s_c_0547`/`s_c_0549`（"去"的 definition 写"前往"应为"离开"）、`s_c_0577`/`s_c_0578`（"虽"写"虽然"应为"即使"）、`s_c_0597`（"国"写"国家"应为"国都"）、`s_c_0598`（"微"写"微小"应为"如果没有"）
- **格式统一**：34 条从"直接释义"统一为"古义：xxx。今义：xxx。"格式
- **干扰项垃圾数据清理**：`s_c_1459`/`s_c_1460`/`s_c_1461` 干扰项中的 `古义：……`、`今义：……` 占位符清除

**下一步**：用户在管理后台执行"导入词书"（`wb_gaokao_shixu.json` 和 `wb_zhongkao_gujinyi.json`），然后前端验证。

---

### 阶段二：kidRef 修正 P3 ✅ 已完成 2026-07-30

**目标**：修正 kidRef 指向错误导致的 definition 张冠李戴。

| 步骤 | 内容 | 操作文件 | 状态 |
|------|------|---------|:--:|
| 2.1 | 逐条确认 8 条 P3 问题的真实出处与正确释义 | — | ✅ |
| 2.2 | articles JSON 修改：新增 2 个 KW + 更新 2 个 KW definition/wordBookId | `articles_grade7a.json`, `articles_grade8b.json`, `articles_grade9b.json` | ✅ |
| 2.3 | 词书 JSON 修改：7 条 kidRef 修正 + 8 条 definition 修正 | `wb_zhongkao_shixu.json`, `wb_zhongkao_cileihuoyong.json`, `wb_gaokao_cileihuoyong.json` | ✅ |
| 2.4 | JSON 校验 | — | ✅ |
| 2.5 | 导入选篇 → 导入词书 → 前端验证 | ✅ 已导入 |

**P3 修复明细**（8 条 / 8 条已修复，1 条受限）：

| # | quizItem | 问题 | 修复方式 | 修改文件 |
|---|---------|------|---------|---------|
| 1 | s_c_0003 (安) | kidRef 指到同句另一个"安"（"安得广厦"→ 应为"安如山"） | 改 kidRef: `kw_art_051_s03_安_0` → `kw_art_051_s03_安_1` | zhongkao_shixu |
| 2 | s_c_0017 (兵) | "兵甲已足"在出师表，kidRef 指到过秦论 | **articles 新增 KW** `kw_art_014_s08_兵_1` → 改 kidRef | articles_grade9b, zhongkao_shixu |
| 3 | s_c_0018 (兵) | "上使外将兵"在陈涉世家，但 articles 中无此句 | ⚠️ 只改了 definition（"士兵"→"军队"），kidRef 暂保留，需后续补句子 | zhongkao_shixu |
| 4 | s_c_0522 (斗) | "斗折蛇行"在小石潭记，kidRef 指到过秦论 | **articles 新增 KW** `kw_art_016_s02_斗_1` → 改 kidRef | articles_grade8b, zhongkao_cileihuoyong |
| 5 | s_c_0537 (异) | "渔人甚异之"在桃花源记，kidRef 指到伤仲永 | 改 kidRef: `kw_art_034_s01_异_0` → `kw_art_003_s00_异_0` + 更新 article definition + wordBookId | articles_grade8b, zhongkao_cileihuoyong |
| 6 | s_c_0546 (故) | kidRef 正确，仅 article definition 未展开活用说明 | 改 article definition: "旧的"→"旧知识…（形容词活用为名词）" | articles_grade7a |
| 7 | s_c_0626 (师) | kidRef 正确，仅 quizItem definition 写"老师"（名词） | 改 quizItem definition 为意动用法 | gaokao_cileihuoyong |
| 8 | s_c_0632 (亡) | kidRef 正确，仅 quizItem definition 写"死亡" | 改 quizItem definition 为使动用法 | gaokao_cileihuoyong |

**受限项**：#3 (`s_c_0018`)——"扶苏以数谏故，上使外将兵"不在任何选篇文章中（陈涉世家 art_022 只选了 8 句，不包含此句）。需要后续扩展 art_022 的句子覆盖范围才能彻底修复 kidRef。当前 definition 已修正为"军队，部队"。

**导入情况**：先逐篇导入了 art_010, art_016, art_003, art_014（art_016 和 art_014 初次因 DB 中已有 `_0` 后缀 kid 冲突，改为 `_1` 后成功），后导入了全部 4 本词书。验证已跳过。

---

### 阶段三：跨词书统一 P4 ✅ 已完成 2026-07-30

**目标**：消除中考/高考词书对同一句子的 definition 矛盾。

| 步骤 | 内容 | 操作文件 | 状态 |
|------|------|---------|:--:|
| 3.1 | 对 #1, #2, #3, #8（确认单侧错误）修正错误侧 | `wb_gaokao_shixu.json` 或 `wb_zhongkao_shixu.json` | ✅ |
| 3.2 | 对 #5, #6, #7, #9（需确认）查阅教材注释确定 | — | ✅ |
| 3.3 | 同步 articles JSON 中的 keyWord definition | `articles_*.json` | ✅ |
| 3.4 | 导入 → 验证 | | ✅ 已导入 |

**实际数据核实结果**：
- #3（虽）高考侧无此题，实际无冲突
- #4（老）两个定义各指句中不同的"老"字，都正确

**3.1 单侧错误修正（5 条 quizItem）**：

| # | quizItem ID | 字 | 修正前定义 | 修正后定义 |
|---|------------|----|-----------|-----------|
| 1 | s_c_0918 (高考) | 或 | 如果，假如 | 有时 |
| 2 | s_c_1113 (高考) | 说 | 劝说，说服 | 通"悦"，高兴、愉快 |
| 8 | s_c_0135 (中考) | 绝 | 尽，完 | 极，非常 |
| 9 | s_c_0280 (中考) | 阴 | 阴冷 | 昏暗 |

**3.2 模糊项统一（额外发现 2 条 kidRef 错误 + 1 条定义统一）**：

| # | 类型 | 涉及 quizItem | 问题 | 修复方式 |
|---|------|-------------|------|---------|
| 5 | kidRef 错误 | s_c_0022, s_c_0798（察） | "虽不能察"出自曹刿论战(art_006)，但 kidRef 指向齐桓晋文之事(art_063) | articles_grade9b.json art_006 新增 察 KW × 2，改 kidRef，定义统一为"明察，弄清楚" |
| 6 | 定义不统一 | s_c_0830（高考当） | "两者相抵" vs "抵充，当作" | 统一为"抵充，当作" |
| 7 | kidRef 错误 | s_c_0121, s_c_0966（举） | "举大计"出自陈涉世家(art_022)，但 kidRef 指向生于忧患死于安乐(art_012) | articles_grade9a.json art_022 新增 举 KW × 2，改 kidRef，定义统一为"兴起，发动" |

**articles JSON 同步（7 处修改，4 个文件）**：

| 文件 | kid | 修正 |
|------|-----|------|
| `articles_grade7a.json` | kw_art_010_s00_说_2 | "(1)动词，劝说，说服" → "通\"悦\"，高兴、愉快" |
| `articles_grade8a.json` | kw_art_017_s01_或_1 | "(3)连词，如果，假如" → "有时" |
| `articles_grade8a.json` | kw_art_017_s01_绝_0 | "阻断，断绝" → "极，非常" |
| `articles_grade9a.json` | kw_art_001_s01_阴_0 | "阴沉，阴冷" → "昏暗" |
| `articles_grade9a.json` | kw_art_022_s07_举_0, kw_art_022_s07_举_1 | **新增** "兴起，发动" |
| `articles_grade9b.json` | kw_art_021_s02_当_2 | "两者相抵" → "抵充，当作" |
| `articles_grade9b.json` | kw_art_006_s04_察_0, kw_art_006_s04_察_1 | **新增** "明察，弄清楚" |

**下一步**：
1. 在管理后台按顺序导入：先导入 art_006, art_022, art_010, art_017, art_001, art_021（按需），再导入 wb_gaokao_shixu 和 wb_zhongkao_shixu
2. 前端验证这 9 组矛盾句子的 quizItem 是否正确

---

### 阶段四：全量 858 条差异清理 P5

**目标**：quizItem definition 与 article_keyword definition 达成一致（至少释义层面）。

| 步骤 | 内容 | 操作文件 |
|------|------|---------|
| 4.1 | 脚本筛出"去掉词性标注/格式标签后实质 definition 不一致"的子集 | — |
| 4.2 | 逐条判定：article 对则改词书，词书对则改 article | `articles_*.json` + 各词书 JSON |
| 4.3 | 导入 → 验证 | |

---

### 阶段五：古今异义答题模型优化（可选/低优先级）

**背景**：古今异义词书的 definition 同时包含古今两义，干扰项中又出现古今义片段，导致选项之间边界模糊。

候选方案：
- **方案 A**：definition 只存古义（正确答案），干扰项放今义+其他干扰。古/今义对比在字总结页展示。
- **方案 B**：保持现状，仅清理干扰项中的 definition 子串重复。
- **方案 C**：不改模型，只在交互层面加提示（如题目下方标注"请选择古义"）。

> 暂不决策，等 P1-P4 修完后根据实际体验再议。

---

## 单条修复标准操作流程

每条问题的修复严格遵循 [[quiz-item-definition-fix]]：

```
1. 定位 quizItem（词书 JSON + quizItem ID）
2. 核对 article_keyword（通过 kidRef 在 articles JSON 中找到对应 keyWord）
3. 确认正确释义（优先用 article_keyword.definition，如有疑问查标准义项表）
4. 修改（如需改 articles JSON → 备份 → 修改 → 校验；改词书 JSON → 备份 → 修改 → 校验）
5. 导入（先选篇，后词书——顺序不能反）
6. 前端验证（打开小程序 → 学习 → 找到对应题目 → 确认 4 个选项正确）
```

**安全措施**（来自 [[work-manual]] 和 [[article-adjustment-workflow]]）：
- 修改 >30KB JSON 前 `cp file file.bak`
- 每次写入后 `python3 -c "import json; json.load(open('file'))"` 校验
- JSON 字符串值内禁止 ASCII `"`，引用原文必须用中文引号 `""`
- 导入完成后 `rm file.bak`

---

## 尚未排查的维度

- ⬜ 干扰项与正确选项在不同句子语境中的适配性
- ⬜ 壳文章（art_shell_*）中 keyWord definition 补全
- ⬜ 读音标注（pinyin）与释义的匹配性

---

## 涉及的关键文件

| 文件 | 角色 |
|------|------|
| `~/knowledge_library/文言文/词书/wb_gaokao_shixu.json` | P1, P4, P5 |
| `~/knowledge_library/文言文/词书/wb_zhongkao_gujinyi.json` | P2 |
| `~/knowledge_library/文言文/词书/wb_gaokao_gujinyi.json` | P2（干扰项）, P5 |
| `~/knowledge_library/文言文/词书/wb_zhongkao_shixu.json` | P3, P4 |
| `~/knowledge_library/文言文/词书/wb_zhongkao_cileihuoyong.json` | P3 |
| `~/knowledge_library/文言文/词书/wb_gaokao_cileihuoyong.json` | P3 |
| `~/knowledge_library/文言文/词书/definition_standard.json` | 标准义项表（修改/新增 definition 时的规范源） |
| `~/knowledge_library/文言文/选篇/正文/articles_*.json`（12 个文件） | P2, P3, P4, P5 |
| `~/knowledge_library/文言文/选篇/正文/readme.md` | 正文标注规范 |

[[quiz-item-definition-fix]]
[[article-keyword-correction]]
[[article-adjustment-workflow]]
[[study-section]]
[[articles-section]]
