// ============================================
// 我的 / 个人中心页面
// ============================================
import { fetchUserProfile, fetchWordBooks, fetchUserInfo } from '../../api/index';
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
  avatarUrl: string;
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
  showSharePoster: boolean;
}

Page<IMineData, WechatMiniprogram.Page.CustomOption>({
  data: {
    avatarUrl: '',
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
      { key: 'mistake', icon: '📝', label: '错题本', url: '/pages/mistake-book/index' },
      { key: 'vocabulary', icon: '📖', label: '生词本', url: '/pages/vocabulary/index' },
      { key: 'badges', icon: '🏅', label: '勋章墙', url: '/pages/badges/index' },
      { key: 'profile', icon: '👤', label: '个人信息', url: '/pages/profile-edit/index' },
      { key: 'settings', icon: '⚙️', label: '设置', url: '/pages/settings/index' },
    ],
    loading: false,
    showSharePoster: false,
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
      // 加载个人信息
      const [profileResult, bookResult, userInfo] = await Promise.all([
        fetchUserProfile(),
        this.getCurrentBookName(),
        fetchUserInfo(),
      ]);

      const displayName = userInfo.nickName || '学友';

      const levelInfo = calcLevel(profileResult.totalXP);
      const xpForNextLevel = getLevelXP(levelInfo.level);
      const xpForCurrentLevel = levelInfo.level > 1
        ? getLevelXP(levelInfo.level - 1)
        : 0;
      const xpIntoLevel = profileResult.totalXP - xpForCurrentLevel;
      const xpProgress = Math.min(Math.round((xpIntoLevel / xpForNextLevel) * 100), 100);

      this.setData({
        avatarUrl: userInfo.avatarUrl,
        userName: displayName,
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

  /** 打开分享海报弹窗 */
  onTapShare(): void {
    this.setData({ showSharePoster: true });
  },

  /** 关闭海报弹窗 */
  onCloseShare(): void {
    this.setData({ showSharePoster: false });
  },

  /** 保存海报到相册 */
  onSavePoster(): void {
    wx.showLoading({ title: '保存中...' });

    // 小程序不支持直接将项目内静态资源保存到相册
    // 需先通过 downloadFile 下载到临时目录再保存
    // 开发环境若后端未部署图片，可先手动将图片放到后端 static 目录
    const POSTER_URL = 'https://wyq.yinque-ai.com/assets/share-poster.png';

    wx.downloadFile({
      url: POSTER_URL,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '图片已保存，快去朋友圈分享吧', icon: 'none', duration: 2000 });
            },
            fail: (err) => {
              wx.hideLoading();
              if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请允许访问您的相册，以便保存海报图片',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  },
                });
              } else {
                wx.showToast({ title: '保存失败，请重试', icon: 'none' });
              }
            },
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      },
    });
  },

  /** 分享给微信好友（原生菜单） */
  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return {
      title: '文言雀—无障碍畅读传世经典，领略古贤智慧',
      path: '/pages/index/index',
    };
  },
});
