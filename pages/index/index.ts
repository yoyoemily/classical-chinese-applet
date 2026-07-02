import { fetchWordBooks, fetchProgress, fetchTodayTask, fetchCheckinRecords, fetchBadges } from '../../api/index';
import { getCurrentBookId, setCurrentBookId, isCheckedInToday } from '../../utils/storage';
import { calcLevel } from '../../constants/config';
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

/** 分布标签项（供 WXML 点击跳转生词本） */
interface IDistributionItem {
  key: string;
  label: string;
  count: number;
}

/** 日历单元格 */
interface IDayCell {
  day: number;
  fullDate: string;
  isToday: boolean;
  isCheckedIn: boolean;
  isCurrentMonth: boolean;
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
  /** 日历：当前年 */
  currentYear: number;
  /** 日历：当前月 */
  currentMonth: number;
  /** 日历：月份标签 */
  monthLabel: string;
  /** 日历：星期表头 */
  weekdays: string[];
  /** 日历：格子列表 */
  calendarGrid: IDayCell[];
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
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    monthLabel: '',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarGrid: [],
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

      // 并行拉取词书列表、进度、今日任务、打卡记录、勋章
      const [books, progress, task, checkinDates, badgesData] = await Promise.all([
        fetchWordBooks(),
        fetchProgress(bookId),
        fetchTodayTask(bookId),
        fetchCheckinRecords(
          this.data.currentYear,
          this.data.currentMonth,
        ),
        fetchBadges(),
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

      const calendarGrid = this.buildCalendarGrid(checkinDates);
      const nextBadge = this.computeNextBadge(badgesData.badges, badgesData.userBadges, progress);

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
        calendarGrid,
        monthLabel: `${this.data.currentYear}年${this.data.currentMonth}月`,
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

  /** 根据打卡日期列表构建日历网格 */
  buildCalendarGrid(checkinDates: string[]): IDayCell[] {
    const { currentYear, currentMonth } = this.data;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const checkinSet = new Set(checkinDates);

    const grid: IDayCell[] = [];

    // 上月尾部填充
    const prevLast = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const day = prevLast - i;
      const fd =
        currentMonth === 1
          ? `${currentYear - 1}-12-${String(day).padStart(2, '0')}`
          : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      grid.push({
        day,
        fullDate: fd,
        isToday: fd === todayStr,
        isCheckedIn: checkinSet.has(fd),
        isCurrentMonth: false,
      });
    }

    // 当月每天
    for (let d = 1; d <= daysInMonth; d++) {
      const fd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        day: d,
        fullDate: fd,
        isToday: fd === todayStr,
        isCheckedIn: checkinSet.has(fd),
        isCurrentMonth: true,
      });
    }

    // 下月头部填充
    const rem = grid.length % 7 === 0 ? 0 : 7 - (grid.length % 7);
    const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= rem; d++) {
      const fd = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        day: d,
        fullDate: fd,
        isToday: fd === todayStr,
        isCheckedIn: checkinSet.has(fd),
        isCurrentMonth: false,
      });
    }

    return grid;
  },

  /** 切换至上一个月 */
  onPrevMonth(): void {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentMonth = 12;
      currentYear--;
    } else {
      currentMonth--;
    }
    this.setData({ currentYear, currentMonth });
    this.refreshCalendar();
  },

  /** 切换至下一个月（不能超过当前月） */
  onNextMonth(): void {
    let { currentYear, currentMonth } = this.data;
    const now = new Date();
    if (
      currentYear * 12 + currentMonth >=
      now.getFullYear() * 12 + now.getMonth() + 1
    ) {
      return;
    }
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear++;
    } else {
      currentMonth++;
    }
    this.setData({ currentYear, currentMonth });
    this.refreshCalendar();
  },

  /** 重新拉取打卡记录并刷新日历 */
  async refreshCalendar(): Promise<void> {
    try {
      const checkinDates = await fetchCheckinRecords(
        this.data.currentYear,
        this.data.currentMonth,
      );
      const calendarGrid = this.buildCalendarGrid(checkinDates);
      this.setData({
        calendarGrid,
        monthLabel: `${this.data.currentYear}年${this.data.currentMonth}月`,
      });
    } catch {
      // 静默失败
    }
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

  /** 点击分布标签 → 跳转生词本页并选中对应 tab */
  onTapDistribution(e: WechatMiniprogram.TouchEvent): void {
    const tab = e.currentTarget.dataset.tab as string;
    if (!tab) return;
    wx.navigateTo({
      url: `/pages/vocabulary/index?tab=${tab}`,
    });
  },

  /** 点击勋章墙 → 跳转勋章页 */
  onTapBadges(): void {
    wx.navigateTo({ url: '/pages/badges/index' });
  },
});
