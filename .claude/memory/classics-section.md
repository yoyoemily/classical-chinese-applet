---
name: classics-section
description: 经典板块代码集成手册——页面/API/后端表/集成流程/关键文件索引，经典数据编撰请参照知识库 文言文/经典/readme.md
metadata:
  type: project
---

> **互补关系**：知识库 `文言文/经典/readme.md` 覆盖**数据编撰**（JSON 格式、loadMode/navMode 完整说明、10 部经典组合对照表、标注标准、导入命令、数据约定），本文件覆盖**代码集成**（页面/API/后端表/集成流程/关键文件索引）。确定 navMode 时看知识库，写代码时看本文件。

## 经典板块概览

经典板块覆盖 52 部传世典籍，四部分类（经/史/子/集），支持 4 种目录导航模式。关联页面（共 2 个）：

| 页面 | 路径 | 角色 |
|------|------|------|
| 经典列表 | `pages/classic/` | TabBar 3，52 部经典卡片，四部分类 Tab 切换 |
| 经典阅读器 | `pages/classic-reader/` | 典故注释模式阅读，连续滚动章节导航，古典书卷风 |

经典列表页从 `GET /api/classics?category=` 拉取数据，仅依赖后端 API，无离线兜底。判断经典是否开放：有 `loadMode` 字段即可跳转，否则 toast "该经典正在整理中，敬请期待"。

**分类内排序**：后端 `ClassicService.listClassics()` 按 `classic.sort_order` 升序排列，每个分类内部独立排序。排序值由 `source.json` 中 `classics[].sortOrder` 定义，`DataImportService.importClassics()` 入库。排序逻辑：经部按群经之首→三礼→春秋→四书→蒙学，史部按成书时代，子部按先秦诸子→秦汉→后世，集部按时代+文体。调整排序只需改 `source.json` 中 `sortOrder` 值并重新导入。

---

## 知识库索引

> **互补关系**：知识库 readme 覆盖**数据编撰**（JSON 格式、loadMode/navMode 完整说明、10 部经典组合对照表、标注标准、导入命令、数据约定），本文件覆盖**代码集成**（页面/API/后端表/集成流程/关键文件索引）。确定 navMode 时看知识库，写代码时看本文件。

- **经典数据唯一权威源**：`~/Documents/knowledge_library/文言文/经典/`
- **目录说明**：`~/Documents/knowledge_library/文言文/经典/readme.md` — **必读**，记录了 3 种数据结构 + 2 种 loadMode × 4 种 navMode 完整说明 + 10 部经典典型组合对照 + 5 步集成流程 + 数据约定 + 当前状态表。新增经典时以知识库 readme 为准
- **子目录结构**：每部经典一个子目录（如 `孙子兵法/`、`老子/`、`世说新语/`），内含 `chapters.json` 或 `entries.json`

---

## loadMode 与 navMode

> **完整说明（含 10 部经典对照表）见知识库 readme。** 以下摘要代码集成侧要点。

### loadMode（加载模式）

| 值 | 行为 | 适用 |
|----|------|------|
| `full` | 首次一次返回全部内容，前端一次性渲染 | 篇幅短小（千字内） |
| `chunked` | 首次只返回目录树，按需逐篇加载，前端 `contentCache` 缓存 | 篇幅较大 |

互换性：`full` ↔ `chunked` 可随时切换（数据是同一套），只影响传输时机。

### navMode（导航模式）—— 4 种

| 值 | 交互 | TOC 要求 | 已上线范例 |
|----|------|----------|----------|
| `strip` | 顶部横向滚动标签栏 | 一级平铺，≤20 条 | 孙子兵法 13 篇 |
| `list` | 竖向列表 | 一级平铺 | 老子 81 章 |
| `accordion` | 手风琴展开/收起 | 二级嵌套（分组→叶子） | 世说新语、山海经 |
| `author` | 作者列表→作品列表 | 二级嵌套（作者→作品） | 唐诗三百首 |

**强约束**：navMode 必须匹配数据库 `classic_chapter.parent_id` 结构，在设计阶段确定，后续不变。

