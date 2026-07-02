// ============================================
// 本地存储工具（模拟后端，MVP 用本地数据）
// ============================================
import type {
  IUserProgress, IWordProgress, IUserBadge,
  ITodayTask, IArticleProgress
} from '../typings/index.d';
import { STORAGE_KEYS } from '../constants/config';
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
export function getWordProgress(wordId: string): IWordProgress | undefined {
  return getProgress().wordProgresses[wordId];
}

/**
 * 更新单字进度
 */
export function setWordProgress(wordId: string, wp: IWordProgress): void {
  const progress = getProgress();
  const existed = progress.wordProgresses[wordId];
  progress.wordProgresses[wordId] = wp;

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

// ============================================
// 打卡相关
// ============================================
export function checkinToday(): void {
  const progress = getProgress();
  const today = new Date().toISOString().split('T')[0];
  if (progress.checkinDates.includes(today)) return;

  // 计算连续打卡
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

  saveProgress(progress);
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
  }));
}

export function loadWordBookData(bookId: string) {
  return mockWordBooks.find(wb => wb.id === bookId) ?? null;
}

export function getWordById(bookId: string, wordId: string) {
  const book = loadWordBookData(bookId);
  if (!book) return null;
  return book.words.find(w => w.id === wordId) ?? null;
}

// ============================================
// 当前词书管理
// ============================================
export function getCurrentBookId(): string {
  const saved = wx.getStorageSync(STORAGE_KEYS.CURRENT_BOOK);
  if (saved) return saved;
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
