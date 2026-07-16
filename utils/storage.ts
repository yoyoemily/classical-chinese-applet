// ============================================
// 本地存储工具（模拟后端，MVP 用本地数据）
// ============================================
import type {
  IUserProgress, IWordProgress, IUserBadge,
  ITodayTask, IArticleProgress, IUserProfile, IMistakeRecord, IStudySummary
} from '../typings/index.d';
import { STORAGE_KEYS, DEFAULT_MISTAKE_REMOVE_THRESHOLD } from '../constants/config';
import { safeJSONParse } from './util';
import { mockWordBooks } from '../mock/wordBooks';

/**
 * 获取用户进度
 */
export function getProgress(): IUserProgress {
  const raw = wx.getStorageSync(STORAGE_KEYS.PROGRESS);
  if (!raw) {
    return createDefaultProgress();
  }
  try {
    const saved = JSON.parse(raw) as IUserProgress;
    // 确保新版结构兼容
    return {
      ...createDefaultProgress(),
      ...saved,
      wordProgresses: saved.wordProgresses || {},
      articleProgresses: saved.articleProgresses || {},
    };
  } catch {
    return createDefaultProgress();
  }
}

function createDefaultProgress(): IUserProgress {
  return {
    wordBookId: '',
    wordsLearned: 0,
    wordsMastered: 0,
    checkinDates: [],
    currentStreak: 0,
    longestStreak: 0,
    totalXP: 0,
    wordProgresses: {},
    articleProgresses: {},
  };
}

/**
 * 保存用户进度
 */