### 已上线 5 部（navMode 范例）

| 经典 | id | loadMode | navMode | 原因 |
|------|----|----------|---------|------|
| 孙子兵法 | 22 | chunked | strip | 13 篇短文，横向滑选，逐篇音频 XP |
| 老子 | 18 | chunked | list | 81 章，逐章加载竖排，逐章音频 XP |
| 世说新语 | 33 | chunked | accordion | 36 门按门类分组 |
| 山海经 | 36 | chunked | accordion | 按山经/海经分组 |
| 唐诗三百首 | 28 | chunked | author | 按作者浏览发现 |

---

## 数据模型（板块相关）

| 类型 | 关键字段 |
|------|---------|
| `IClassicItem` | `id (number), name, era, icon, description, category ('经'|'史'|'子'|'集'), loadMode?, navMode?, isCompleted? (number, 1=已完成可点击)` |
| `IClassicMeta` | 扩展 IClassicItem：`author, structureType ('chapter'|'anthology'|'volume'), toc: ITocNode[]` |
| `ITocNode` | `id, title, level, isLeaf, children?` |
| `IContentBlock` | `id, title, author?, era?, background?, paragraphs: IChapterParagraph[]` |
| `IChapterParagraph` | `text, translation, glossary?` |
| `IClassicGlossaryItem` | `word, explanation`（文化背景词，不关联词书） |

### 52 部经典完整 loadMode/navMode 分配（与数据库 classic 表一致）

