// ============================================
// API 接口层（MVP 阶段使用 Mock 数据，后续切换到真实 API）
// ============================================
import { get, post, put, del } from '../utils/request';
import type {
  IWordBook, IWordEntry, ITodayTask, IArticle, IApiResponse,
  IPaginationResult, IMistakeRecord, IBadge, IUserBadge, IUserProgress,
  IFeedbackSubmitParams, IUserProfile, IWordSearchResult, IClassicItem,
  IClassicBook, IClassicMeta, IContentBlock, IWordQuickItem,
  ISuggestionSubmitParams,
} from '../typings/index.d';
import { wordTypeToGroupKey, QUICK_GROUP_ORDER } from '../utils/wordType';

// Mock 依赖 — 静态导入（避免小程序环境动态 import 问题）
import { loadWordBooks, loadWordBookData, getProgress, setWordProgress, saveProgress, addUserBadge, getUserBadges, _applyCheckin, getUserProfile, saveUserProfile, markAudioListened, isAudioListened } from '../utils/storage';
import { generateTodayTask, updateWordProgress } from '../utils/ebbinghaus';
import { mockBadges, checkNewBadge } from '../mock/badges';
import { mockArticles } from '../mock/articles';
import { calcLevel } from '../constants/config';
import { calcAudioXP } from '../constants/config';

// 当前使用 Mock 还是真实 API
const USE_MOCK = false;

// ============================================
// 词书
// ============================================
export async function fetchWordBooks(): Promise<{ id: string; name: string; description: string; category: string; coverColor: string; totalWords: number; studyMode?: string; identifyPrompt?: string; examLevel?: string; initialized?: boolean }[]> {
  if (USE_MOCK) {
    return loadWordBooks();
  }
  return get('/api/wordbooks');
}

export async function fetchWordBookDetail(bookId: string): Promise<IWordBook> {
  if (USE_MOCK) {
    const book = loadWordBookData(bookId);
    if (!book) throw new Error('词书不存在');
    return book;
  }
  return get(`/api/wordbooks/${bookId}`);
}

// ============================================
// 学习
// ============================================
export async function fetchTodayTask(
  wordBookId: string,
  dailyNew?: number,
  dailyReview?: number
): Promise<ITodayTask> {
  if (USE_MOCK) {
    const task = generateTodayTask(wordBookId);
    if (!task) throw new Error('无法生成今日任务');
    return task;
  }
  const params: Record<string, unknown> = { wordBookId };
  if (dailyNew !== undefined) params.dailyNew = dailyNew;
  if (dailyReview !== undefined) params.dailyReview = dailyReview;
  const task = await get<ITodayTask>('/api/study/today', params);
  // 客户端截断兜底（后端可能未实现限额）
  if (dailyNew !== undefined && task.newWords.length > dailyNew) {
    task.newWords = task.newWords.slice(0, dailyNew);
    task.totalWords = task.reviewWords.length + task.newWords.length;
    task.estimatedMinutes = Math.ceil(task.totalWords * 1.2);
  }
  if (dailyReview !== undefined && task.reviewWords.length > dailyReview) {
    task.reviewWords = task.reviewWords.slice(0, dailyReview);
    task.totalWords = task.reviewWords.length + task.newWords.length;
    task.estimatedMinutes = Math.ceil(task.totalWords * 1.2);
  }
  return task;
}

export async function submitAnswer(data: {
  wordBookId: string; entryId: string; quizItemId: string;
  selectedOption: number; correct: boolean;
  correctAnswer?: string; wrongAnswer?: string;
}): Promise<{ updatedProgress: { stage: number | string; nextReviewDate: string; correctCount: number; wrongCount: number } }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const wp = progress.wordProgresses[data.entryId] || {
      entryId: data.entryId,
      stage: 0 as const,
      nextReviewDate: '',
      correctCount: 0,
      wrongCount: 0,
      resetCount: 0,
      history: [],
    };
    wp.history.push({
      quizItemId: data.quizItemId,
      selectedOption: data.selectedOption,
      correct: data.correct,
      timestamp: Date.now(),
    });
    const updated = updateWordProgress(wp, data.correct);
    setWordProgress(data.entryId, updated);
    return {
      updatedProgress: {
        stage: updated.stage,
        nextReviewDate: updated.nextReviewDate,
        correctCount: updated.correctCount,
        wrongCount: updated.wrongCount,
      }
    };
  }
  return post('/api/study/answer', data, { showLoading: false });
}

export async function completeStudy(data: { wordBookId: string; correctCount: number; wrongCount: number; xpGained: number }): Promise<{ newBadge: IBadge | null; xpGained: number }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const existingBadgeIds = getUserBadges().map(b => b.badgeId);

    // 打卡
    _applyCheckin(progress);

    // 检查新勋章（每天最多一枚）
    const newBadge = checkNewBadge(existingBadgeIds, progress.currentStreak);

    // XP 已在 completeWord 中逐词写入
    const xpGained = data.xpGained || 0;

    if (newBadge) {
      addUserBadge(newBadge.id);
    }
    saveProgress(progress);

    return { newBadge, xpGained };
  }
  return post('/api/study/complete', data, { showLoading: false });
}

