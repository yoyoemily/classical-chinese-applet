---
name: articles-section
description: 选篇板块代码集成手册——页面/API/后端表/阅读模式/关键文件索引，典故注释数据编撰请参照知识库 文言文/选篇/典故注释/readme.md
metadata:
  type: project
---

> **互补关系**：知识库 `文言文/选篇/典故注释/readme.md` 覆盖**数据编撰**（JSON 格式、标注标准、导入命令、维护流程），本文件覆盖**代码集成**（页面/API/后端表/阅读模式/关键文件索引）。做典故注释时看知识库，写代码时看本文件。

## 选篇板块概览

选篇板块覆盖 300 篇文言文/古诗词（部编版教材大纲 179 篇 + 壳文章 121 篇），支持 3 种阅读模式。关联页面（共 2 个）：

| 页面 | 路径 | 角色 |
|------|------|------|
| 选篇列表 | `pages/article-list/` | TabBar 2，三行筛选（文体分类 + 学段/其他 + 年级弹出面板），交叉过滤 |
| 名篇阅读器 | `pages/article-reader/` | 3 种阅读模式、语音播报、典故注释、创作背景 |

错误反馈入口：名篇阅读页标题右侧 ⚠️ 图标。

---

## 知识库索引

> **互补关系**：知识库 readme 覆盖**数据编撰**（JSON 格式、标注标准、判断口诀、导入命令），本文件覆盖**代码集成**（页面/API/后端表/阅读模式/关键文件索引）。做典故注释时看知识库，写代码时看本文件。

- **典故注释唯一权威源**：`~/Documents/knowledge_library/文言文/选篇/典故注释/`
- **目录说明**：`~/Documents/knowledge_library/文言文/选篇/典故注释/readme.md` — 记录了文件格式、标注标准（标注什么/不标什么/判断口诀）、导入命令、维护流程。写典故注释时以此为准
- **典故注释 JSON 文件**：179 个文件（`art_001.json` ~ `art_187.json`，含跳过/删除的 ID），共 2,125 条注释，全部已导入数据库，均 126 字/条（8 批梳理后）
- **选篇正文唯一权威源**：`~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json`（12 个分文件）— 300 篇（教材 179 篇 + 壳文章 121 篇），1,634 条 keyWords（100% wordBookId 覆盖，全部含 kid/wordType）
- **正文目录说明**：`~/Documents/knowledge_library/文言文/选篇/正文/readme.md` — 格式、字段说明、数据约束
- **数据约束**：标注时以知识库 `articles.json` 正文为准，不参考 mock（mock 只有 4 篇，句子拆分可能不一致）。写完必须 `python3 -c "import json; json.load(open('art_XXX.json'))"` 校验

---

## 数据模型（板块相关）

| 类型 | 关键字段 |
|------|---------|
| `IArticle` | `id, title, author, dynasty, category ('prose'|'argument'|'poem'|'verse'), textbook? ('grade7a'~'grade9b'), background? (创作背景), fullTextAudioUrl?, sentences[]` |
| `IArticleSentence` | `text, translation, keyWords[] (词书联动), glossary[] (典故注释), audioUrl?` |
| `IArticleKeyWord` | `word, definition, wordBookId?, masteryLevel?, kid? (全局唯一标识), matchWord? (消歧定位), wordType? ('shi'\|'xu'\|'tongjia'\|'gujinyi'\|'huoyong')` |
| `IGlossaryItem` | `word, definition` |
| `IArticleProgress` | `articleId, readProgress, mastery ('none'|'read'|'understood'|'memorized')` |

### 三种阅读模式

