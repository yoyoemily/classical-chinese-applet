import { fetchWordBooks, fetchProgress, fetchTodayTask, fetchMistakeCount, fetchUserProfile, fetchBadges, verifyCode, signPact } from '../../api/index';
import { getCurrentBookId, setCurrentBookId, isCheckedInToday, clearStudySummary } from '../../utils/storage';
import { DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, STORAGE_KEYS, SHARE_GATE_STREAK_DAYS } from '../../constants/config';
import { computeNextBadge } from '../../utils/badge';
import type { NextBadgeInfo } from '../../utils/badge';

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
    /** 今日跨词书新学词数是否已达上限 */
    dailyNewLimitReached: boolean;
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
  nextBadge: NextBadgeInfo | null;
  /** 会员级别 */
  memberLevel: number;
  /** 用户昵称 */
  nickName: string;
  /** 学习码状态：-1=从没绑过 1=有效 2=已过期 */
  codeStatus: number;
  /** 学习码是否已过期（已验证但 30 天不活跃） */
  codeExpired: boolean;
  /** 学习码门禁弹窗是否显示 */
  showGate: boolean;
  /** 学习码门禁弹窗当前阶段：1=关注公众号 2=输入学习码 3=签金石契 */
  gateStep: 1 | 2 | 3;
  /** 分享门禁天数（-1 表示关闭） */
  shareGateDays: number;
  /** 用户输入的学习码 */
  redeemCode: string;
  /** 签订契约复选框 */
  pactChecked: boolean;
  /** 学习码验证错误信息 */
  codeError: string;
  /** 数据清除恢复截止时间 */
  recoveryDeadline?: string;
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
      dailyNewLimitReached: false,
    },
    streak: 0,
    checkedIn: false,
    loading: true,
    mistakeCount: 0,
    nextBadge: null,
    memberLevel: 0,
    nickName: '',
    codeStatus: -1,
    codeExpired: false,
    showGate: false,
    gateStep: 1,
    shareGateDays: SHARE_GATE_STREAK_DAYS,
    redeemCode: '',
    pactChecked: false,
    codeError: '',
  },

  // ==========================================
  // 生命周期
  // ==========================================

  onLoad(): void {
    this.initBooks();
  },

  onShow(): void {
    // 每次从其他页面返回时，重置门禁状态、刷新数据
    this.setData({ showGate: false });
    this.loadData();
  },

  // ==========================================
  // 数据加载
  // ==========================================

  /** 词书列表缓存（一次拉取，后续复用） */
  _booksCache: null as IBookInfo[] | null,

  /** 首次加载时拉取词书列表 */
  async initBooks(): Promise<void> {
    try {
      const books = await fetchWordBooks();
      this._booksCache = books;
    } catch {
      this._booksCache = [];
    }
  },

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

      // 并行拉取进度、今日任务、勋章、错题数、用户信息（词书列表已缓存）
      const [progress, task, badgeResult, mistakesCount, profile] = await Promise.all([
        fetchProgress(bookId),
        fetchTodayTask(bookId, dailyNew, dailyReview),
        fetchBadges(),
        fetchMistakeCount(),
        fetchUserProfile(),
      ]);

      const books = this._booksCache || [];
      const currentBook = books.find((b) => b.id === bookId) ?? null;
      const today = this.formatToday();
      const checkedIn = isCheckedInToday();
      const totalWords = currentBook?.totalWords ?? 0;
      const percent =
        totalWords > 0
          ? Math.round((progress.wordsMastered / totalWords) * 100)
          : 0;
      const distribution = this.computeDistribution(progress, progress.wordsMastered);

      // 前端计算下一枚勋章
      const userBadgeIds = new Set(badgeResult.userBadges.map(ub => ub.badgeId));
      const nextBadge = computeNextBadge(profile.currentStreak, badgeResult.badges, userBadgeIds);

      const mistakeCount = mistakesCount;

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
          dailyNewLimitReached: task.dailyNewLimitReached || false,
        },
        streak: progress.currentStreak,
        checkedIn,
        loading: false,
        mistakeCount,
        nextBadge,
        memberLevel: profile.memberLevel,
        nickName: profile.nickName || '',
        codeStatus: profile.codeStatus || -1,
      });

      // 检测是否处于数据清除恢复期内
      if (profile.recoveryDeadline) {
        this.setData({ recoveryDeadline: profile.recoveryDeadline });
      }
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

  // ==========================================
  // 点击事件
  // ==========================================

  /** 点击词书切换区域 → 跳转词书选择页 */
  onTapBookSelector(): void {
    wx.navigateTo({ url: '/pages/book-select/index' });
  },

  /** 点击"开始学习" → 清空旧汇总缓存 → 跳转学习页（或触发门禁） */
  onTapStartLearning(): void {
    const { todayTask } = this.data;
    if (todayTask.newWords === 0 && todayTask.reviewWords === 0) {
      if (todayTask.dailyNewLimitReached) {
        wx.showToast({ title: '今日新学词数已达上限，明天再来吧。', icon: 'none' });
      } else {
        wx.showToast({ title: '今日任务已完成', icon: 'success' });
      }
      return;
    }

    // 门禁：打卡满 N 天，且（未签契 或 码不有效）
    if (
      SHARE_GATE_STREAK_DAYS !== -1 &&
      this.data.streak >= SHARE_GATE_STREAK_DAYS &&
      (this.data.memberLevel < 1 || this.data.codeStatus !== 1)
    ) {
      // 码有效但未签契 → 直接进入签契阶段
      const skipQrcode = this.data.codeStatus === 1 && this.data.memberLevel < 1;
      // 码过期
      const codeExpired = this.data.codeStatus === 2;
      this.setData({
        showGate: true,
        gateStep: skipQrcode ? 3 : 1,
        redeemCode: '',
        pactChecked: false,
        codeError: '',
        codeExpired,
      });
      return;
    }

    clearStudySummary();
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

  /** 点击设置 → 跳转学习设置页 */
  onTapSettings(): void {
    wx.navigateTo({ url: '/pages/study-settings/index' });
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

  // ==========================================
  // 学习码门禁弹窗
  // ==========================================

  /** 阶段一 → 阶段二：我已关注，去输入学习码 */
  onGoToInputCode(): void {
    this.setData({ gateStep: 2, codeError: '' });
  },

  /** 阶段二 → 阶段一：返回查看公众号 */
  onGoBackToQrcode(): void {
    this.setData({ gateStep: 1 });
  },

  /** 输入学习码（仅允许数字，最多 8 位） */
  onInputCode(e: WechatMiniprogram.InputEvent): void {
    const raw = e.detail.value || '';
    const filtered = raw.replace(/\D/g, '').slice(0, 8);
    this.setData({ redeemCode: filtered, codeError: '' });
  },

  /** 阶段二：确认验证学习码 */
  async onVerifyCode(): Promise<void> {
    const code = this.data.redeemCode.trim();
    if (!code) {
      this.setData({ codeError: '请输入学习码' });
      return;
    }

    try {
      const result = await verifyCode(code);
      if (result.valid) {
        // 验证成功
        if (result.memberLevel >= 1) {
          // 已签契 → 关闭弹窗，刷新数据，用户自行点击开始学习
          this.setData({
            codeStatus: 1,
            showGate: false,
          });
          this.loadData();
        } else {
          // 未签契 → 进入阶段三
          this.setData({ gateStep: 3, codeStatus: 1 });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '验证失败';
      this.setData({ codeError: msg });
    }
  },

  /** 阶段三：切换签订契约复选框 */
  onTogglePactCheck(): void {
    this.setData({ pactChecked: !this.data.pactChecked });
  },

  /** 阶段三：签订契约 */
  async onSignPact(): Promise<void> {
    if (!this.data.pactChecked) return;
    try {
      await signPact();
    } catch { /* 网络失败不阻塞 */ }
    // 关闭弹窗，刷新数据，用户自行点击开始学习
    this.setData({ showGate: false });
    this.loadData();
  },

  /** 分享（右上角菜单） */
  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return {
      title: '文言雀——无障碍畅读传世经典，领略古贤智慧',
      path: '/pages/index/index',
      imageUrl: '/assets/share-poster.png',
    };
  },
});
