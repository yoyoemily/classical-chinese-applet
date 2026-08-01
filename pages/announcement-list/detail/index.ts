// ============================================
// 公告详情页
// ============================================
interface IAnnouncementDetailData {
  title: string;
  content: string;
  displayTime: string;
  loading: boolean;
}

Page<IAnnouncementDetailData, WechatMiniprogram.Page.CustomOption>({
  data: {
    title: '',
    content: '',
    displayTime: '',
    loading: true,
  },

  onLoad(): void {
    const app = getApp<IAppOption>();
    const data = app.globalData._announcementForDetail;

    if (data) {
      this.setData({
        title: data.title,
        content: data.content,
        displayTime: data.displayTime,
        loading: false,
      });
      delete app.globalData._announcementForDetail;
    } else {
      wx.showToast({ title: '加载失败', icon: 'none' });
      wx.navigateBack();
    }
  },

  /** 分享 */
  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return {
      title: this.data.title,
      path: '/pages/index/index',
    };
  },
});