| 模式 | `readingMode` | 内容 | 交互 |
|------|---------------|------|------|
| 通篇阅读 | `'plain'` | 原文段落排版，keyWords（词书联动词）内联高亮（主题色下划线）；每段末尾 ▸ 箭头 | 点keyWord弹出居中释义卡片（catchtap 不触发段落展开）；点段落区域展开/收起译文 |
| 逐句释义 | `'sentence'` | 按标点拆分，逐行展示，右侧 ▸ 箭头 | 点击展开/收起译文（白底卡片 + 6rpx 主题色左边框） |
| 典故注释 | `'glossary'` | 原文+典故词高亮（金色下划线，不关联词书），每句下方展示全句译文 | 点击典故词弹出释义气泡；译文卡片与其他模式统一 |

**统一译文卡片样式**：三种模式的展开译文共享相同视觉——`$font-size-base`、行高 1.9、白底卡片 (`var(--color-bg-card)`) + 6rpx 主题色左边框 + `$spacing-lg` 内边距，圆角 `0 $radius-md $radius-md 0`。

**通篇阅读的内联生词高亮**：`keyWords` 最长匹配切分后高亮（主题色下划线），点击弹出居中释义卡片，不打断阅读。展开段落仅展示译文，不重复列举重点字词（原文中可点击生词查看）。

**创作背景**：标题有 `background` 值时显示下划线，点击弹出创作背景浮层（居中 modal，scroll-view 滚动阅读）。77 篇全部已补充创作背景文本。

**语音播报**：左上角喇叭按钮，用户手动点击才开始朗读（不自动播报）。优先 `fullTextAudioUrl`，无则走 WechatSI TTS 合成（长文本自动切段拼接）。

---

## 后端表/API 速查

| 表 | 用途 |
|----|------|
| `article` | 名篇元数据（含 `background` TEXT 列） |
| `article_sentence` | 名篇句子 |
| `article_keyword` | 句子与词书词的关联（含 `kid` 全局唯一标识、`word_type` 生词类型、`match_word` 消歧定位） |
| `article_glossary` | 典故注释词条 |

| API | 方法/路径 | 用途 |
|-----|-----------|------|
| fetchArticles | `GET /api/articles?textbook=&category=` | 名篇列表（双参数过滤） |
| fetchArticleDetail | `GET /api/articles/:id` | 名篇详情（含全文+keyWords+glossary） |
| importArticles | `POST /api/admin/import/articles` | 选篇正文全量导入（幂等，从知识库 articles.json 读取） |
| submitFeedback | `POST /api/feedback` | 错误反馈（含 articleId + readingMode） |

---

## 典故注释维护流程

> 标注标准、判断口诀、完整维护流程见知识库 readme。以下只记代码集成侧的关键约束。

> ⚠️ **【硬性规则】JSON 文件中禁止 ASCII 双引号 `"` 出现在字符串值内部。** 引用原文时用中文引号 `"` `"`（`"` 和 `"`）。写完必须 `python3 -c "import json; json.load(open('art_XXX.json'))"` 校验。详见 [[work-manual]]#9。

179 篇全部已完成（2,125 条注释，均 126 字/条），后续只做修改/增补：

1. 编辑知识库 `art_XXX.json`（格式和标注标准见知识库 readme）
2. **写完后先做中文引号检查**，确认所有字符串值内部引用原文/说法处均使用 `""` 而非 ASCII `"`
3. JSON 校验：`python3 -c "import json; json.load(open('art_XXX.json'))"`
4. 导入：`curl -X POST http://localhost:8080/api/admin/import/glossary/art_XXX -H "Content-Type: application/json" -d @art_XXX.json`
5. 前端切换到典故注释模式验证

**常见坑位**：
- `"word": """xxx"""` — word 字段值内有中文引号时，ASCII `"` 被错当 JSON 定界符，JSON 解析崩溃。正例：`"word": ""xxx""`
- `"definition": "...学生以"xxx"指代..."` — definition 字段内引用原文时踩同样坑。正例：`"definition": "...学生以"xxx"指代..."` 
- 尤其注意：**并用多词时**（如 `"管仲""乐毅"`、`"广居""正位""大道"`），每个词之间的 `""` 都必须是中文引号
- 写完必须过 `python3` 校验，不要依赖肉眼检查