export function saveProgress(progress: IUserProgress): void {
  wx.setStorageSync(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
}

/**
 * 获取单字进度
 */
export function getWordProgress(entryId: string): IWordProgress | undefined {
  return getProgress().wordProgresses[entryId];
}

/**
 * 更新单字进度
 */
export function setWordProgress(entryId: string, wp: IWordProgress): void {
  const progress = getProgress();
  const existed = progress.wordProgresses[entryId];
  progress.wordProgresses[entryId] = wp;

  // 更新计数
  if (!existed && wp.stage !== 'done') {
    progress.wordsLearned++;
  }
  if (wp.stage === 'done' && existed?.stage !== 'done') {
    progress.wordsMastered++;
  }

  saveProgress(progress);
}

/**
 * 获取名篇阅读进度
 */
export function getArticleProgress(articleId: string): IArticleProgress | undefined {
  return getProgress().articleProgresses[articleId];
}

/**
 * 更新名篇阅读进度
 */
export function setArticleProgress(articleId: string, ap: IArticleProgress): void {
  const progress = getProgress();
  progress.articleProgresses[articleId] = ap;
  saveProgress(progress);
}

/**
 * 获取用户勋章
 */
export function getUserBadges(): IUserBadge[] {
  const raw = wx.getStorageSync(STORAGE_KEYS.BADGES);
  return safeJSONParse<IUserBadge[]>(raw, []);
}

/**
 * 添加勋章
 */
export function addUserBadge(badgeId: string): void {
  const badges = getUserBadges();
  if (badges.find(b => b.badgeId === badgeId)) return;
  badges.push({
    badgeId,
    earnedDate: new Date().toISOString().split('T')[0],
    notified: false,
  });
  wx.setStorageSync(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

/**
 * 批量添加勋章（仅一次读写，避免循环内重复 get/set）
 */
export function addUserBadges(badgeIds: string[]): void {
  if (badgeIds.length === 0) return;
  const badges = getUserBadges();
  const existingIds = new Set(badges.map(b => b.badgeId));
  const today = new Date().toISOString().split('T')[0];
  for (const id of badgeIds) {
    if (!existingIds.has(id)) {
      badges.push({ badgeId: id, earnedDate: today, notified: false });
    }
  }
  wx.setStorageSync(STORAGE_KEYS.BADGES, JSON.stringify(badges));
}

// ============================================
// 打卡相关
// ============================================
export function checkinToday(): void {
  const progress = getProgress();
  _applyCheckin(progress);
  saveProgress(progress);
}

/**
 * 打卡逻辑（纯数据，不读写存储），供 completeStudy 复用
 */
export function _applyCheckin(progress: IUserProgress): void {
  const today = new Date().toISOString().split('T')[0];
  if (progress.checkinDates.includes(today)) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (progress.checkinDates.includes(yesterday)) {
    progress.currentStreak++;
  } else {
    progress.currentStreak = 1;
  }

  if (progress.currentStreak > progress.longestStreak) {
    progress.longestStreak = progress.currentStreak;
  }

  progress.checkinDates.push(today);
  progress.totalXP += 20;
  if (progress.currentStreak % 7 === 0) {
    progress.totalXP += 50;
  }
}

export function isCheckedInToday(): boolean {
  const progress = getProgress();
  const today = new Date().toISOString().split('T')[0];
  return progress.checkinDates.includes(today);
}

// ============================================
// 词书数据加载
// ============================================
export function loadWordBooks() {
  return mockWordBooks.map(wb => ({
    id: wb.id,
    name: wb.name,
    description: wb.description,
    category: wb.category,
    coverColor: wb.coverColor,
    totalWords: wb.words.length,
    studyMode: wb.studyMode,
    identifyPrompt: wb.identifyPrompt,
    examLevel: wb.examLevel,
    initialized: wb.initialized,
  }));
}

export function loadWordBookData(bookId: string) {
  return mockWordBooks.find(wb => wb.id === bookId) ?? null;
}

export function getWordById(bookId: string, entryId: string) {
  const book = loadWordBookData(bookId);
  if (!book) return null;
  return book.words.find(w => w.id === entryId) ?? null;
}

// ============================================
// 当前词书管理
// ============================================

/** 旧版合辑/旧 Mock 词书 ID → 新版分册 ID 迁移 */
const BOOK_ID_MIGRATION: Record<string, string> = {
  'wb_zhongkao_001': 'wb_zhongkao_shixu',
  'wb_middle_001': 'wb_zhongkao_shixu',
  'wb_tongjia_002': 'wb_zhongkao_tongjia',
  'wb_ancient_001': 'wb_zhongkao_gujinyi',
  'wb_flexible_001': 'wb_zhongkao_cileihuoyong',
};

export function getCurrentBookId(): string {
  const saved = wx.getStorageSync(STORAGE_KEYS.CURRENT_BOOK);
  // 迁移旧 ID
  const migrated = saved && BOOK_ID_MIGRATION[saved] ? BOOK_ID_MIGRATION[saved] : saved;
  if (migrated) {
    // 写回迁移后的 ID
    if (migrated !== saved) {
      wx.setStorageSync(STORAGE_KEYS.CURRENT_BOOK, migrated);
    }
    return migrated;
  }
  const books = loadWordBooks();
  const first = books[0]?.id ?? '';
  if (first) wx.setStorageSync(STORAGE_KEYS.CURRENT_BOOK, first);
  return first;
}

export function setCurrentBookId(bookId: string): void {
  wx.setStorageSync(STORAGE_KEYS.CURRENT_BOOK, bookId);
}

// ============================================
// 学习会话管理
// ============================================
export function saveSession(session: unknown): void {
  wx.setStorageSync(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function loadSession<T>(): T | null {
  const raw = wx.getStorageSync(STORAGE_KEYS.SESSION);
  return safeJSONParse<T>(raw, null as unknown as T);
}

export function clearSession(): void {
  wx.removeStorageSync(STORAGE_KEYS.SESSION);
}

// ============================================
// 用户个人信息
// ============================================
const DEFAULT_USER_PROFILE: IUserProfile = {
  avatarUrl: '',
  nickName: '',
  grade: '',
};

export function getUserProfile(): IUserProfile {
  const raw = wx.getStorageSync(STORAGE_KEYS.USER_PROFILE);
  if (!raw) return { ...DEFAULT_USER_PROFILE };
  try {
    const saved = JSON.parse(raw) as Partial<IUserProfile>;
    return {
      avatarUrl: saved.avatarUrl || '',
      nickName: saved.nickName || '',
      grade: saved.grade || '',
    };
  } catch {
    return { ...DEFAULT_USER_PROFILE };
  }
}

export function saveUserProfile(profile: IUserProfile): void {
  wx.setStorageSync(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

// ============================================
// 错题本（本地缓存，后台同步）
// ============================================
export function getMistakes(): IMistakeRecord[] {
  const raw = wx.getStorageSync('mistakeBook');
  const parsed = safeJSONParse<IMistakeRecord[]>(raw, []);
  // 迁移旧格式：扁平字段 → 嵌套 sentences 数组
  return parsed.map(m => {
    if (m.sentences && m.sentences.length > 0) {
      return m;
    }
    // 旧格式：将扁平字段转为单个句子的数组
    const errorCount = (m as Record<string, unknown>).errorCount as number || 0;
    return {
      entryId: m.entryId,
      character: m.character,
      pinyin: m.pinyin,
      totalErrors: errorCount,
      lastErrorTime: m.lastErrorTime,
      sentences: [{
        quizItemId: (m as Record<string, unknown>).quizItemId as string || '',
        sentenceText: (m as Record<string, unknown>).sentenceText as string || '',
        wrongAnswer: (m as Record<string, unknown>).wrongAnswer as string || '',
        correctAnswer: (m as Record<string, unknown>).correctAnswer as string || '',
        errorCount,
        consecutiveCorrect: (m as Record<string, unknown>).consecutiveCorrect as number || 0,
      }],
    };
  });
}

export function saveMistakes(mistakes: IMistakeRecord[]): void {
  wx.setStorageSync('mistakeBook', JSON.stringify(mistakes));
}

export function addMistake(record: IMistakeRecord): void {
  const mistakes = getMistakes();
  const idx = mistakes.findIndex(m => m.entryId === record.entryId);
  if (idx >= 0) {
    mistakes[idx] = record;
  } else {
    mistakes.push(record);
  }
  saveMistakes(mistakes);
}

export function removeMistake(entryId: string): void {
  const mistakes = getMistakes().filter(m => m.entryId !== entryId);
  saveMistakes(mistakes);
}

export function getMistakeRemoveThreshold(): number {
  const raw = wx.getStorageSync('mistake_remove_threshold');
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return parsed > 0 ? parsed : DEFAULT_MISTAKE_REMOVE_THRESHOLD;
}

export function setMistakeRemoveThreshold(threshold: number): void {
  wx.setStorageSync('mistake_remove_threshold', threshold);
}

// ============================================
// 学习汇总缓存（study-complete 页秒开，不打 API）
// ============================================
const STUDY_SUMMARY_KEY = 'study_summary';

/** 初始化学习汇总缓存（开始时调） */
export function initStudySummary(): void {
  const summary: IStudySummary = { correctCount: 0, wrongCount: 0, xpGained: 0 };
  wx.setStorageSync(STUDY_SUMMARY_KEY, JSON.stringify(summary));
}

/** 每次答题后递增正确/错误计数 */
export function incrementStudySummary(isCorrect: boolean): void {
  const summary = getStudySummary();
  if (!summary) return;
  if (isCorrect) {
    summary.correctCount++;
  } else {
    summary.wrongCount++;
  }
  wx.setStorageSync(STUDY_SUMMARY_KEY, JSON.stringify(summary));
}

export function getStudySummary(): IStudySummary | null {
  const raw = wx.getStorageSync(STUDY_SUMMARY_KEY);
  return safeJSONParse<IStudySummary>(raw, null as unknown as IStudySummary);
}

export function clearStudySummary(): void {
  wx.removeStorageSync(STUDY_SUMMARY_KEY);
}
