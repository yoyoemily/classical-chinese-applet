// ============================================
// 公告详情页
// ============================================
import { fetchAnnouncementDetail } from '../../../api/index';

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

  /** 公告 ID（从 onLoad query 中获取） */
  _id: 0,

  onLoad(query: Record<string, string | undefined>): void {
    const id = Number(query.id);
    if (id) {
      this._id = id;
      this.loadDetail(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
    }
  },

  async loadDetail(id: number): Promise<void> {
    try {
      const detail = await fetchAnnouncementDetail(id);
      this.setData({
        title: detail.title,
        paragraphs: this.splitParagraphs(detail.content),
        displayTime: detail.publishTime,
        loading: false,
      });
    } catch {
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