**代码侧约束**：
- 典故注释不关联词书，仅用于典故注释阅读模式
- 标注时以知识库 `articles.json` 正文为准，不参考 mock
- `importArticlesFromJson` 不会清空 `article_glossary` 表（已从 TRUNCATE 列表中移除），典故注释与正文导入解耦
- `article_keyword.kid` 全局唯一，导入前务必确保 articles.json 无重复 kid

### 数据整理（2026-07-17）

articles.json 规范化：
- art_shell_006 补 title/author/dynasty（左忠毅公逸事/方苞/清）
- `wordType` 覆盖率 70.4% → 100%（420 条补全）
- `wordBookId` 覆盖率 0% → 63.6%（走 kid 链路匹配）
- 删除 1 条脏 keyWord（art_shell_010 sent6 "不"）
- 从词书 quizItem 回填 43 个缺失句子到 16 篇文章
- 全部 kid 去重（修复 2 条重复）

### 数据维护脚本

| 脚本 | 用途 |
|------|------|
| `scripts/normalize_articles.py` | articles.json 规范化（wordType/wordBookId 补全、脏数据清理、壳文章元数据修复） |
| `scripts/add_missing_keywords.py` | 为已有句子新增缺失 keyWord 条目 |
| `scripts/backfill_sentences.py` | 从词书 quizItem.sentenceText 回填缺失句子到 articles.json |

---

## 标题栏布局

```
🔊 左          《标题》           ⚠️ 右
```

- flex 同行布局，喇叭和纠错 `flex-shrink: 0`，标题 `flex: 1` 居中
- 标题有 `background` 时带白色下划线，可点击

---

## 选篇调整标准工作流程

> 独立记忆文件：[[article-adjustment-workflow]]。触发词"调整选篇""修改选篇""优化选篇"时读取该文件。
> 核心流程：句子增删/移位 → keyWords 标注 → 典故注释 → 词书同步 → 导入数据库，含完成后检查清单。

---

## 当前进度

### 已完成
- ✅ 88 篇名篇全部录入（2026-07-21 补齐七上 11 首诗词，含 keyWords 标注、典故注释、创作背景）
- ✅ 30 篇新课已完成切句+逐句译文+keyWords 标注（含 wordBookId 关联 4 本高中词书），共 170 条 keyWords
- ✅ 七上 11 首诗词补齐完成（2026-07-21）：新增 38 条 keyWords + 62 条典故注释，4 本词书 keyWordRefs 同步。详见 [[poetry-backfill-master]]
- ✅ 3 种阅读模式全部实现
- ✅ 全部 179 篇选篇典故注释完成（知识库 179 个 JSON 文件，2,125 条，全部已导入数据库）。2026-07-22 完成典故注释全量梳理第 1~10 批全部完成（art_002~187），深度扩充+补齐缺失句，全量均约 150 字/条。详见 [[glossary-audit-master-plan]] 和 [[glossary-audit-master-plan]]#修订进度
- ✅ 30 篇高中课文创作背景补充完成（2026-07-13，含写作时代、作者境遇、文章主旨，每篇约 100-120 字，已导入数据库）
- ✅ 语音播报（WechatSI 插件，长文本自动切段拼接，playId 机制防止资源泄漏）
- ✅ 内联生词高亮（最长匹配切分）
- ✅ 错误反馈（原文/译文/标注/文章信息/其他）
- ✅ 三行筛选：第一行文体分类（全部/散文/论说/诗词/骈赋），第二行学段（全部/初中/高中/其他），第三行年级弹出面板（含高一上~高三）
- ✅ 生僻字拼音旁注
- ✅ keyWords 全量修复（2026-07-16）：交叉对比 8 本词书，543→1,095 条（含壳文章）；修正 6 处挂错句子；同义去重 81 条；同字消歧 14 处
- ✅ keyWords 词书交叉核对（2026-07-22）：全部 12 批完成，2,030→1,634 条。396 条不在词书的删除，440+ 条补充 wordBookId，~30 条修正错误指向（wb_function_words→打卡型词书），~116 条 wordType 统一，2 条词书脏 kidRef 清理。最终 100% 词书覆盖 + 100% wordBookId + 100% wordType 一致。详细见 [[keywords-audit-master-plan]]
- ✅ 问题 4 — 同句同字多义项消歧渲染错误修复（2026-07-16）：新增 `matchWord` 字段全链路透传（articles.json → SourceKeyWord DTO → ArticleKeyword 实体 → DB `article_keyword.match_word` → 导入 → API → IArticleKeyWord → IVocabSegment → buildVocabSegments()）。`matchWord` 仅用于定位，`word` 用于弹窗展示。涉及文件：
  - 前端：`typings/index.d.ts`（IArticleKeyWord 加 matchWord）、`pages/article-reader/index.ts`（buildVocabSegments 用 matchWord 匹配 + wordStart 偏移仅高亮 word 字符）
  - 后端：`SourceData.java`、`ArticleKeyword.java`、`DataImportService.java`（导入 7 列）、`ArticleService.java`（API 序列化 matchWord）
  - 数据库：`article_keyword` 表新增 `match_word VARCHAR(128)` 列
  - 数据：articles.json 已有 matchWord（脚本产出），重新导入后生效