| id | 经典 | 部 | 类型 | loadMode | navMode | 规模 |
|----|------|:--:|------|----------|---------|------|
| 1 | 论语 | 经 | 章节型 | chunked | accordion | 20 篇 498 章 |
| 2 | 孟子 | 经 | 章节型 | chunked | accordion | 7 篇 260 章 |
| 3 | 大学 | 经 | 章节型 | full | strip | 1 篇，极短 |
| 4 | 中庸 | 经 | 章节型 | full | list | 1 篇，极短 |
| 5 | 周易 | 经 | 章节型 | chunked | list | 64 卦，各含彖象文言 |
| 6 | 诗经 | 经 | 选集型 | chunked | accordion | 305 篇，风雅颂分组 |
| 8 | 礼记 | 经 | 章节型 | chunked | list | 49 篇 |
| 9 | 左传 | 经 | 卷帙型 | chunked | accordion | 编年体，按年份分组 |
| 10 | 春秋 | 经 | 章节型 | chunked | list | 12位鲁公，5312字 |
| 38 | 孝经 | 经 | 章节型 | full | strip | 18 章 ~1800 字，极短 |
| 43 | 三字经 | 经 | 章节型 | full | strip | ~1140 字，蒙学第一书 |
| 44 | 千字文 | 经 | 章节型 | full | strip | 1000 字，蒙学双璧 |
| 11 | 战国策 | 史 | 卷帙型 | chunked | accordion | 按国别分组 |
| 12 | 史记 | 史 | 卷帙型 | chunked | accordion | 130 卷，本纪/世家/列传等 |
| 13 | 三国志 | 史 | 卷帙型 | chunked | accordion | 魏蜀吴三书 |
| 14 | 汉书 | 史 | 卷帙型 | chunked | accordion | 纪传体，按体例分组 |
| 15 | 后汉书 | 史 | 卷帙型 | chunked | accordion | 纪传体，按体例分组 |
| 16 | 资治通鉴 | 史 | 卷帙型 | chunked | accordion | 294 卷，按朝代年份分组 |
| 39 | 国语 | 史 | 卷帙型 | chunked | accordion | 21 卷，按国别分组 |
| 53 | 水经注 | 史 | 章节型 | chunked | list | 40 卷，地理文学双经典 |
| 54 | 徐霞客游记 | 史 | 章节型 | chunked | list | 明代旅行文学巅峰 |
| 17 | 荀子 | 子 | 章节型 | chunked | list | 32 篇 |
| 18 | 老子 | 子 | 章节型 | chunked | list | 81 章 ✅ |
| 19 | 庄子 | 子 | 章节型 | chunked | list | 33 篇，内篇/外篇/杂篇三分 |
| 20 | 韩非子 | 子 | 章节型 | chunked | list | 55 篇 |
| 21 | 墨子 | 子 | 章节型 | chunked | list | 53 篇 |
| 22 | 孙子兵法 | 子 | 章节型 | chunked | strip | 13 篇 ✅ |
| 23 | 吕氏春秋 | 子 | 章节型 | chunked | accordion | 12 纪/8 览/6 论 |
| 24 | 鬼谷子 | 子 | 章节型 | chunked | strip | 14 篇，极短 |
| 26 | 黄帝内经 | 子 | 章节型 | chunked | list | 素问/灵枢两部 |
| 37 | 列子 | 子 | 章节型 | chunked | list | 8 篇，名篇密度极高 |
| 40 | 颜氏家训 | 子 | 章节型 | chunked | list | 20 篇，教育定位契合 |
| 45 | 淮南子 | 子 | 章节型 | chunked | list | 21 篇，神话寓言宝库 |
| 46 | 晏子春秋 | 子 | 章节型 | chunked | accordion | 8 篇，故事性强 |
| 47 | 菜根谭 | 子 | 章节型 | chunked | list | 格言体，极短，碎片阅读 |
| 58 | 围炉夜话 | 子 | 章节型 | chunked | list | 184 则，冬夜闲谈格言体 |
| 27 | 楚辞 | 集 | 章节型 | full | strip | 篇幅短小，篇目少 |
| 28 | 唐诗三百首 | 集 | 选集型 | chunked | author | 311 首 74 位作者 ✅ |
| 29 | 宋词三百首 | 集 | 选集型 | chunked | search | ~300 首，按作者检索 |
| 30 | 乐府诗集 | 集 | 选集型 | chunked | accordion | 按曲调/题材分组 |
| 32 | 古文观止 | 集 | 选集型 | chunked | search | 222 篇，按作者/朝代检索 |
| 33 | 世说新语 | 集 | 选集型 | chunked | accordion | 36 门 ✅ |
| 34 | 梦溪笔谈 | 集 | 选集型 | chunked | accordion | 按门类分组 |
| 35 | 聊斋志异 | 集 | 选集型 | chunked | search | 491 篇独立故事，按篇名检索 |
| 36 | 山海经 | 集 | 卷帙型 | chunked | accordion | 18 卷 ✅ |
| 41 | 文选 | 集 | 选集型 | chunked | author | 700+ 篇 130 位作者 |
| 42 | 元曲三百首 | 集 | 选集型 | chunked | author | ~300 首，补全诗歌链条 |
| 48 | 西厢记 | 集 | 选集型 | chunked | accordion | 5 本，元杂剧巅峰 |
| 49 | 牡丹亭 | 集 | 选集型 | chunked | accordion | 55 出，明传奇最高成就 |
| 55 | 浮生六记 | 集 | 章节型 | chunked | list | 6 卷，古文过渡阅读 |
| 56 | 曾国藩家书 | 集 | 选集型 | chunked | list | 200+ 封书信 |
| 57 | 陶渊明集 | 集 | 选集型 | chunked | list | 100+ 首诗赋 |
| 59 | 韩愈文集 | 集 | 选集型 | chunked | list | ~200 篇散文 |

> **navMode 分配原则**：
> - `strip`：章节极少（≤20）、篇幅短小，横向滑动标签即达
> - `list`：章节多但一级平铺无分组，竖向列表浏览
> - `accordion`：有天然的多级分组（门类/体例/国别/卷帙），手风琴展开收起
> - `author`：选集型、条目按作者聚合，按作者浏览发现
> - `search`：条目多且跨作者/体裁，搜索框精准检索（代替列表浏览）

---

## 三种数据结构类型

> JSON 格式示例和完整字段说明见知识库 readme。以下只记代码集成侧的关键差异。