/**
 * 完成单个字词学习（所有句子答完后，进入字总结页时调用）。
 * 仅新学词返回 xpGained=10，复习词返回 0。
 */
export async function completeWord(data: { wordBookId: string; entryId: string }): Promise<{ xpGained: number }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const wp = progress.wordProgresses[data.entryId];
    const isNew = !wp;
    if (isNew) {
      progress.totalXP += 10;
      saveProgress(progress);
    }
    return { xpGained: isNew ? 10 : 0 };
  }
  return post('/api/study/word-complete', data, { showLoading: false });
}

/**
 * 音频完整播放完成（选篇/经典听读 XP）。
 * 去重：同一内容只给一次 XP。后端根据 contentId 自己查原文统计汉字。
 */
export async function completeAudioListen(data: {
  contentType: 'article' | 'classic_chapter';
  contentId: string;
}): Promise<{ xpGained: number }> {
  if (USE_MOCK) {
    const key = `audio_${data.contentType}_${data.contentId}`;
    if (isAudioListened(key)) return { xpGained: 0 };
    // Mock 模式用 calcAudioXP 估算（无法查后端原文）
    const xp = 0; // Mock 不做真实的 XP 统计
    markAudioListened(key);
    return { xpGained: xp };
  }
  return post('/api/study/audio-complete', data, { showLoading: false });
}

// ============================================
// 进度
// ============================================
export async function fetchProgress(wordBookId: string): Promise<IUserProgress> {
  if (USE_MOCK) {
    return getProgress();
  }
  return get('/api/progress', { wordBookId });
}

// ============================================
// 错题本
// ============================================
export async function fetchMistakeCount(wordBookId?: string): Promise<number> {
  if (USE_MOCK) {
    const { getMistakes } = require('../utils/storage');
    const allMistakes = getMistakes() as IMistakeRecord[];
    const filtered = wordBookId ? allMistakes.filter(m => m.entryId.startsWith(wordBookId)) : allMistakes;
    return filtered.length;
  }
  const params: Record<string, string> = {};
  if (wordBookId) params.wordBookId = wordBookId;
  const res = await get<{ count: number }>('/api/study/mistakes/count', params);
  return res.count;
}

export async function fetchMistakes(wordBookId?: string): Promise<IMistakeRecord[]> {
  if (USE_MOCK) {
    const { getMistakes } = require('../utils/storage');
    const allMistakes = getMistakes() as IMistakeRecord[];
    return wordBookId ? allMistakes.filter(m => m.entryId.startsWith(wordBookId)) : allMistakes;
  }
  const params: Record<string, string> = {};
  if (wordBookId) params.wordBookId = wordBookId;
  return get('/api/study/mistakes', params);
}

export async function removeMistakeApi(entryId: string): Promise<void> {
  if (USE_MOCK) {
    require('../utils/storage').removeMistake(entryId);
    return;
  }
  return del(`/api/study/mistakes/${entryId}`);
}

// ============================================
// 全局搜索
// ============================================
export async function searchWords(keyword: string): Promise<IWordSearchResult[]> {
  if (USE_MOCK) {
    if (!keyword.trim()) return [];
    const books = loadWordBooks();
    const results: IWordSearchResult[] = [];
    for (const book of books) {
      const full = loadWordBookData(book.id);
      if (full) {
        for (const word of full.wordEntries) {
          if (word.character.includes(keyword)) {
            results.push({
              entryId: word.id,
              character: word.character,
              pinyin: word.pinyin,
              meanings: (word.keyWordRefs || []).map(r => ({
                definition: r.definition || '',
                example: r.sentenceText || '',
                translation: r.sentenceTranslation || '',
                source: r.articleTitle || '',
              })),
              wordBookName: book.name,
              wordBookId: book.id,
            });
          }
        }
      }
    }
    return results;
  }
  return get('/api/words/search', { keyword });
}

// ============================================
// 快捷搜索 — 按词类分组
// ============================================
export async function fetchWordsByType(): Promise<Record<string, IWordQuickItem[]>> {
  if (USE_MOCK) {
    const books = loadWordBooks();
    const result: Record<string, IWordQuickItem[]> = {};
    for (const key of QUICK_GROUP_ORDER) {
      result[key] = [];
    }
    for (const book of books) {
      const full = loadWordBookData(book.id);
      if (full && full.wordEntries.length > 0) {
        // 取第一个词的 wordType 推导分组（同一词书下的 entry 类型相同）
        const key = wordTypeToGroupKey(full.wordEntries[0]?.wordType);
        if (!key) continue;
        for (const entry of full.wordEntries) {
          result[key].push({
            entryId: entry.id,
            character: entry.character,
            pinyin: entry.pinyin,
          });
        }
      }
    }
    return result;
  }
  return get('/api/words/types');
}

// ============================================
// 打卡
// ============================================
export async function fetchCheckinRecords(year: number, month: number): Promise<string[]> {
  if (USE_MOCK) {
    const progress = getProgress();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return progress.checkinDates.filter(d => d.startsWith(prefix));
  }
  return get('/api/checkin', { year, month });
}

