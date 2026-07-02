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
export type WordBookCategory = 'middle_school' | 'high_school' | 'function' | 'tongjia' | 'ancient_modern'

export interface IWordBook {
  id: string
  name: string
  description: string
  category: WordBookCategory
  coverColor: string
  totalWords: number
  words: IWord[]
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
}

// ============================================
// 名篇
// ============================================
export type ArticleCategory = 'prose' | 'argument' | 'poem' | 'verse'
export type TextbookGrade = 'grade7a' | 'grade7b' | 'grade8a' | 'grade8b' | 'grade9a' | 'grade9b'

export interface IArticleKeyWord {
  word: string
  definition: string
  wordBookId?: string
  masteryLevel?: MasteryLevel
}

export interface IArticleSentence {
  text: string
  translation: string
  keyWords: IArticleKeyWord[]
  audioUrl?: string
}

export interface IArticle {
  id: string
  title: string
  author: string
  dynasty: string
  category: ArticleCategory
  textbook?: TextbookGrade
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
// 生词本
// ============================================
export type VocabularyTab = 'all' | 'difficult' | 'unclear' | 'familiar' | 'mastered'

export interface IVocabularyItem {
  wordId: string
  character: string
  pinyin: string
  masteryLevel: MasteryLevel
  progress: number
  stage: ReviewStage
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
