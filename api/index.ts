// ============================================
// API 接口层（MVP 阶段使用 Mock 数据，后续切换到真实 API）
// ============================================
import { get, post } from '../utils/request';
import type {
  IWordBook, IWord, ITodayTask, IArticle, IApiResponse,
  IPaginationResult, IVocabularyItem, IBadge, IUserBadge, IUserProgress,
  IFeedbackSubmitParams,
} from '../typings/index.d';

// Mock 依赖 — 静态导入（避免小程序环境动态 import 问题）
import { loadWordBooks, loadWordBookData, getProgress, setWordProgress, saveProgress, addUserBadges, getUserBadges, _applyCheckin } from '../utils/storage';
import { generateTodayTask, updateWordProgress } from '../utils/ebbinghaus';
import { mockBadges, checkNewBadges } from '../mock/badges';
import { mockArticles } from '../mock/articles';
import { calcLevel } from '../constants/config';

// 当前使用 Mock 还是真实 API
const USE_MOCK = true;

// ============================================
// 词书
// ============================================
export async function fetchWordBooks(): Promise<{ id: string; name: string; description: string; category: string; coverColor: string; totalWords: number }[]> {
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
export async function fetchTodayTask(wordBookId: string): Promise<ITodayTask> {
  if (USE_MOCK) {
    const task = generateTodayTask(wordBookId);
    if (!task) throw new Error('无法生成今日任务');
    return task;
  }
  return get('/api/study/today', { wordBookId });
}

export async function submitAnswer(data: {
  wordBookId: string; wordId: string; sentenceId: string;
  selectedOption: number; correct: boolean;
}): Promise<{ updatedProgress: { stage: number | string; nextReviewDate: string; correctCount: number; wrongCount: number } }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const wp = progress.wordProgresses[data.wordId] || {
      wordId: data.wordId,
      stage: 0 as const,
      nextReviewDate: '',
      correctCount: 0,
      wrongCount: 0,
      resetCount: 0,
      history: [],
    };
    wp.history.push({
      sentenceId: data.sentenceId,
      selectedOption: data.selectedOption,
      correct: data.correct,
      timestamp: Date.now(),
    });
    const updated = updateWordProgress(wp, data.correct);
    setWordProgress(data.wordId, updated);
    return {
      updatedProgress: {
        stage: updated.stage,
        nextReviewDate: updated.nextReviewDate,
        correctCount: updated.correctCount,
        wrongCount: updated.wrongCount,
      }
    };
  }
  return post('/api/study/answer', data);
}

export async function completeStudy(data: { wordBookId: string; correctCount: number; wrongCount: number }): Promise<{ newBadges: IBadge[]; xpGained: number }> {
  if (USE_MOCK) {
    // 一次性读取，避免多次 JSON.parse 阻塞主线程
    const progress = getProgress();
    const existingBadges = getUserBadges();
    const existingBadgeIds = existingBadges.map(b => b.badgeId);

    // 打卡
    _applyCheckin(progress);

    // 检查新勋章（全部为累计学习天数维度）
    const newBadges = checkNewBadges(existingBadgeIds, progress.currentStreak);

    // 经验
    const xpGained = data.correctCount * 10;
    progress.totalXP += xpGained;

    // 一次性写入：勋章批量写入 + 进度
    addUserBadges(newBadges.map(b => b.id));
    saveProgress(progress);

    return { newBadges, xpGained };
  }
  return post('/api/study/complete', data);
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

export async function fetchVocabulary(wordBookId: string, tab: string): Promise<IPaginationResult<IVocabularyItem>> {
  if (USE_MOCK) {
    const book = loadWordBookData(wordBookId);
    const progress = getProgress();
    if (!book) return { list: [], total: 0, page: 1, pageSize: 20, hasMore: false };

    let items: IVocabularyItem[] = book.words
      .filter(w => progress.wordProgresses[w.id])
      .map(w => {
        const wp = progress.wordProgresses[w.id];
        return {
          wordId: w.id,
          character: w.character,
          pinyin: w.pinyin,
          masteryLevel: (wp.stage === 'done' ? 'mastered' :
            wp.resetCount >= 3 ? 'difficult' :
            wp.wrongCount >= 2 ? 'unclear' :
            typeof wp.stage === 'number' && wp.stage >= 3 ? 'familiar' : 'unclear') as IVocabularyItem['masteryLevel'],
          progress: wp.stage === 'done' ? 100 : typeof wp.stage === 'number' ? Math.round((wp.stage / 6) * 100) : 0,
          stage: wp.stage,
        };
      });

    if (tab !== 'all') {
      const levelMap: Record<string, string> = { difficult: 'difficult', unclear: 'unclear', familiar: 'familiar', mastered: 'mastered' };
      items = items.filter(i => i.masteryLevel === levelMap[tab]);
    }

    return { list: items, total: items.length, page: 1, pageSize: 20, hasMore: false };
  }
  return get('/api/vocabulary', { wordBookId, tab });
}

export async function fetchCheckinRecords(year: number, month: number): Promise<string[]> {
  if (USE_MOCK) {
    const progress = getProgress();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return progress.checkinDates.filter(d => d.startsWith(prefix));
  }
  return get('/api/checkin', { year, month });
}

export async function fetchBadges(): Promise<{ badges: IBadge[]; userBadges: IUserBadge[] }> {
  if (USE_MOCK) {
    return { badges: mockBadges, userBadges: getUserBadges() };
  }
  return get('/api/badges');
}

export async function fetchUserProfile(): Promise<{ level: number; title: string; totalXP: number; currentStreak: number }> {
  if (USE_MOCK) {
    const progress = getProgress();
    const levelInfo = calcLevel(progress.totalXP);
    return { ...levelInfo, totalXP: progress.totalXP, currentStreak: progress.currentStreak };
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
export async function fetchWordDetail(wordId: string): Promise<IWord | null> {
  if (USE_MOCK) {
    // 遍历所有词书查找
    const books = loadWordBooks();
    for (const book of books) {
      const full = loadWordBookData(book.id);
      if (full) {
        const word = full.words.find(w => w.id === wordId);
        if (word) return word;
      }
    }
    return null;
  }
  return get(`/api/words/${wordId}`);
}

export async function fetchFullText(sentenceId: string): Promise<{ title: string; author: string; content: string } | null> {
  if (USE_MOCK) {
    // 在词书数据中查找句子对应的全文
    const books = loadWordBooks();
    for (const book of books) {
      const full = loadWordBookData(book.id);
      if (full) {
        for (const word of full.words) {
          const sentence = word.sentences.find(s => s.id === sentenceId);
          if (sentence?.fullText) {
            return {
              title: sentence.source,
              author: '',
              content: sentence.fullText,
            };
          }
        }
      }
    }
    return null;
  }
  return get(`/api/full-text/${sentenceId}`);
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
