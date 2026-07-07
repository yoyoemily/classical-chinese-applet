import { fetchWordBooks, fetchProgress, fetchTodayTask, fetchBadges, fetchMistakes } from '../../api/index';
import { getCurrentBookId, setCurrentBookId, isCheckedInToday } from '../../utils/storage';
import { calcLevel, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, STORAGE_KEYS } from '../../constants/config';
import type { IUserProgress, IBadge } from '../../typings/index.d';

// ============================================
// 本地类型定义
// ============================================

/** 词书简要信息（对应 API fetchWordBooks 返回单项） */
interface IBookInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  coverColor: string;
  totalWords: number;
}

/** 分布标签项（供 WXML 点击跳转错题本） */
interface IDistributionItem {
  key: string;
  label: string;
  count: number;
}

/** 距离最近的下一个未获得勋章 */
interface INextBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** 还差多少（天数/题数等，由 condition type 决定） */
  gap: number;
  /** gap 的说明文本，如 "天"、"题" */
  gapUnit: string;
}

/** 首页 data 类型 */
interface IIndexData {
  /** 今日日期 */
  today: string;
  /** 当前选中的词书 */
  currentBook: IBookInfo | null;
  /** 学习进度 */
  progress: {
    /** 已掌握百分比 */
    percent: number;
    /** 已掌握数量 */
    mastered: number;
    /** 词书总词数 */
    total: number;
    /** 各掌握等级分布 */
    distribution: IDistributionItem[];
  };
  /** 今日任务 */
  todayTask: {
    /** 新词数量 */
    newWords: number;
    /** 待复习数量 */
    reviewWords: number;
    /** 预估耗时（分钟） */
    estimatedMinutes: number;
  };
  /** 连续打卡天数 */
  streak: number;
  /** 今日是否已打卡 */
  checkedIn: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错题数量 */
  mistakeCount: number;
  /** 下一个可获得的勋章 */
  nextBadge: INextBadge | null;
}

// ============================================
// Page 实例
// ============================================