| 类型 | structureType 值 | 数据文件 | 后端存储 | navMode |
|------|------------------|---------|---------|---------|
| 章节型 | `chapter` | `chapters.json`（数组，每章含 paragraphs） | `classic_chapter` 平级（parent_id=NULL） | `strip` / `list` |
| 选集型 | `anthology` | `entries.json`（分组含 entries 数组，entry 可选 `author`/`era`） | `classic_chapter` 二级树（门→条目） | `accordion` / `author` |
| 卷帙型 | `volume` | `chapters.json`（同章节型，mock 重建为二级目录） | 同章节型 | `accordion` |

---

## 后端表/API 速查

| 表 | 用途 |
|----|------|
| `classic` | 经典著作元数据（52 部） |
| `classic_chapter` | 章节目录（含 `parent_id` 支持二级树，含 `author`/`era`/`background` 支持篇章级作者、朝代、创作背景信息） |
| `classic_paragraph` | 段落内容 |
| `classic_glossary` | 典故注释词条 |

| API | 方法/路径 | 用途 |
|-----|-----------|------|
| fetchClassics | `GET /api/classics?category=` | 经典列表（按四部过滤） |
| fetchClassicMeta | `GET /api/classics/:id` | 经典元数据（含 TOC） |
| fetchClassicContent | `GET /api/classics/:id/content/:nodeId` | chunked 模式按节点加载内容 |

后端管理接口（免登录）：

| 接口 | 用途 |
|------|------|
| `POST /api/admin/import/classic/{classicId}` | 全量导入——先删后插整部经典（小经典用） |
| `POST /api/admin/import/classic/{classicId}/batch` | 批次导入——匹配已有章节则更新段落/注释，无匹配则插入；永不删除已有章（大部头渐进式导入用） |

### 批次导入接口（渐进式导入）

**设计动机**：大部头经典（如全唐诗 48,000+ 首）无法一次性编撰完毕，需要一个 JSON 分批提交也不会损坏已上线内容的机制。

**匹配策略**：以 `(classic_id, parent_id, title)` 三元组为唯一键匹配已有 chapter：
- **命中已有章** → 清理该章的旧段落和注释，重新插入 JSON 中的段落/注释（幂等更新）
- **未命中** → 插入新章（含段落和注释）
- **⚠️ 批次导入永不删除已有章节**——JSON 中未出现的章保留不动

**与全量导入对比**：

| 维度 | 全量导入 | 批次导入 |
|------|---------|---------|
| 路径 | `POST .../import/classic/{id}` | `POST .../import/classic/{id}/batch` |
| 行为 | 先删光该经典全部数据，再插入 | 逐章匹配、有则更新、无则插入 |
| JSON 格式 | 完整 `chapters.json` / `entries.json` | 相同格式，只是内容为子集 |
| 适用 | 小经典一次性导入 | 大部头渐进式编撰 |
| 风险 | 大文件改坏→全本不可用 | 改坏只影响该批次对应的几章 |

**数据编撰约定**：知识库中一部经典的数据目录可拆分为多个批次文件：

```
全唐诗/
  batch-01-李白卷一.json       ← 第一批
  batch-02-李白卷二.json       ← 第二批
  ...
```

导入命令：
```bash
# 全量导入（小经典继续用这个）
curl -X POST http://localhost:8080/api/admin/import/classic/18 \
  -H "Content-Type: application/json" \
  -d @老子/chapters.json

# 批次追加（大部头用这个）
curl -X POST http://localhost:8080/api/admin/import/classic/31/batch \
  -H "Content-Type: application/json" \
  -d @全唐诗/batch-01-李白卷一.json
```

**后端实现要点**（待开发）：
- `DataImportService.importClassicBookBatch(Long classicId, List<SourceClassicChapter> chapters)`，`@Transactional`
- 遍历 chapters，对每个 chapter 执行 `SELECT id FROM classic_chapter WHERE classic_id=? AND parent_id<=>? AND title=?` 匹配
- 命中 → `deleteClassicChapterData(chapterId)` + 重新插入段落/注释
- 未命中 → `INSERT INTO classic_chapter` + 插入段落/注释
- 与全量导入共用 JSON 解析逻辑（自动检测 entries 字段判断选集型/章节型）

