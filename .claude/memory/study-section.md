---
name: study-section
description: 学习板块代码集成手册——页面/API/后端表/业务逻辑/关键文件索引，词书数据编撰请参照知识库 文言文/词书/readme.md
metadata:
  type: project
---

> **互补关系**：知识库 `文言文/词书/readme.md` 覆盖**数据编撰**（JSON 格式、导入命令、文件清单），本文件覆盖**代码集成**（页面/API/后端表/业务逻辑/关键文件索引）。做数据时看知识库，写代码时看本文件。

## 学习板块概览

学习板块是文言雀的核心，覆盖从词书选择、每日答题、纠错到字总结的完整回路。关联页面（共 10 个）：

| 页面 | 路径 | 角色 |
|------|------|------|
| 学习首页 | `pages/index/` | TabBar 1，搜索框、勋章倒计时、词书进度、今日任务、快捷入口 |
| 学习页 | `pages/study/` | 核心：句子答题→纠错→字总结 |
| 字总结 | `pages/word-summary/` | 大字展示+义项+字型+记忆口诀 |
| 学习完成 | `pages/study-complete/` | 统计+新勋章+诗词 |
| 词书选择 | `pages/book-select/` | 9 本词书，平铺展示，右上角「打卡版」/「阅读版」标签 |
| 词书详情 | `pages/book-detail/` | 单本词书详情 |
| 错题本 | `pages/mistake-book/` | 自动收录+连续答对移出 |
| 生词本 | `pages/vocabulary/` | 全部词按困难/模糊/熟悉/掌握分类 |
| 勋章墙 | `pages/badges/` | 8 枚累计学习天数勋章 |
| 打卡日历 | `pages/calendar/` | 月视图打卡 |
| 全局搜索 | `pages/search/` | 实时搜索完整义项 |

错误反馈入口：学习页（纠错视图底部"内容有误？"）、字总结页（"反馈错误"按钮）。

---

## 知识库索引

> **互补关系**：知识库 readme 覆盖**数据编撰**（JSON 格式、标注标准、导入命令、文件清单），本文件覆盖**代码集成**（页面/API/后端表/业务逻辑/关键文件索引）。做数据时看知识库，写代码时看本文件。

- **词书数据唯一权威源**：`~/knowledge_library/文言文/词书/`
- **目录说明**：`~/knowledge_library/文言文/词书/readme.md` — 记录了文件清单、导入命令、参考资料子目录（`中考词书参考资料/`、`高考词书参考资料/`）、数据约定
- **词书 JSON 文件**：中考 4 本已完成（共 279 词），高考 4 本已完成（共 268 词），虚词深度解析 1 本（54 词）。文件名和具体词数见知识库 readme 的文件清单表

---

## 数据模型

词书通过 kid 引用选篇 keyWords，选篇 keyWords 是唯一权威数据源。`quizItem.definition` 直接从 article_keyword 取，quizItem 直接存储 sentenceText/sentenceTranslation/sentenceSource。

核心类型见 [[classical-chinese-data-model]]，这里只列学习板块最常涉及的：

| 类型 | 关键字段 |
|------|---------|
| `IWordBook` | `id, name, category, studyMode? ('standard'|'identify_first'|'readonly'), identifyPrompt?, examLevel? ('zhongkao'|'gaokao'|'all'), initialized?, totalWords, wordEntries: IWordEntry[]` |
| `IWordEntry` | `id, character, pinyin, wordType? ('shi'|'xu'|'tongjia'|'gujinyi'|'huoyong'), characterType?, explanation?, oracleForm?, examFrequency?, mnemonic?, similarHomophones[], similarShapes[], keyWordRefs: IKeyWordRef[], quizItems?: IQuizItem[], usages?: IWordUsage[]` |
| `IKeyWordRef` | `kid, word?, definition?, sentenceText?, sentenceTranslation?, articleId?, articleTitle?`（kid 引用选篇 keyWords，义项信息来自 article_keyword） |
| `IQuizItem` | `id, kidRef, targetWord, definition, difficulty, distractors[], sentenceText?, sentenceTranslation?, sentenceSource?, articleId?, audioUrl?` |
| `IWordUsage` | `usageType, definition, exampleSentence, exampleTranslation, exampleSource`（readonly 词书专用） |
| `ITodayTask` | `date, wordBookId, reviewWords[], newWords[], totalWords` |
| `ITodayWord` | `entryId, character, isReview, reviewStage?, quizItems: IQuizItem[]` |
| `IStudySession` | `words: ITodayWord[], currentWordIndex, currentSentenceIndex, mode, completedCount, correctCount, wrongCount, xpGained, startTime` |
| `IMistakeRecord` | `entryId, character, pinyin, wordBookName, totalErrors, lastErrorTime, sentences: IMistakeSentence[]` |
| `IMistakeSentence` | `quizItemId, sentenceText, wrongAnswer, correctAnswer, errorCount, consecutiveCorrect` |
| `IBadge` | `id, name, description, icon, category ('streak')` |
| `IVocabularyItem` | `wordId, character, masteryLevel ('new'|'difficult'|'unclear'|'familiar'|'mastered')` |