// ============================================
// 勋章
// ============================================
export async function fetchBadges(): Promise<{ badges: IBadge[]; userBadges: IUserBadge[] }> {
  if (USE_MOCK) {
    return { badges: mockBadges, userBadges: getUserBadges() };
  }
  return get('/api/badges');
}

export async function fetchUserProfile(): Promise<{ level: number; title: string; totalXP: number; currentStreak: number; memberLevel: number; nickName: string; avatarUrl: string; recoveryDeadline?: string }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const levelInfo = calcLevel(progress.totalXP);
    return { ...levelInfo, totalXP: progress.totalXP, currentStreak: progress.currentStreak, avatarUrl: '', nickName: '', memberLevel: 0 };
  }
  return get('/api/user/profile');
}

// ============================================
// 名篇
// ============================================
export async function fetchArticles(category?: string, textbook?: string): Promise<IArticle[]> {
  if (USE_MOCK) {
    let articles = mockArticles;
    if (category && category !== 'all') {
      articles = articles.filter(a => a.category === category);
    }
    if (textbook && textbook !== 'all') {
      articles = articles.filter(a => a.textbook === textbook);
    }
    return articles;
  }
  return get('/api/articles', { category, textbook });
}

export async function fetchArticleDetail(articleId: string): Promise<IArticle> {
  if (USE_MOCK) {
    const article = mockArticles.find(a => a.id === articleId);
    if (!article) throw new Error('名篇不存在');
    return article;
  }
  return get(`/api/articles/${articleId}`);
}

// ============================================
// 内容
// ============================================
export async function fetchWordDetail(entryId: string): Promise<IWordEntry | null> {
  if (USE_MOCK) {
    // 遍历所有词书查找
    const books = loadWordBooks();
    for (const book of books) {
      const full = loadWordBookData(book.id);
      if (full) {
        const word = full.wordEntries?.find(w => w.id === entryId);
        if (word) return word;
      }
    }
    return null;
  }
  return get(`/api/words/${entryId}`);
}

// ============================================
// 用户个人信息
// ============================================
export async function fetchUserInfo(): Promise<IUserProfile> {
  if (USE_MOCK) {
    return getUserProfile();
  }
  return get('/api/user/info');
}

export async function saveUserInfo(profile: IUserProfile): Promise<void> {
  if (USE_MOCK) {
    saveUserProfile(profile);
    return;
  }
  return put('/api/user/info', profile as unknown as Record<string, unknown>);
}

// ============================================
// 签订契约
// ============================================
export async function signPact(): Promise<{ memberLevel: number }> {
  return post('/api/user/pact');
}

// ============================================
// 清除学习数据 & 恢复
// ============================================
export async function clearUserData(): Promise<{ token: string; userId: number; recoveryDeadline: string }> {
  return post('/api/user/clear-data');
}

export async function recoverUserData(): Promise<{ token: string; userId: number }> {
  return post('/api/user/recover-data');
}

// ============================================
// 错误反馈
// ============================================
export async function submitFeedback(data: IFeedbackSubmitParams): Promise<{ id: string }> {
  if (USE_MOCK) {
    wx.showToast({ title: '感谢反馈，我们会尽快核对', icon: 'success', duration: 2000 });
    return { id: `fb_${Date.now()}` };
  }
  return post('/api/feedback', data);
}

// ============================================
// 意见建议
// ============================================
export async function submitSuggestion(data: ISuggestionSubmitParams): Promise<{ id: string }> {
  if (USE_MOCK) {
    wx.showToast({ title: '感谢您的建议！', icon: 'success', duration: 2000 });
    return { id: `sug_${Date.now()}` };
  }
  return post('/api/suggestion', data);
}

// ============================================
// 经典著作
// ============================================
export async function fetchClassics(category?: string): Promise<IClassicItem[]> {
  if (USE_MOCK) {
    const { getFallbackClassics } = require('../mock/classics');
    const items = getFallbackClassics() as IClassicItem[];
    if (category && category !== 'all') {
      return items.filter(c => c.category === category);
    }
    return items;
  }
  const params: Record<string, string> = {};
  if (category) params.category = category;
  return get('/api/classics', params);
}

/**
 * 经典著作基本信息（含目录树，轻量）
 * loadMode=full 时顺带返回全文 chapters 字段
 */
export async function fetchClassicMeta(classicId: number): Promise<IClassicMeta> {
  if (USE_MOCK) {
    const { getClassicMetaById } = require('../mock/classics');
    const meta = getClassicMetaById(classicId);
    if (!meta) throw new Error('经典不存在');
    return meta;
  }
  return get(`/api/classics/${classicId}`);
}

/**
 * 按需加载内容块（叶子节点）
 */
export async function fetchClassicContent(classicId: number, nodeId: string): Promise<IContentBlock> {
  if (USE_MOCK) {
    const { getClassicMockContent } = require('../mock/classics');
    const content = getClassicMockContent(classicId, nodeId);
    if (!content) throw new Error('内容不存在');
    return content;
  }
  return get(`/api/classics/${classicId}/content/${nodeId}`);
}
