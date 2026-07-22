// ============================================
// 全局 App 类型
// ============================================
export interface IAppOption {
  globalData: {
    systemInfo: WechatMiniprogram.SystemInfo
    statusBarHeight: number
    userInfo?: WechatMiniprogram.UserInfo
    /** 当前选中的词书 ID */
    currentWordBookId?: string
    /** 今日学习任务缓存 */
    todayTask?: ITodayTask
    /** 登录 Promise，页面可 await 它确保登录完成后再请求 */
    loginPromise?: Promise<void>
  }
  $emit?: (event: string, ...args: unknown[]) => void
  $on?: (event: string, callback: (...args: unknown[]) => void) => void
  $off?: (event: string, callback: (...args: unknown[]) => void) => void
}

// ============================================
// API 通用类型
// ============================================
export interface IApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}
export interface IPaginationParams {
  page: number
  pageSize: number
}
export interface IPaginationResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================
// 词书 & 字词
// ============================================
export type WordBookCategory = 'middle_school' | 'high_school' | 'function' | 'tongjia' | 'ancient_modern' | 'flexible_usage'

export interface IWordBook {
  id: string
  name: string
  description: string
  category: WordBookCategory
  coverColor: string
  totalWords: number
  wordEntries: IWordEntry[]
  /** 学习模式：standard = 直接选题，identify_first = 先识别目标字再选题，readonly = 纯阅读浏览 */
  studyMode?: 'standard' | 'identify_first' | 'readonly'
  /** 前置步骤提示文案（仅 identify_first 模式有效，兜底按 category 自动生成） */
  identifyPrompt?: string
  /** 考试级别：zhongkao / gaokao */
  examLevel?: 'zhongkao' | 'gaokao'
  /** 词书是否已完成初始化（含真实数据），未初始化的不可选择 */
  initialized?: boolean
}

// ---- 词条（替代旧 IWord） ----
export interface IWordEntry {
  id: string
  character: string
  pinyin: string
  /** 字词类型：shi / xu / tongjia / gujinyi / huoyong */
  wordType?: 'shi' | 'xu' | 'tongjia' | 'gujinyi' | 'huoyong'
  // 教学元数据
  characterType?: string
  explanation?: string
  oracleForm?: string
  examFrequency?: string
  mnemonic?: string
  similarHomophones: string[]
  similarShapes: string[]
  // kid 引用（替代旧 meanings）
  keyWordRefs: IKeyWordRef[]
  // 答题项（替代旧 sentences）
  quizItems?: IQuizItem[]
  // 虚词用法（readonly 词书专用）
  usages?: IWordUsage[]
}

export interface IKeyWordRef {
  kid: string
  /** 从 article_keyword 解析的 word_text */
  word?: string
  /** 从 article_keyword 解析的 definition */
  definition?: string
  /** 所在句子原文（从 article_sentence 解析） */
  sentenceText?: string
  /** 所在句子译文 */
  sentenceTranslation?: string
  /** 所在文章 ID */
  articleId?: string
  /** 所在文章标题 */
  articleTitle?: string
}

export interface IQuizItem {
  id: string
  kidRef: string
  /** 考查的目标字（identify_first 模式用） */
  targetWord: string
  /** 正确答案 = article_keyword.definition（不再需要 correctMeaningIndex 桥接） */
  definition: string
  difficulty: SentenceDifficulty
  distractors: string[]
  // 以下字段由后端 join article_sentence + article 填充
  /** 句子原文（从 article_sentence 解析） */
  sentenceText?: string
  /** 句子译文 */
  sentenceTranslation?: string
  /** 句子出处（文章标题） */
  sentenceSource?: string
  /** 句子所属名篇 id */
  articleId?: string
  /** 句子预录音频 URL */
  audioUrl?: string
}

export interface IWordUsage {
  usageType: string
  definition: string
  exampleSentence: string
  exampleTranslation: string
  exampleSource: string
}

export type SentenceDifficulty = 'basic' | 'medium' | 'hard'

// ============================================
// 名篇
// ============================================
export type ArticleCategory = 'prose' | 'argument' | 'poem' | 'verse'
export type TextbookGrade = 'grade7a' | 'grade7b' | 'grade8a' | 'grade8b' | 'grade9a' | 'grade9b'
  | 'grade10a' | 'grade10b' | 'grade11a' | 'grade11b' | 'grade12a'
export type EducationStage = 'all' | 'junior' | 'senior' | 'other'

export interface IArticleKeyWord {
  word: string
  definition: string
  masteryLevel?: MasteryLevel
  /** 消歧用：多字上下文片段，用于定位句中具体出现位置；前端匹配时用 matchWord，弹窗展示时用 word */
  matchWord?: string
  /** 生词类型：shi/xu/tongjia/gujinyi/huoyong */
  wordType?: 'shi' | 'xu' | 'tongjia' | 'gujinyi' | 'huoyong'
  /** 全局唯一标识（词书架构 v2） */
  kid?: string
}

