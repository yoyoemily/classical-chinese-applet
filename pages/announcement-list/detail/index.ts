// ============================================
// 公告详情页
// ============================================

interface IAnnouncementDetailData {
  title: string;
  /** 段落列表：纯文本或带 <strong>/<br> 的 HTML 片段 */
  paragraphs: string[];
  displayTime: string;
  loading: boolean;
}

Page<IAnnouncementDetailData, WechatMiniprogram.Page.CustomOption>({
  data: {
    title: '',
    paragraphs: [],
    displayTime: '',
    loading: true,
  },

  onLoad(): void {
    const app = getApp<IAppOption>();
    const data = app.globalData._announcementForDetail;

    if (data) {
      this.setData({
        title: data.title,
        paragraphs: this.splitParagraphs(data.content),
        displayTime: data.displayTime,
        loading: false,
      });
      delete app.globalData._announcementForDetail;
    } else {
      wx.showToast({ title: '加载失败', icon: 'none' });
      wx.navigateBack();
    }
  },

  /** 把 HTML 按 <p> 切分成段落数组，去掉 <p> 标签本身，保留内部 <strong>/<br> */
  splitParagraphs(html: string): string[] {
    const result: string[] = [];
    const pRegex = /<p>(.*?)<\/p>/gs;
    let match: RegExpExecArray | null;
    while ((match = pRegex.exec(html)) !== null) {
      const inner = match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, '\'')
        .replace(/&nbsp;/g, ' ');
      result.push(inner);
    }
    return result;
  },

  /** 分享 */
  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return {
      title: this.data.title,
      path: '/pages/index/index',
    };
  },
});
