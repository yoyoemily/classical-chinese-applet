// ============================================
// 我的 / 个人中心页面
// ============================================
import { fetchUserProfile, fetchWordBooks, recordShare, fetchBadges } from '../../api/index';
import { getCurrentBookId } from '../../utils/storage';

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
  currentStreak: number;
  badgeCount: number;
  totalBadges: number;
  currentBookName: string;
  menuItems: IMenuItem[];
  loading: boolean;
  showSharePoster: boolean;
  /** 海报是否已保存成功 */
  posterSaved: boolean;
  /** 是否已点击「分享出去」（显示信任文案） */
  shareConfirmed: boolean;
  /** 会员级别（0=非会员，1=金石契） */
  memberLevel: number;
  /** 金石契约窗 */
  showNuoDialog: boolean;
  /** 签订契约复选框 */
  pactChecked: boolean;
  /** 下一枚勋章信息 */
  nextBadge: { name: string; icon: string; gap: number; gapLabel: string; percent: number } | null;
}

Page<IMineData, WechatMiniprogram.Page.CustomOption>({
  data: {
    avatarUrl: '',
    userName: '学友',
    currentStreak: 0,
    badgeCount: 0,
    totalBadges: 8,
    currentBookName: '',
    menuItems: [
      { key: 'calendar', icon: '📅', label: '打卡日历', url: '/pages/calendar/index' },
      { key: 'mistake', icon: '📝', label: '错题本', url: '/pages/mistake-book/index' },
      { key: 'vocabulary', icon: '📖', label: '生词本', url: '/pages/vocabulary/index' },
      { key: 'profile', icon: '👤', label: '个人信息', url: '/pages/profile-edit/index' },
      { key: 'settings', icon: '⚙️', label: '设置', url: '/pages/settings/index' },
    ],
    loading: false,
    showSharePoster: false,
    posterSaved: false,
    shareConfirmed: false,
    memberLevel: 0,
    showNuoDialog: false,
    pactChecked: false,
    nextBadge: null,
  },

  onLoad(): void {
    this.loadProfile();
  },

  onShow(): void {
    // 从其他页面返回时刷新数据，并重置海报弹窗状态
    this.setData({ showSharePoster: false, posterSaved: false, shareConfirmed: false });
    this.loadProfile();
  },

  /** 加载用户信息 */
  async loadProfile(): Promise<void> {
    this.setData({ loading: true });

    try {
      // 加载个人信息
      const [profileResult, bookResult] = await Promise.all([
        fetchUserProfile(),
        this.getCurrentBookName(),
      ]);

      const displayName = profileResult.nickName || '学友';

      this.setData({
        avatarUrl: profileResult.avatarUrl,
        userName: displayName,
        currentStreak: profileResult.currentStreak,
        currentBookName: bookResult,
        loading: false,
        memberLevel: profileResult.memberLevel || 0,
      });

      // 勋章数据异步加载（不阻塞页面渲染）
      this.loadBadges();
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

  /** 加载勋章数据：数量 + 下一枚勋章进度 */
  async loadBadges(): Promise<void> {
    try {
      const result = await fetchBadges();
      const allBadges = result.badges as { id: string; name: string; icon: string; condition: { type: string; value: number } }[];
      const userBadgeIds = new Set(result.userBadges.map((ub: { badgeId: string }) => ub.badgeId));
      const earnedCount = result.userBadges.length;
      const totalCount = allBadges.length;
      const currentStreak = this.data.currentStreak;

      // 计算下一枚勋章：取 gap 最小的未获得勋章
      let nextBadge: IMineData['nextBadge'] = null;
      const unearned = allBadges.filter(b => !userBadgeIds.has(b.id));
      if (unearned.length > 0) {
        let bestGap = Infinity;
        let bestBadge: typeof unearned[0] | null = null;
        for (const badge of unearned) {
          const target = badge.condition.value;
          const gap = Math.max(0, target - currentStreak);
          if (gap < bestGap) {
            bestGap = gap;
            bestBadge = badge;
          }
        }
        if (bestBadge) {
          const target = bestBadge.condition.value;
          const rawPercent = target > 0 ? Math.min(Math.round((currentStreak / target) * 100), 100) : 100;
          nextBadge = {
            name: bestBadge.name,
            icon: bestBadge.icon,
            gap: bestGap,
            gapLabel: bestGap === 0 ? '即将获得' : '天',
            percent: rawPercent,
          };
        }
      }

      this.setData({
        badgeCount: earnedCount,
        totalBadges: totalCount,
        nextBadge,
      });
    } catch {
      // 勋章数据加载失败不阻塞页面
    }
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

  /** 打开分享海报弹窗 */
  onTapShare(): void {
    this.setData({ showSharePoster: true, posterSaved: false, shareConfirmed: false, pactChecked: false });
  },

  /** 签订契约并关闭 */
  async onConfirmPact(): Promise<void> {
    if (!this.data.pactChecked) return;
    try {
      await recordShare();
    } catch { /* 网络失败不阻塞 */ }
    this.setData({ showSharePoster: false });
    this.loadProfile();
  },

  /** 切换契约复选框 */
  onTogglePactCheck(): void {
    this.setData({ pactChecked: !this.data.pactChecked });
  },

  /** 关闭海报弹窗 */
  onCloseShare(): void {
    this.setData({ showSharePoster: false });
  },

  /** 保存海报到相册 */
  onSavePoster(): void {
    wx.showLoading({ title: '保存中...' });

    // 根据小程序环境自动选择下载地址
    let POSTER_URL = 'https://wyq.yinque-ai.com/assets/share-poster.png';
    try {
      const { envVersion } = wx.getAccountInfoSync().miniProgram;
      if (envVersion !== 'release') {
        POSTER_URL = 'http://localhost:8080/assets/share-poster.png';
      }
    } catch { /* use prod fallback */ }

    wx.downloadFile({
      url: POSTER_URL,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
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

  /** 进入签订契约阶段二 */
  onConfirmShare(): void {
    this.setData({ shareConfirmed: true });
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