### 9 本词书清单

| 词书 | ID | 词数 | examLevel | studyMode | initialized |
|------|------|:--:|------|------|:--:|
| 中考实词虚词一本通 | `wb_zhongkao_shixu` | 168 | `zhongkao` | `standard` | ✅ |
| 中考通假字一本通 | `wb_zhongkao_tongjia` | 35 | `zhongkao` | `identify_first` | ✅ |
| 中考古今异义一本通 | `wb_zhongkao_gujinyi` | 50 | `zhongkao` | `identify_first` | ✅ |
| 中考词类活用一本通 | `wb_zhongkao_cileihuoyong` | 26 | `zhongkao` | `identify_first` | ✅ |
| 高考通假字一本通 | `wb_gaokao_tongjia` | 53 | `gaokao` | `identify_first` | ✅ |
| 高考古今异义一本通 | `wb_gaokao_gujinyi` | 50 | `gaokao` | `identify_first` | ✅ |
| 高考词类活用一本通 | `wb_gaokao_cileihuoyong` | 30 | `gaokao` | `identify_first` | ✅ |
| 高考实词虚词一本通 | `wb_gaokao_shixu` | 135 | `gaokao` | `standard` | ✅ |
| 文言文虚词深度解析 | `wb_function_words` | 54 | `all` | `readonly` | ✅ |

### 三种学习模式

- **standard**：句子 → 4选1释义 → 纠错 → 字总结。实词虚词用此模式。
- **identify_first**：句子 → **从句子逐字中选择目标字** → 4选1释义 → 纠错 → 字总结。通假字/古今异义/词类活用用此模式。
  - 单字词：点选即提交
  - 双字词：点两个相邻字后点确认按钮
  - 标点符号灰色不可选
  - 选错红色闪烁 0.6s 后重置，选对绿色高亮 0.6s 后自动进入答题
  - 前置步骤选错不计入艾宾浩斯评分
- **readonly**：纯阅读浏览模式，不走答题回路。点击词头手风琴展开/收起全部用法，每条用法配例句+译文+出处。用于文言文虚词深度解析。

---

## 后端表/API 速查

| 表 | 用途 |
|----|------|
| `word_book` | 词书元数据（含 `exam_level`、`initialized`） |
| `word_book_entry` | 词条数据，含 similar_homophones/similar_shapes JSON 列 |
| `word_entry_keyword_ref` | 词条→article_keyword 引用 |
| `quiz_item` | 答题项，直接存储 sentenceText/sentenceTranslation/sentenceSource |
| `quiz_distractor` | 答题干扰项 |
| `word_usage` | 虚词用法详解（readonly 词书专用） |
| `study_task` | 今日任务 |