- ✅ 优化 3 — 通篇阅读 keyWords 按 wordType 分色高亮（2026-07-16）：全链路透传 wordType（articles.json → DB `article_keyword.word_type` → 后端实体/DTO/导入/API → 前端类型 → IVocabSegment → WXML 动态 class）。5 色方案：实词 `#4a6a5e`（墨绿）/ 虚词 `#8b7355`（黄栌）/ 通假字 `#b85450`（朱砂）/ 古今异义 `#2980b9`（亮蓝）/ 词类活用 `#9b6db5`（紫）。优先级 `tongjia > huoyong > gujinyi > xu > shi`，数据层排序 + `buildVocabSegments()` 稳定排序首次匹配 break 实现。正文顶部色标图例与高亮样式一致（彩色文字+下划线），仿古纸底色边框包裹。涉及文件：
  - 后端：`ArticleKeyword.java`（+wordType）、`SourceData.java`（SourceKeyWord +wordType）、`DataImportService.java`（INSERT +word_type 第 8 列）、`ArticleService.java`（条件序列化）
  - 前端：`typings/index.d.ts`（IArticleKeyWord +wordType?）、`pages/article-reader/index.ts`（IVocabSegment.wordType + buildVocabSegments 传播）、`index.wxml`（动态 class + 图例）、`index.scss`（5 个 BEM 修饰符 + 图例样式）
  - 样式：`styles/variables.scss`（5 个 SCSS 变量 + CSS 自定义属性）
  - 数据库：`article_keyword` 表新增 `word_type VARCHAR(8)` 列
- ✅ 优化 4 — 通篇阅读相邻独立生词下划线视觉区分（2026-07-16）：当同句中出现相邻但属于不同 word 的独立标注时（如"百废俱兴"中"俱"和"兴"各自独立），通过两步解决下划线连在一起的问题：（1）TS 层 `buildVocabSegments()` 末尾新增合并逻辑——同 word 的连续字符合并为单个 segment，使多字词渲染为单个 `<text>` 元素、一条完整下划线；（2）CSS 层下划线从 `border-bottom` 改为 `background-image` 模拟，宽度 `calc(100% - 6rpx)` 居中显示，相邻不同 word 的下划线之间自然留出间隙，字间距不受影响。`currentColor` 自动跟随各 wordType 颜色变体。涉及文件：
  - 前端：`pages/article-reader/index.ts`（buildVocabSegments 末尾合并循环）、`pages/article-reader/index.scss`（&__vocab-word 下划线改 background-image + wordType 变体简化）

