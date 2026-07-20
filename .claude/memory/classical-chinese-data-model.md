---
name: classical-chinese-data-model
description: 完整数据模型，覆盖全部 TypeScript 类型定义（v2 架构，2026-07-16 重构完成）
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e130794-4d2c-4028-b952-10a2a4e384b5
---

## 数据模型（v2 架构）

所有类型定义在 `typings/index.d.ts`。

### 词书 & 词条（v2：词书引用选篇 keyWords）

- **IWordBook**: id, name, description, category, coverColor, studyMode? ('standard'|'identify_first'|'readonly'), identifyPrompt?, examLevel? ('zhongkao'|'gaokao'), initialized?, totalWords, wordEntries: IWordEntry[]
- **IWordEntry**（替代旧 IWord）: id, character, pinyin, wordType? ('shi'|'xu'|'tongjia'|'gujinyi'|'huoyong'), characterType?, explanation?, oracleForm?, examFrequency?, mnemonic?, similarHomophones[], similarShapes[], keyWordRefs: IKeyWordRef[], quizItems?: IQuizItem[], usages?: IWordUsage[]
- **IKeyWordRef**（替代旧 IMeaning）: kid, word?, definition?, sentenceText?, sentenceTranslation?, articleId?, articleTitle?
- **IQuizItem**（替代旧 ISentence）: id, kidRef, targetWord, definition（正确答案=article_keyword.definition，不再用 correctMeaningIndex 桥接）, difficulty, distractors[], sentenceText?, sentenceTranslation?, sentenceSource?, articleId?, audioUrl?
- **IWordUsage**（readonly 词书专用）: usageType, definition, exampleSentence, exampleTranslation, exampleSource

### 名篇（v2：keyWords 含 kid/wordType/matchWord）

- **IArticle**: id, title, author, dynasty, category ('prose'|'argument'|'poem'|'verse'), textbook?, background?, fullTextAudioUrl?, sentences: IArticleSentence[], keywordCount
- **IArticleSentence**: text, translation, keyWords: IArticleKeyWord[], glossary?: IGlossaryItem[], audioUrl?, rareCharPinyin?
- **IArticleKeyWord**: word, definition, wordBookId?, masteryLevel?, kid? (全局唯一标识), matchWord? (消歧定位用), wordType? ('shi'|'xu'|'tongjia'|'gujinyi'|'huoyong')
- **IGlossaryItem**: word, definition（典故注释词条，不关联词书）

### 进度类型

- **IUserProgress**: wordBookId, wordsLearned, wordsMastered, checkinDates, currentStreak, longestStreak, totalXP, wordProgresses: Record<string, IWordProgress>
- **IWordProgress**: entryId, stage (0-6|'done'), nextReviewDate, correctCount, wrongCount, resetCount, history: IAnswerRecord[]
- **IAnswerRecord**: quizItemId, selectedOption, correct, timestamp

### 学习会话类型

- **ITodayTask**: date, wordBookId, wordBookName, reviewWords: ITodayWord[], newWords: ITodayWord[], totalWords, estimatedMinutes
- **ITodayWord**: entryId, character, isReview, reviewStage?, quizItems: IQuizItem[]
- **IStudySession**: words: ITodayWord[], currentWordIndex, currentSentenceIndex, mode ('review'|'new'), completedCount, correctCount, wrongCount, xpGained, startTime

### 错题本

- **IMistakeRecord**: entryId, character, pinyin, wordBookName, totalErrors, lastErrorTime, sentences: IMistakeSentence[]
- **IMistakeSentence**: quizItemId, sentenceText, wrongAnswer, correctAnswer, errorCount, consecutiveCorrect

### 勋章类型

- **IBadge**: id, name, description, icon, category ('streak'|'achievement'|'milestone'), condition
- **IUserBadge**: badgeId, earnedDate, notified
- **IBadgeCondition**: type, value

### 等级体系

- **ILevelInfo**: level, title, minXP, maxXP

### 生词本

- **IVocabularyItem**: wordId, character, masteryLevel ('new'|'difficult'|'unclear'|'familiar'|'mastered')

### 用户个人信息

- **IUserProfile**: avatarUrl, nickName, grade, memberLevel?

### 搜索

- **IWordSearchResult**: entryId, character, pinyin, meanings[], wordBookName, wordBookId

### 经典类型

- **IClassicItem**: id (number), name, era, icon, description, category, loadMode ('full'|'chunked'), navMode ('strip'|'list'|'accordion'|'author')
- **IClassicMeta**: id, name, author, era, category, description, structureType, loadMode, navMode, toc: ITocNode[]
- **ITocNode**: id, title, level, isLeaf, children?, author?, era?
- **IContentBlock**: id, title, author?, era?, background?, paragraphs?: IChapterParagraph[]
- **IChapterParagraph**: text, translation, glossary?: IClassicGlossaryItem[], rareCharPinyin?
- **IClassicGlossaryItem**: word, explanation

### Mock Data

- 开发调试用的精简数据，位于 `mock/` 目录
- wordBooks.ts / articles.ts / classics.ts / badges.ts
- 完整词书数据以知识库 JSON 为准

### 词书数据

完整的生产级数据源，存放于 Obsidian 知识库 `~/Documents/knowledge_library/文言文/词书/`：
- **中考 4 本（已完成）**：实词虚词（168 词）+ 通假字（35 词）+ 古今异义（50 词）+ 词类活用（26 词）
- **高考 4 本（已完成）**：实词虚词（135 词）+ 通假字（53 词）+ 古今异义（50 词）+ 词类活用（30 词）
- **文言文虚词深度解析（已完成）**：54 词，readonly 模式
- v2 架构：词书 JSON 格式为 `wordEntries[].keyWordRefs[] + quizItems[]`，引用选篇 keyWords