| API | 方法/路径 | 用途 |
|-----|-----------|------|
| fetchWordBooks | `GET /api/wordbooks` | 词书列表 |
| fetchWordBookDetail | `GET /api/wordbooks/:id` | 词书详情（返回 wordEntries 含 keyWordRefs + quizItems） |
| fetchTodayTask | `GET /api/study/today` | 今日任务（返回 ITodayWord[]，quizItems 含 sentenceText + definition + distractors） |
| submitAnswer | `POST /api/study/answer` | 提交答案（参数：entryId + quizItemId） |
| completeWord | `POST /api/study/word-complete` | 字词完成，即时发放 XP |
| completeStudy | `POST /api/study/complete` | 学习完成 |
| fetchProgress | `GET /api/progress` | 学习进度 |
| fetchVocabulary | `GET /api/vocabulary` | 生词本 |
| fetchCheckinRecords | `GET /api/checkin` | 打卡记录 |
| fetchBadges | `GET /api/badges` | 勋章 |
| fetchMistakes | `GET /api/study/mistakes` | 错题本（entryId + quizItemId） |
| removeMistake | `DELETE /api/study/mistakes/:entryId` | 移出错题 |
| fetchWordDetail | `GET /api/words/:entryId` | 单字详情（返回 IWordEntry） |
| searchWords | `GET /api/words/search?keyword=` | 全局搜索 |
| fetchUserProfile | `GET /api/user/profile` | 用户等级+XP+hasShared |
| submitFeedback | `POST /api/feedback` | 错误反馈 |

---

## 核心学习回路

```
每日任务生成 → 句子答题 → 纠错（正确/错误/不知道）→ 字总结 → 学习完成
```

- **答题逻辑**：正确答案 = `quizItem.definition`，直接从 article_keyword 取。`showMeaningQuestion()` 中 `correctAnswer = sent.definition`
- **字总结**：义项列表由 quizItem 驱动，短例句从 quizItem.sentenceText 取
- **艾宾浩斯**：0→+1d→+2d→+4d→+7d→+15d→+30d→done。答对 stage+1，答错/不知道 reset 到 0。客户端调度（`utils/ebbinghaus.ts`），服务端只记录答案
- **复习优先于新学**。复习和新学各自独立乱序（Fisher-Yates），复习仍优先
- **一字多句**：每个字通过多个 quizItems 连续展示，全部答完后进入字总结
- **干扰项设计**：同字异义、形近字释义、微殊表述
- **Resume 模式**：字总结返回后通过 `_needResume` 标志 + `onShow()` 推进到下一题
- **答题页按钮**："不知道"始终显示（不隐藏），"继续"始终显示但答题前为禁用态（半透明+pointer-events:none）

---

## 错题本

- **收录**：答错时自动收录，`totalErrors += 1`
- **移出**：答对时该句 `consecutiveCorrect + 1`，达到阈值（默认 3）后该句子移出；所有句子移出后整字消失
- **展示**：卡片按字折叠，展开后按句子分块（虚线分隔）；筛选：全部/高频/近期
- 后端 `study_mistake` + `study_mistake_sentence` 两张表，`submitAnswer` 中自动收录/更新/移出
- 句子文本直接从 quizItem 取

---

## 语音播报

`utils/tts.ts` 双引擎（HTTP API + WechatSI 插件），当前使用 `wechat` 引擎。资源管理：playId 机制防止并发回调泄漏，同一时刻最多一个 InnerAudioContext，`stop()` 立即终止合成链。选篇/经典阅读器：用户手动点击喇叭才开始播放，不自动播报。学习页：`showNextQuestion` 根据 `autoPlayAudio` 设置自动播报，喇叭按钮手动控制。WechatSI 单次合成上限约 150 字，长文本自动按标点切段拼接。

---

## 词书新增/修改流程

> 完整导入命令见知识库 readme。

### 新增一本词书

1. 在知识库 `~/knowledge_library/文言文/词书/` 编写词书 JSON（**100% 取自教材真实出处**，格式见知识库 readme）
2. 校验 + 导入后端（幂等，命令见知识库 readme）
3. 前端 `mock/wordBooks.ts` 新增精简 mock 数据（验证用）
4. `pages/book-select/` 无需改动——词书列表从 API 拉取，新词书自动出现
5. 更新知识库 readme 文件清单 + 本文件词书清单表

### 修改已有词书

1. 编辑知识库 JSON → 校验 → 重新导入（幂等）
2. 前端无需改动

---

## 当前进度