---

## 新增经典的完整流程（5 步）

> JSON 校验 + 导入命令 + 数据约定见知识库 readme。以下记代码集成侧的改动点。

> ⚠️ **【硬性规则】JSON 文件中禁止 ASCII 双引号 `"` 出现在字符串值内部。** 引用原文、引用说法时，必须使用 Unicode 中文引号 `"` `"`（即 `“` 和 `”`）。反例：`"孙子以"兵"指代军事"` 会破坏 JSON 结构。正例：`"孙子以“兵”指代军事"`。写完 JSON 必须 `python3 -c "import json; json.load(open('...'))"` 校验。详见 [[work-manual]]#9。

### 1. 知识库 JSON → 后端导入

在知识库 `~/Documents/knowledge_library/文言文/经典/<经典名>/` 编写 JSON（正文 + 译文），校验并导入（命令见知识库 readme）。`DataImportService.importClassicBook()` 自动检测 JSON 格式：有 `entries` 字段走选集型二级导入，否则走章节型一级导入。无需修改导入代码。

**选集型 entry 的 author/era/background 字段**：若每条 entry 有独立作者且需要在阅读时显示（如唐诗三百首阅读《蜀道难》时标题显示"唐 · 李白"），应在 entry 上填 `era`。`author` 通常无需逐条填写——导入逻辑自动继承父 group 的 `title`（如 group 标题"李白"→ 所有子 entry 的 author 自动为"李白"）。仅当 group 不是作者名（如"其他"分组）或需覆盖时，才在 entry 上显式指定 `author`。

`background` 字段（可选）：每条 entry 可填创作背景文本，后端经典导入自动写入 `classic_chapter.background`，前端经典阅读器标题区有背景时显示下划线，点击弹出背景弹窗。2026-07-12 唐诗三百首 293 首已全部补充 background。

### 2. 编写典故注释（glossary）

> 这是最容易被遗漏的一步——**正文和译文跑通了 ≠ 做完了**。唐诗三百首就是导入后跳过了这一步。

在 JSON 中为每个段落的 `glossary` 数组填写词条（`word` + `explanation`）。后端 `importClassicBook()` 自动写入 `classic_glossary` 表，前端 `buildSegment()` 自动最长匹配高亮 + 点击弹泡。无需改任何代码。

**经典 glossary 的标注范围**（与选篇不同，经典面向文化通识而非中学考试）：

| 应该标 | 不必标 |
|--------|--------|
| 典故、历史人名与事件 | 基础实词虚词释义（归词书管） |
| 古代官职、地名、制度 | 现代读者凭上下文可推断的词 |
| 文化背景词（需解释才能理解） | 已在词书中覆盖的字词 |

**标注标准**：对原文中需解释的词标注 `word` 和 `explanation`，前端自动最长匹配切分高亮。每段落的 `glossary` 数组可以为空（表示暂无需要注释的词）。

**已上线各经典 glossary 规模参考**：孙子兵法 181 条 / 老子 289 条 / 世说新语 106 条 / 山海经 50 条。

### 3. 前端 mock（精简验证用）

`mock/classics.ts` 中新增：
- `get<经典名>MockMeta()` → 返回 `IClassicMeta`（含 TOC）
- `get<经典名>MockContent(nodeId)` → 返回 `IContentBlock`
- 在 `getClassicMetaById()` 和 `getClassicMockContent()` 各加 `else if (id === <classicId>)` 分支

mock 数据精简到几条即可——只验证 TOC 导航和内容渲染。

### 4. 前端入口开放

后端 `classic` 表的 `load_mode` 和 `nav_mode` 字段确保已设置（chunked 或 full 即表示可上线），前端列表页从 API 获取数据后自动可点击跳转 `pages/classic-reader/index?id=<id>`。

### 5. 更新知识库 readme + 项目记忆

- 知识库 `readme.md` 的"当前状态"表加一行
- 本记忆文件的"当前进度"表加一行

---

## 当前进度