/** 典故注释：句中的文化背景词条 */
export interface IGlossaryItem {
  /** 被标注的词或短语 */
  word: string
  /** 文化背景释义 */
  definition: string
}

export interface IArticleSentence {
  text: string
  translation: string
  keyWords: IArticleKeyWord[]
  audioUrl?: string
  /** 典故注释：句中文化背景词条，用于典故注释模式 */
  glossary?: IGlossaryItem[]
  /** 生僻字拼音映射 { "字": "拼音" } */
  rareCharPinyin?: Record<string, string>
}

export interface IArticle {
  id: string
  title: string
  author: string
  dynasty: string
  category: ArticleCategory
  textbook?: TextbookGrade
  background?: string
  fullTextAudioUrl?: string
  sentences: IArticleSentence[]
  keywordCount: number
  /** 当前用户是否已听读（来自 user_audio_listen_log） */
  listened?: boolean
}



// ============================================
// 学习进度
// ============================================
export type MasteryLevel = 'new' | 'difficult' | 'unclear' | 'familiar' | 'mastered'
export type ReviewStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 'done'

export interface IAnswerRecord {
  quizItemId: string
  selectedOption: number
  correct: boolean
  timestamp: number
}

export interface IWordProgress {
  entryId: string
  stage: ReviewStage
  nextReviewDate: string
  correctCount: number
  wrongCount: number
  resetCount: number
  history: IAnswerRecord[]
}

export interface IUserProgress {
  wordBookId: string
  wordsLearned: number
  wordsMastered: number
  checkinDates: string[]
  currentStreak: number
  longestStreak: number
  totalXP: number
  wordProgresses: Record<string, IWordProgress>
}

// ============================================
// 勋章 & 等级
// ============================================
export type BadgeCategory = 'streak' | 'achievement' | 'milestone'

export interface IBadgeCondition {
  type: string
  value: number
}

export interface IBadge {
  id: string
  name: string
  description: string
  icon: string
  category: BadgeCategory
  condition: IBadgeCondition
}

export interface IUserBadge {
  badgeId: string
  earnedDate: string
  notified: boolean
}

export interface ILevelInfo {
  level: number
  title: string
  minXP: number
  maxXP: number
}

// ============================================
// 学习任务
// ============================================
export interface ITodayWord {
  entryId: string
  character: string
  isReview: boolean
  reviewStage?: ReviewStage
  quizItems: IQuizItem[]
}

export interface ITodayTask {
  date: string
  wordBookId: string
  wordBookName: string
  reviewWords: ITodayWord[]
  newWords: ITodayWord[]
  totalWords: number
  estimatedMinutes: number
}

// ============================================
// 错题本
// ============================================
export type MistakeFilter = 'all' | 'frequent' | 'recent'

/** 错题本中单个句子的记录 */
export interface IMistakeSentence {
  quizItemId: string
  sentenceText: string
  wrongAnswer: string
  correctAnswer: string
  errorCount: number
  consecutiveCorrect: number
}

export interface IMistakeRecord {
  entryId: string
  character: string
  pinyin: string
  wordBookName: string
  totalErrors: number
  lastErrorTime: string
  sentences: IMistakeSentence[]
}

// ============================================
// 快捷搜索（按词类分组）
// ============================================
export interface IWordQuickItem {
  entryId: string
  character: string
  pinyin: string
}

// ============================================
// 全局搜索
// ============================================
export interface IWordSearchResult {
  entryId: string
  character: string
  pinyin: string
  /** 该词的所有义项（来自 quizItem.definition 聚合） */
  meanings: { definition: string; example: string; translation?: string; source?: string }[]
  /** 所属词书名称 */
  wordBookName: string
  wordBookId: string
}

// ============================================
// 用户个人信息
// ============================================
export interface IUserProfile {
  avatarUrl: string
  nickName: string
  grade: string
  memberLevel?: number
  recoveryDeadline?: string
}

// ============================================
// 学习会话状态
// ============================================
export type SessionMode = 'review' | 'new'

export interface IStudySession {
  words: ITodayWord[]
  currentWordIndex: number
  currentSentenceIndex: number
  mode: SessionMode
  completedCount: number
  correctCount: number
  wrongCount: number
  /** 本次学习获得的总经验值（仅新学词答对计入） */
  xpGained: number
  startTime: number
}

// ============================================
// 错误反馈
// ============================================

/** 反馈来源：learning=学习答题, word_summary=字总结, article_reader=名篇阅读 */
export type FeedbackSource = 'learning' | 'word_summary' | 'article_reader' | 'classic_reader'