### 已完成
- ✅ 中考 4 本词书（共 279 词）
- ✅ 高考 4 本词书（共 268 词）
- ✅ 文言文虚词深度解析（54 词，readonly 模式）
- ✅ 两种学习模式（standard + identify_first）
- ✅ 核心学习回路（答题→纠错→字总结→完成）
- ✅ 词书选篇架构（词书通过 kid 引用选篇 keyWords）
- ✅ 错题本（自动收录/移出）
- ✅ 全局搜索
- ✅ 勋章系统（8 枚累计天数勋章）
- ✅ 打卡日历（月视图）
- ✅ 生词本
- ✅ 语音播报（WechatSI 插件）
- ✅ 词书选择页（去掉了 Tab 过滤，9 本词书平铺展示；右上角显示「打卡版」或「阅读版」标签）
- ✅ 艾宾浩斯客户端引擎 + 服务端记录
- ✅ 错误反馈（学习页 + 字总结页）
- ✅ 学习顺序（顺序/乱序，复习和新学各自独立 shuffle）
- ✅ 答题音效反馈（utils/audio-feedback.ts，WebAudioContext 合成）
- ✅ 诗句库扩充至 20 条（constants/config.ts ENCOURAGEMENT_POEMS）
- ✅ 出处链接到选篇阅读（articleId 关联）
- ✅ 「我的」页面勋章入口调整至右上角胶囊按钮
- ✅ 分享跟踪与门禁（member_level + 金石契）
- ✅ 会员级别系统
- ✅ 首页艾宾浩斯提示
- ✅ quizItem.kidRef 全覆盖：452 条空 kidRef → 0，8 本词书 1365 条全补齐

### 待开发
（无）

### 数据维护脚本

| 脚本 | 用途 |
|------|------|
| `scripts/fill_kidref.py` | 词书 quizItem.kidRef 填充（word+definition 语义匹配 + sentenceText 消歧） |
| `scripts/normalize_articles.py` | articles_*.json 规范化（wordType/wordBookId 补全、脏数据清理） |
| `scripts/backfill_sentences.py` | 从词书 quizItem 回填缺失句子到 articles_*.json |

## 关键文件索引

| 层 | 文件 | 角色 |
|----|------|------|
| 知识库 | `~/knowledge_library/文言文/词书/readme.md` | 词书目录说明 |
| 知识库 | `~/knowledge_library/文言文/词书/wb_*.json` | 词书唯一权威数据源（9 本） |
| 前端 | `pages/study/index.*` | 核心学习页（含 preStep 屏幕） |
| 前端 | `pages/word-summary/index.*` | 字总结（义项列表由 quizItem 驱动） |
| 前端 | `pages/study-complete/index.*` | 学习完成 |
| 前端 | `pages/book-select/index.*` | 词书选择（平铺展示） |
| 前端 | `pages/book-detail/index.*` | 词书详情 |
| 前端 | `pages/mistake-book/index.*` | 错题本 |
| 前端 | `pages/vocabulary/index.*` | 生词本 |
| 前端 | `pages/badges/index.*` | 勋章墙 |
| 前端 | `pages/calendar/index.*` | 打卡日历 |
| 前端 | `pages/search/index.*` | 全局搜索 |
| 前端 | `pages/word-reader/index.*` | 虚词深度解析阅读页（readonly） |
| 前端 | `utils/ebbinghaus.ts` | 艾宾浩斯引擎 |
| 前端 | `utils/tts.ts` | 语音播报双引擎 |
| 前端 | `utils/storage.ts` | 本地缓存（设置/会话） |
| 前端 | `mock/wordBooks.ts` | 词书 Mock |
| 前端 | `api/index.ts` | 统一接口层 |
| 前端 | `typings/index.d.ts` | 类型定义（IWordEntry, IQuizItem, IKeyWordRef 等） |
| 后端 | `controller/WordBookController.java` | 词书 API |
| 后端 | `controller/StudyController.java` | 学习 API |
| 后端 | `service/DataImportService.java` | importWordBook() 幂等导入 |
| 后端 | `service/StudyService.java` | 学习核心逻辑（quizItem 驱动） |
| 后端 | `service/ContentService.java` | getWordDetail（义项列表由 quizItem 驱动） |
| 后端 | `src/main/resources/source.json` | 全量冷启动数据 |

[[backend-infrastructure]]
[[articles-section]]