**已上线 25 部，剩余 27 部完全空白**（无 JSON 数据、未导入、前端不可用）。上方的 loadMode/navMode 分配表仅为 DB 元数据，不表示任何进度。

| 经典 | id | 类型 | navMode | 规模 | 状态 |
|------|----|------|---------|------|------|
| 孙子兵法 | 22 | 章节型 | strip | 13 篇，78 段落，181 条注释 | ✅ 已上线 |
| 老子 | 18 | 章节型 | list | 81 章，289 条注释，6410 字 | ✅ 已上线 |
| 世说新语 | 33 | 选集型 | accordion | 36 门 54 章，106 条注释 | ✅ 已上线 |
| 山海经 | 36 | 卷帙型 | accordion | 18 卷，162 条注释 | ✅ 已上线 |
| 唐诗三百首 | 28 | 选集型 | author | 318 章，687 条注释，293 条创作背景 | ✅ 已上线 |
| 宋词三百首 | 29 | 选集型 | author | 235 首词，33 个目录分组，78 位作者（52 首归入"其他"组），chunked + author | ✅ 已上线 |
| 大学 | 3 | 章节型 | strip | 1 篇，26 段落，78 条注释 | ✅ 已上线 |
| 中庸 | 4 | 章节型 | list | 1 篇，52 段落，153 条注释 | ✅ 已上线 |
| 三字经 | 43 | 章节型 | strip | 8 章，25 段落，125 条注释 | ✅ 已上线 |
| 千字文 | 44 | 章节型 | strip | 11 章，23 段落，123 条注释 | ✅ 已上线 |
| 孝经 | 38 | 章节型 | strip | 18 章，18 段落，61 条注释 | ✅ 已上线 |
| 楚辞 | 27 | 章节型 | strip | 8 篇，9 段落，40 条注释 | ✅ 已上线 |
| 鬼谷子 | 24 | 章节型 | strip | 12 篇，64 段落，80 条注释 | ✅ 已上线 |
| 菜根谭 | 47 | 章节型 | list | 60 则，60 段落，55 条注释 | ✅ 已上线 |
| 浮生六记 | 55 | 章节型 | list | 4 章，21 段落，29 条注释 | ✅ 已上线 |
| 周易 | 5 | 章节型 | list | 64 卦，253 段落，394 条注释 | ✅ 已上线 |
| 荀子 | 17 | 章节型 | list | 32 篇，60 段落，72 条注释 | ✅ 已上线 |
| 韩非子 | 20 | 章节型 | list | 16 章，16 段落，18 条注释 | ✅ 已上线 |
| 墨子 | 21 | 章节型 | list | 8 章，8 段落，10 条注释 | ✅ 已上线 |
| 列子 | 37 | 章节型 | list | 8 章，15 段落 | ✅ 已上线 |
| 颜氏家训 | 40 | 章节型 | list | 20 章，21 段落 | ✅ 已上线 |
| 围炉夜话 | 58 | 章节型 | list | 184 则，184 段落 | ✅ 已上线 |
| 晏子春秋 | 46 | 章节型 | list | 8 篇，15 段落 | ✅ 已上线 |
| 西厢记 | 48 | 选集型 | accordion | 5 本 7 折，chunked + accordion | ✅ 已上线 |
| 陶渊明集 | 57 | 选集型 | list | 15 篇，chunked + list | ✅ 已上线 |
| 其余 27 部 | — | — | — | — | ❌ 未开始 |

---

## 生僻字拼音旁注

经典阅读器和选篇阅读器均已支持生僻字拼音旁注（2026-07-12）。

- **后端**：`PinyinUtils.java` 内置《通用规范汉字表》一级字表 3500 字 + 文言高频字白名单 `CLASSICAL_COMMON_CHARS`，基于 pinyin4j 生成带声调的拼音。`ArticleService.toArticleMap()` 和 `ClassicService.getClassicContent()` / `buildFullContent()` 逐句/段附加 `rareCharPinyin` 字段
- **前端**：`utils/util.ts` 的 `splitByRareChar()` 对非高亮文本段做生僻字二次切分；`buildSegment()` / `buildGlossarySegments()` / `buildVocabSegments()` 将多字 glossary/keyword 词拆为单字段并查 `rareCharPinyin` 赋值 pinyin；WXML 所有段统一渲染括号拼音；SCSS 拼音样式 24rpx 灰色

