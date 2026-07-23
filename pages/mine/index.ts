// ============================================
// 我的 / 个人中心页面
// ============================================
import { fetchUserProfile, fetchBadges } from '../../api/index';
import { computeNextBadge } from '../../utils/badge';
import type { NextBadgeInfo } from '../../utils/badge';

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
  title: string;
  currentStreak: number;
  badgeCount: number;
  totalBadges: number;
  menuItems: IMenuItem[];
  loading: boolean;
  showSharePoster: boolean;
  /** 海报是否已保存成功 */
  posterSaved: boolean;
  /** 会员级别（0=非会员，1=金石契） */
  memberLevel: number;
  /** 金石契约窗 */
  showNuoDialog: boolean;
  /** 下一枚勋章信息 */
  nextBadge: NextBadgeInfo | null;
  /** 数据清除恢复截止时间 */
  recoveryDeadline?: string;
  /** 从后端下载的海报临时路径（用于弹窗展示和保存） */
  posterTempPath: string;
}

Page<IMineData, WechatMiniprogram.Page.CustomOption>({
  data: {
    avatarUrl: '',
    userName: '学友',
    level: 1,
    title: '童生',
    currentStreak: 0,
    badgeCount: 0,
    totalBadges: 8,
    menuItems: [
      { key: 'calendar', icon: '📅', label: '打卡日历', url: '/pages/calendar/index' },
      { key: 'profile', icon: '👤', label: '个人信息', url: '/pages/profile-edit/index' },
      { key: 'settings', icon: '⚙️', label: '系统设置', url: '/pages/settings/index' },
      { key: 'feedback', icon: '💬', label: '意见建议', url: '/pages/feedback/index' },
      { key: 'about', icon: '📖', label: '品牌故事', url: '/pages/about/index' },
    ],
    loading: false,
    showSharePoster: false,
    posterSaved: false,
    memberLevel: 0,
    showNuoDialog: false,
    nextBadge: null,
    posterTempPath: '',
  },

  onLoad(): void {},

  onShow(): void {
    // 从其他页面返回时刷新数据，并重置海报弹窗状态
    this.setData({ showSharePoster: false, posterSaved: false, posterTempPath: '' });
    this.loadProfile();
  },

  /** 加载用户信息 */
  async loadProfile(): Promise<void> {
    this.setData({ loading: true });

    try {
      const profileResult = await fetchUserProfile();

      const displayName = profileResult.nickName || '学友';

      this.setData({
        avatarUrl: profileResult.avatarUrl,
        userName: displayName,
        level: profileResult.level || 1,
        title: profileResult.title || '童生',
        currentStreak: profileResult.currentStreak,
        loading: false,
        memberLevel: profileResult.memberLevel || 0,
        recoveryDeadline: profileResult.recoveryDeadline || '',
      });

      // 勋章数据异步加载（不阻塞页面渲染）
      this.loadBadges();
    } catch (err) {
      console.error('加载用户信息失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /** 加载勋章数据：数量 + 下一枚勋章进度 */
  async loadBadges(): Promise<void> {
    try {
      const result = await fetchBadges();
      const userBadgeIds = new Set(result.userBadges.map(ub => ub.badgeId));
      const earnedCount = result.userBadges.length;
      const totalCount = result.badges.length;
      const nextBadge = computeNextBadge(this.data.currentStreak, result.badges, userBadgeIds);

      this.setData({
        badgeCount: earnedCount,
        totalBadges: totalCount,
        nextBadge,
      });
    } catch {
      // 勋章数据加载失败不阻塞页面
    }
  },

  /** 跳转等级体系 */
  onTapLevel(): void {
    wx.navigateTo({ url: '/pages/level-system/index' });
  },

  /** 跳转勋章墙 */
  onTapBadges(): void {
    wx.navigateTo({ url: '/pages/badges/index' });
  },

  /** 点击菜单项 */
  onTapMenuItem(e: WechatMiniprogram.BaseEvent): void {
    const url = e.currentTarget.dataset.url as string;
    if (!url) return;
    wx.navigateTo({ url });
  },

  /** 打开分享海报弹窗（从后端下载海报） */
  async onTapShare(): Promise<void> {
    // 先打开弹窗（loading 状态）
    this.setData({ showSharePoster: true, posterSaved: false, posterTempPath: '' });

    const POSTER_URL = this.getPosterUrl();
    wx.showLoading({ title: '加载海报...' });

    wx.downloadFile({
      url: POSTER_URL,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          this.setData({ posterTempPath: res.tempFilePath });
        } else {
          wx.showToast({ title: '海报加载失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '海报加载失败', icon: 'none' });
      },
    });
  },

  /** 计算海报 URL */
  getPosterUrl(): string {
    return 'https://wyq.yinqueai.com/assets/share-poster.png';
  },

  /** 关闭海报弹窗 */
  onCloseShare(): void {
    this.setData({ showSharePoster: false, posterTempPath: '' });
  },

  /** 保存海报到相册（复用已下载的临时路径） */
  onSavePoster(): void {
    const tempPath = this.data.posterTempPath;
    if (!tempPath) {
      wx.showToast({ title: '海报尚未加载完成', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    wx.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '图片已保存', icon: 'success', duration: 1500 });
        this.setData({ posterSaved: true });
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
  },

  /** 点击「金石契」标签 → 弹出弹窗 */
  onTapNuoBadge(): void {
    this.setData({ showNuoDialog: true });
  },

  /** 关闭诺言会员弹窗 */
  onCloseNuoDialog(): void {
    this.setData({ showNuoDialog: false });
  },

  /** 分享给微信好友（原生菜单） */
  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return {
      title: '文言雀——无障碍畅读传世经典，领略古贤智慧',
      path: '/pages/index/index',
      imageUrl: '/assets/share-poster.png',
    };
  },
});