### 架构重构完成（2026-07-16）

词书选篇架构重构（v2）——词书从"复制数据"改为"引用选篇 keyWords"，消除双端维护的数据冗余。选篇 keyWords 是唯一权威源，词书只做 kid 引用 + 答题干扰项 + 教学辅助内容。

articles.json 所有 keyWord 新增 `kid`（全局唯一 ID，格式 `kw_{articleId}_s{sentenceIndex:02d}_{word}_{序号}`）、`wordType`、`matchWord` 字段。词书 JSON 改为 `wordEntries[].keyWordRefs[] + quizItems[]` 格式。

详细记录见 [[study-section]]#数据模型-v2-架构。

### 待办

- 典故注释全量梳理第 9~10 批（art_154~art_187，34 篇）✅ 已完成（2026-07-22）。

---

## 壳文章

壳文章 (`art_shell_001` ~ `art_shell_121`) 是词书 keyWords 的句子上下文容器，不是用户可读的选篇。词书通过 `keyWordRefs[].kid` 引用选篇 keyWords，壳文章的句子和 keyWords 就是这些引用的落地锚点。

| 维度 | 行为 |
|------|------|
| 文章列表 | **不可见**。后端 `has_content = 0` 过滤 |
| 文章详情 | API 无过滤，直接输 URL 可到达 |
| 排序 | `sortOrder = 10000 + index`，排在大纲文章之后 |
| 数据源 | `articles.json`（知识库），121 篇、339 句、339 条 keyWords |
| 典故注释 | 无 |
| 创作背景 | 无 |
| 译文 | 有 keyWord 的句子必须 100% 有译文 |

**Why:** 大纲文章 77 篇覆盖面有限，壳文章补充更多句子场景，让词书的每个 keyWordRef 都有句子可依附。

---

## 古诗词补齐状态

部编版初高中全部诗词已补齐：七上~九下（初中）+ 高一上~高三（高中）= 12 个年级，全部 ✅。共补齐约 100 首诗词，含 keyWords 标注、典故注释、创作背景。导入脚本和数据文件已完成任务并清理。

---

## 关键文件索引

| 层 | 文件 | 角色 |
|----|------|------|
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json` | 选篇正文唯一权威源（12 个分文件：grade7a~12a + shell，共 300 篇，1,634 条 keyWords，全部含 kid/wordBookId/wordType） |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/正文/readme.md` | 选篇正文目录说明 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/readme.md` | 典故注释目录说明 |
| 知识库 | `~/Documents/knowledge_library/文言文/选篇/典故注释/art_*.json` | 典故注释唯一权威源（全部完成） |
| 前端 | `pages/article-list/index.*` | 选篇列表（三行筛选：文体 + 学段/其他 + 年级弹出面板） |
| 前端 | `pages/article-reader/index.*` | 名篇阅读器（3 种模式） |
| 前端 | `utils/tts.ts` | 语音播报（名篇阅读页使用） |
| 前端 | `mock/articles.ts` | 名篇 Mock（4 篇） |
| 前端 | `api/index.ts` | `fetchArticles()` / `fetchArticleDetail()` |
| 后端 | `controller/ArticleController.java` | 名篇 API |
| 后端 | `service/ArticleService.java` | 名篇业务逻辑（toArticleMap 序列化 kid/wordType/matchWord） |
| 后端 | `service/DataImportService.java` | `importArticlesFromJson()` 从目录读取 12 个分文件合并后幂等导入（含 kid/matchWord/wordType）；`importGlossaryForArticle()` 典故注释幂等导入 |
| 后端 | `controller/ImportController.java` | `POST /api/admin/import/articles`（全量导入选篇正文+壳文章） |
| 后端 | `controller/ImportController.java` | `POST /api/admin/import/glossary/{articleId}` |
| 后端 | `src/main/resources/source.json` | 冷启动数据（词书+勋章+经典，不含选篇正文） |

[[study-section]]