---

## 语音播报

选篇和经典阅读器共用 `utils/tts.ts`，用户手动点击喇叭按钮才开始播放，不自动播报。引擎为 WechatSI 插件，长文本（>150 字）自动按标点切段逐段合成后拼接播放。资源管理：playId 机制防止并发回调泄漏，`stop()` 立即终止合成链，`destroy()` 页面卸载时调用释放全部资源。兼容学习板块 `autoPlayAudio` 设置（学习板块独立管理自动播报逻辑）。

---

## 创作背景

经典阅读器已支持篇章级创作背景弹窗（2026-07-12）。全链路：

- **数据库**：`classic_chapter` 表 `background TEXT` 列
- **后端实体**：`ClassicChapter.background`
- **后端 DTO**：`SourceAnthologyEntry.background`
- **导入**：`DataImportService.importAnthologyData()` 的 INSERT SQL 含 `background` 列
- **查询**：`ClassicService.getClassicContent()` 和 `buildFullContent()` 返回 `background` 字段
- **前端类型**：`IContentBlock.background?: string`
- **前端 UI**：经典阅读器标题区有 `background` 时显示下划线（白底半透明），点击弹出居中 modal（遮罩 + 白底弹窗，620rpx 宽，标题"背景介绍"，scroll-view 正文区），复用选篇阅读器背景弹窗样式
- **已完成**：唐诗三百首 293 首全部补充 background，知识库 JSON 为唯一权威数据源

---

## 数据约定

> 完整约定（含 glossary 标注范围、中文引号规则等）见知识库 readme。代码侧关键约束：
- 知识库为唯一权威数据源，项目内不存放经典内容数据
- 所有 glossary 词采用自动最长匹配（不需要 startIndex），调整内容时无需重新校准索引
- navMode 必须匹配数据库 `classic_chapter.parent_id` 结构

---

## 关键文件索引

| 层 | 文件 | 角色 |
|----|------|------|
| 知识库 | `~/Documents/knowledge_library/文言文/经典/readme.md` | **必读**——完整 loadMode/navMode 说明 + 所有命令模板 |
| 知识库 | `~/Documents/knowledge_library/文言文/经典/<经典名>/` | 各经典 JSON 数据唯一权威源 |
| 后端 schema | `data/schema.sql` | `classic_chapter` 含 `parent_id` 支持二级树（共 4 张表） |
| 后端 entity | `entity/ClassicChapter.java` | 含 `parentId` 字段 |
| 后端 dto | `dto/SourceData.java` | `SourceClassicChapter.entries` + `SourceAnthologyEntry` |
| 后端 service | `service/DataImportService.java` | `importClassicBook()` 自动检测类型（entries vs paragraphs）→ 二级/一级导入 |
| 后端 service | `service/ClassicService.java` | `buildToc()` 构建导航树 |
| 后端 controller | `controller/ImportController.java` | `POST /api/admin/import/classic/{id}`（免登录） |
| 后端 controller | `controller/ClassicController.java` | `GET /api/classics`、`GET /api/classics/:id`、`GET /api/classics/:id/content/:nodeId` |
| 前端 reader | `pages/classic-reader/index.*` | v2：full/chunked + strip/list/accordion/author 四种 navMode |
| 前端 mock | `mock/classics.ts` | `getClassicMetaById()` + `getClassicMockContent()` |
| 前端列表 | `pages/classic/index.*` | 列表页，API 拉取经典列表，三态切换（加载/错误/正常） |
| 前端 API | `api/index.ts` | `fetchClassics()` / `fetchClassicMeta()` / `fetchClassicContent()` |

[[classical-chinese-applet-overview]]
[[classical-chinese-data-model]]
[[backend-infrastructure]]