/** 错误类别 */
export type FeedbackCategory =
  | 'sentence_text'    // 原文有误
  | 'translation'      // 译文有误
  | 'definition'       // 释义有误
  | 'source'           // 出处有误
  | 'annotation'       // 标注有误
  | 'article_info'     // 文章信息有误
  | 'other'            // 其他

export interface IFeedback {
  id: string
  /** 错误类别 */
  category: FeedbackCategory
  /** 反馈来源 */
  source: FeedbackSource
  /** 用户补充说明 */
  description: string
  /** 上下文信息（携带当前句子/字词/文章 ID，方便后台定位） */
  context: {
    sentenceId?: string
    wordId?: string
    articleId?: string
    readingMode?: string
    classicId?: number
    nodeId?: string | number
    nodeTitle?: string
    /** 句子原文（学习板块） */
    sentenceText?: string
    /** 选篇标题（学习板块的出处 / 选篇板块的文章标题） */
    articleTitle?: string
    /** 经典名称 */
    className?: string
  }
  timestamp: number
}

/** 提交反馈时的请求参数（不含 id、timestamp 等后端生成的字段） */
export interface IFeedbackSubmitParams {
  category: FeedbackCategory
  source: FeedbackSource
  description: string
  context: IFeedback['context']
}

// ============================================
// 意见建议
// ============================================
/** 提交意见建议的请求参数 */
export interface ISuggestionSubmitParams {
  content: string
  contact?: string
  category?: string
}

// ============================================
// 学习汇总缓存（study-complete 页秒开用）
// ============================================
export interface IStudySummary {
  correctCount: number
  wrongCount: number
  xpGained: number
  newBadge?: IBadge | null
}

// ============================================
// 经典著作
// ============================================

/** 内容加载方式 */
export type LoadMode = 'full' | 'chunked'

/** 导航 UI 形态 */
export type NavMode = 'strip' | 'list' | 'accordion' | 'author'

/** 经典著作列表项（含加载/导航字段） */
export interface IClassicItem {
  id: number
  name: string
  era: string
  icon: string
  description: string
  category: string
  /** 内容加载方式：full=全量, chunked=按需加载 */
  loadMode: LoadMode
  /** 导航 UI 形态：strip/list/accordion/author */
  navMode: NavMode
  /** 是否已完成(人工维护): 0=未完成, 1=已完成 */
  isCompleted?: number
}

// ============================================
// 经典典籍——通用目录与内容块
// ============================================

/** 目录树节点 */
export interface ITocNode {
  id: string
  title: string
  /** 层级深度 0/1/2，UI 按层级缩进 */
  level: number
  /** 是否叶子节点（可加载内容） */
  isLeaf: boolean
  /** 子节点（非叶子才有） */
  children?: ITocNode[]
  /** 篇章作者（选集型才填，章节型为 undefined） */
  author?: string
  /** 篇章朝代（选集型才填） */
  era?: string
}

/** 经典著作基本信息（轻量，不含内容） */
export interface IClassicMeta {
  id: number
  name: string
  author: string
  era: string
  category: string
  description: string
  /** 数据结构类型：chapter=章节型, anthology=选集型, volume=卷帙型 */
  structureType: 'chapter' | 'anthology' | 'volume'
  loadMode: LoadMode
  navMode: NavMode
  /** 目录树（轻量，仅标题不含内容） */
  toc: ITocNode[]
  /** 当前用户已听读的叶子节点 ID 列表 */
  listenedNodeIds?: string[]
}

/** 内容块（按需加载的叶子节点内容） */
export interface IContentBlock {
  id: string
  title: string
  /** 篇章作者（选集型才填，章节型为 undefined） */
  author?: string
  /** 篇章朝代（选集型才填） */
  era?: string
  /** 篇章创作背景 */
  background?: string
  /** 章节预录音频 URL（讯飞 TTS 合成后写入） */
  audioUrl?: string
  /** 完整原文（选集型、卷帙型用） */
  text?: string
  /** 完整译文 */
  translation?: string
  /** 段落（章节型用：分段原文+译文+典故注释） */
  paragraphs?: IChapterParagraph[]
}

// ============================================
// 经典典籍——章节型旧结构（full 加载模式下仍使用）
// ============================================

/** 注释词条：原文中的文化背景词（高亮可点击） */
export interface IClassicGlossaryItem {
  word: string
  explanation: string
}

/** 段落：原文 + 译文 + 可选注释 */
export interface IChapterParagraph {
  text: string
  translation: string
  glossary?: IClassicGlossaryItem[]
  /** 生僻字拼音映射 { "字": "拼音" } */
  rareCharPinyin?: Record<string, string>
}

/** 章节 */
export interface IClassicChapter {
  id: number
  title: string
  paragraphs: IChapterParagraph[]
}

/** 经典著作完整数据（仅 full 加载模式使用） */
export interface IClassicBook {
  id: number
  name: string
  author: string
  era: string
  category: string
  description: string
  chapters: IClassicChapter[]
}
