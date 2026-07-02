// ============================================
// 我的 / 个人中心页面
// ============================================
import { fetchUserProfile, fetchWordBooks } from '../../api/index';
import { getCurrentBookId } from '../../utils/storage';
import { getLevelXP, RANK_TITLES, calcLevel } from '../../constants/config';

interface IMenuItem {
  key: string;
  icon: string;
  label: string;
  suffix?: string;
  url: string;
}

interface IMineData {
  userName: string;
  level: number;
  levelTitle: string;
  totalXP: number;
  xpForNextLevel: number;
  xpProgress: number;
  currentStreak: number;
  longestStreak: number;
  badgeCount: number;
  totalBadges: number;
  currentBookName: string;
  menuItems: IMenuItem[];
  loading: boolean;
}

Page<IMineData, WechatMiniprogram.Page.CustomOption>({
  data: {
    userName: '学友',
    level: 1,
    levelTitle: '童生',
    totalXP: 0,
    xpForNextLevel: 100,
    xpProgress: 0,
    currentStreak: 0,
    longestStreak: 0,
    badgeCount: 0,
    totalBadges: 12,
    currentBookName: '',
    menuItems: [
      { key: 'calendar', icon: '📅', label: '打卡日历', url: '/pages/calendar/index' },
      { key: 'badges', icon: '🏅', label: '勋章墙', url: '/pages/badges/index' },
      { key: 'settings', icon: '⚙️', label: '设置', url: '/pages/settings/index' },
    ],
    loading: false,
  },

  onLoad(): void {
    this.loadProfile();
  },

  onShow(): void {
    // 从其他页面返回时刷新数据
    this.loadProfile();
  },

  /** 加载用户信息 */
  async loadProfile(): Promise<void> {
    this.setData({ loading: true });

    try {
      const [profileResult, bookResult] = await Promise.all([
        fetchUserProfile(),
        this.getCurrentBookName(),
      ]);

      const levelInfo = calcLevel(profileResult.totalXP);
      const xpForNextLevel = getLevelXP(levelInfo.level);
      const xpForCurrentLevel = levelInfo.level > 1
        ? getLevelXP(levelInfo.level - 1)
        : 0;
      const xpIntoLevel = profileResult.totalXP - xpForCurrentLevel;
      const xpProgress = Math.min(Math.round((xpIntoLevel / xpForNextLevel) * 100), 100);

      this.setData({
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        totalXP: profileResult.totalXP,
        xpForNextLevel,
        xpProgress,
        currentStreak: profileResult.currentStreak,
        currentBookName: bookResult,
        loading: false,
      });
    } catch (err) {
      console.error('加载用户信息失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /** 获取当前词书名称 */
  async getCurrentBookName(): Promise<string> {
    try {
      const books = await fetchWordBooks();
      const currentId = getCurrentBookId();
      const currentBook = books.find(b => b.id === currentId);
      return currentBook?.name ?? '未知';
    } catch {
      return '未知';
    }
  },

  /** 点击菜单项 */
  onTapMenuItem(e: WechatMiniprogram.BaseEvent): void {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },
});