Page<IIndexData, WechatMiniprogram.Page.CustomOption>({
  data: {
    today: '',
    currentBook: null,
    progress: {
      percent: 0,
      mastered: 0,
      total: 0,
      distribution: [],
    },
    todayTask: {
      newWords: 0,
      reviewWords: 0,
      estimatedMinutes: 0,
    },
    streak: 0,
    checkedIn: false,
    loading: true,
    mistakeCount: 0,
    nextBadge: null,
  },

  // ==========================================
  // 生命周期
  // ==========================================

  onLoad(): void {
    this.loadData();
  },

  onShow(): void {
    // 从其他页面返回时刷新数据（用户可能切换了词书）
    this.loadData();
  },

  // ==========================================
  // 数据加载
  // ==========================================

  /** 加载首页所有数据 */
  async loadData(): Promise<void> {
    this.setData({ loading: true });

    try {
      const bookId = getCurrentBookId();

      // 读取每日限额设置
      const rawSettings = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      let dailyNew = DEFAULT_DAILY_NEW_WORDS;
      let dailyReview = DEFAULT_DAILY_REVIEW_WORDS;
      if (rawSettings) {
        try {
          const s = JSON.parse(rawSettings);
          if (s.dailyNewWords !== undefined) dailyNew = s.dailyNewWords;
          if (s.dailyReviewWords !== undefined) dailyReview = s.dailyReviewWords;
        } catch { /* use defaults */ }
      }

      // 并行拉取词书列表、进度、今日任务、勋章、错题数
      const [books, progress, task, badgesData, mistakes] = await Promise.all([
        fetchWordBooks(),
        fetchProgress(bookId),
        fetchTodayTask(bookId, dailyNew, dailyReview),
        fetchBadges(),
        fetchMistakes(),
      ]);

      const currentBook = books.find((b) => b.id === bookId) ?? null;
      const today = this.formatToday();
      const checkedIn = isCheckedInToday();
      const totalWords = currentBook?.totalWords ?? 0;
      const percent =
        totalWords > 0
          ? Math.round((progress.wordsMastered / totalWords) * 100)
          : 0;
      const distribution = this.computeDistribution(progress, progress.wordsMastered);
      const nextBadge = this.computeNextBadge(badgesData.badges, badgesData.userBadges, progress);
      const mistakeCount = mistakes.length;

      // 兼容 calcLevel 导入（计算用户等级信息供后续扩展使用）
      void calcLevel;

      // 兼容 setCurrentBookId 导入（词书切换在 book-select 页面完成，
      // 此处保留引入以备用）
      void setCurrentBookId;

      this.setData({
        today,
        currentBook,
        progress: {
          percent,
          mastered: progress.wordsMastered,
          total: totalWords,
          distribution,
        },
        todayTask: {
          newWords: task.newWords.length,
          reviewWords: task.reviewWords.length,
          estimatedMinutes: task.estimatedMinutes,
        },
        streak: progress.currentStreak,
        checkedIn,
        loading: false,
        mistakeCount,
        nextBadge,
      });
    } catch (err) {
      console.error('加载首页数据失败:', err);
      wx.showToast({ title: '加载失败，请下拉重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // ==========================================
  // 工具方法
  // ==========================================

  /** 格式化当前日期为中文 */
  formatToday(): string {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  },

  /**
   * 根据用户进度计算各掌握等级的词数分布
   * 分类规则与词汇页 masteryLevel 计算保持一致
   */
  computeDistribution(
    progress: IUserProgress,
    _totalMastered: number,
  ): IDistributionItem[] {
    const { wordProgresses } = progress;
    const counts: Record<string, number> = {
      difficult: 0,
      unclear: 0,
      familiar: 0,
      mastered: 0,
    };

    Object.values(wordProgresses).forEach((wp) => {
      if (wp.stage === 'done') {
        counts.mastered++;
      } else if (wp.resetCount >= 3) {
        counts.difficult++;
      } else if (wp.wrongCount >= 2) {
        counts.unclear++;
      } else if (typeof wp.stage === 'number' && wp.stage >= 3) {
        counts.familiar++;
      } else {
        // 早期阶段：刚学、进度 0-2，归入模糊
        counts.unclear++;
      }
    });

    const labelMap: Record<string, string> = {
      difficult: '困难',
      unclear: '模糊',
      familiar: '熟悉',
      mastered: '掌握',
    };

    return Object.keys(counts).map((key) => ({
      key,
      label: labelMap[key],
      count: counts[key],
    }));
  },

  /**
   * 计算下一个可获得的勋章
   * 全部勋章均为累计学习天数维度，取 gap 最小的未获得勋章
   */
  computeNextBadge(
    allBadges: IBadge[],
    userBadges: { badgeId: string }[],
    progress: IUserProgress,
  ): INextBadge | null {
    const earnedIds = new Set(userBadges.map((b) => b.badgeId));
    const unearned = allBadges.filter((b) => !earnedIds.has(b.id));
    if (unearned.length === 0) return null;

    const currentStreak = progress.currentStreak;

    let best: INextBadge | null = null;

    for (const badge of unearned) {
      const target = badge.condition.value;
      const gap = Math.max(0, target - currentStreak);

      if (!best || gap < best.gap) {
        best = {
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
          gap,
          gapUnit: '天',
        };
      }
    }

    return best;
  },

  // ==========================================
  // 点击事件
  // ==========================================

  /** 点击词书切换区域 → 跳转词书选择页 */
  onTapBookSelector(): void {
    wx.navigateTo({ url: '/pages/book-select/index' });
  },

  /** 点击"开始学习" → 跳转学习页 */
  onTapStartLearning(): void {
    const { todayTask } = this.data;
    if (todayTask.newWords === 0 && todayTask.reviewWords === 0) {
      wx.showToast({ title: '今日任务已完成', icon: 'success' });
      return;
    }
    wx.navigateTo({ url: '/pages/study/index' });
  },

  /** 点击分布标签 → 跳转生词本对应 tab */
  onTapDistribution(e: WechatMiniprogram.TouchEvent): void {
    const tab = e.currentTarget.dataset.tab as string;
    wx.navigateTo({
      url: `/pages/vocabulary/index?tab=${tab}`,
    });
  },

  /** 点击搜索 → 跳转搜索页 */
  onTapSearch(): void {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  /** 点击勋章墙 → 跳转勋章页 */
  onTapBadges(): void {
    wx.navigateTo({ url: '/pages/badges/index' });
  },

  /** 点击生词本入口 */
  onTapVocabulary(): void {
    wx.navigateTo({ url: '/pages/vocabulary/index' });
  },

  /** 点击错题本入口 */
  onTapMistakeBook(): void {
    wx.navigateTo({ url: '/pages/mistake-book/index' });
  },

  /** 点击打卡日历入口 */
  onTapCalendar(): void {
    wx.navigateTo({ url: '/pages/calendar/index' });
  },
});
