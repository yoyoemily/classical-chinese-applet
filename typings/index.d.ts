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
  words: IWord[]
  /** 学习模式：standard = 直接选题，identify_first = 先识别目标字再选题 */
  studyMode?: 'standard' | 'identify_first'
  /** 前置步骤提示文案（仅 identify_first 模式有效，兜底按 category 自动生成） */
  identifyPrompt?: string
  /** 考试级别：zhongkao / gaokao */
  examLevel?: 'zhongkao' | 'gaokao'
  /** 词书是否已完成初始化（含真实数据），未初始化的不可选择 */
  initialized?: boolean
}

export interface IMeaning {
  definition: string
  /** 本义项的读音（多音字时区分），如 "zhì" */
  pinyin?: string
  /** 例句原文 */
  example: string
  /** 例句翻译 */
  translation?: string
  /** 例句出处，如 "《出师表》" */
  source?: string
}

export type SentenceDifficulty = 'basic' | 'medium' | 'hard'

export interface ISentence {
  id: string
  text: string
  source: string
  translation: string
  targetWord: string
  correctMeaningIndex: number
  difficulty: SentenceDifficulty
  distractors: string[]
  fullText?: string
  /** 句子所属名篇 id，有则可在学习页点击跳转到名篇阅读页 */
  articleId?: string
  /** 句子预录音频 URL，有则优先使用，无则走 TTS 合成 */
  audioUrl?: string
}

export interface IWord {
  id: string
  character: string
  pinyin: string
  meanings: IMeaning[]
  sentences: ISentence[]
  similarHomophones: string[]
  similarShapes: string[]

  // ---- 字总结页展示字段 ----
  /** 字型：象形字 / 指事字 / 会意字 / 形声字 */
  characterType?: string
  /** 字形解释 */
  explanation?: string
  /** 甲骨文图片 URL */
  oracleForm?: string
  /** 考试频次，如 "5年3考" */
  examFrequency?: string

  /** 记忆口诀 */
  mnemonic?: string
  /** 字词类型：实词 / 虚词 / 通假字 / 古今异义 / 词类活用 */
  wordType?: '实词' | '虚词' | '通假字' | '古今异义' | '词类活用'
}

// ============================================
// 名篇
// ============================================
export type ArticleCategory = 'prose' | 'argument' | 'poem' | 'verse'
export type TextbookGrade = 'grade7a' | 'grade7b' | 'grade8a' | 'grade8b' | 'grade9a' | 'grade9b'
  | 'grade10a' | 'grade10b' | 'grade11a' | 'grade11b' | 'grade12a' | 'grade12b'
export type EducationStage = 'all' | 'junior' | 'senior'

export interface IArticleKeyWord {
  word: string
  definition: string
  wordBookId?: string
  masteryLevel?: MasteryLevel
}

/** 典故注释：句中的文化背景词条 */
export interface IGlossaryItem {
  /** 被标注的词或短语 */
  word: string
  /** 文化背景释义 */
  definition: string
}

/**
 * 逐字标注角色（已废弃，保留兼容）
 * @deprecated 典故注释模式已改用 glossary 字段
 */
export type CharRole = 'content' | 'function' | 'punct' | 'plain'

/**
 * @deprecated 典故注释模式已改用 IGlossaryItem
 */
export interface ICharAnnotation {
  /** 单个汉字或标点 */
  char: string
  /** content=实词, function=虚词, punct=标点, plain=无需标注 */
  role: CharRole
  /** 释义（实词必填，虚词可选，标点/plain 无） */
  definition?: string
}

export interface IArticleSentence {
  text: string
  translation: string
  keyWords: IArticleKeyWord[]
  audioUrl?: string
  /** 典故注释：句中文化背景词条，用于典故注释模式 */
  glossary?: IGlossaryItem[]
  /**
   * 逐字标注（已废弃，保留兼容）
   * @deprecated 典故注释模式已改用 glossary 字段
   */
  charAnnotations?: ICharAnnotation[]
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
  relatedWordIds: string[]
}

export type ArticleMastery = 'none' | 'read' | 'understood' | 'memorized'

export interface IArticleProgress {
  articleId: string
  /** 已点击阅读的句子数 */
  readProgress: number
  /** 掌握程度 */
  mastery: ArticleMastery
  lastReadDate?: string
}

// ============================================
// 学习进度
// ============================================
export type MasteryLevel = 'new' | 'difficult' | 'unclear' | 'familiar' | 'mastered'
export type ReviewStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 'done'

export interface IAnswerRecord {
  sentenceId: string
  selectedOption: number
  correct: boolean
  timestamp: number
}

export interface IWordProgress {
  wordId: string
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
  articleProgresses: Record<string, IArticleProgress>
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
  wordId: string
  character: string
  isReview: boolean
  reviewStage?: ReviewStage
  sentences: ISentence[]
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
  sentenceId: string
  sentenceText: string
  /** 用户选择了什么 */
  wrongAnswer: string
  /** 正确答案 */
  correctAnswer: string
  /** 该句子的累计错误次数 */
  errorCount: number
  /** 该句子的连续答对次数（达到阈值自动移出） */
  consecutiveCorrect: number
}

export interface IMistakeRecord {
  wordId: string
  character: string
  pinyin: string
  /** 所有句子的错误次数之和（冗余字段，避免页面遍历计算） */
  totalErrors: number
  /** 最近一次答错时间 */
  lastErrorTime: string
  /** 各句子的错题记录 */
  sentences: IMistakeSentence[]
}

// ============================================
// 全局搜索
// ============================================
export interface IWordSearchResult {
  wordId: string
  character: string
  pinyin: string
  /** 该词的所有义项 */
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
  startTime: number
}

// ============================================
// 错误反馈
// ============================================

/** 反馈来源：learning=学习答题, word_summary=字总结, article_reader=名篇阅读 */
export type FeedbackSource = 'learning' | 'word_summary' | 'article_reader'

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
// 学习汇总缓存（study-complete 页秒开用）
// ============================================
export interface IStudySummary {
  correctCount: number
  wrongCount: number
  xpGained: number
}

// ============================================
// 经典著作
// ============================================
export interface IClassicItem {
  id: number
  name: string
  era: string
  icon: string
  description: string
  category: string
}
