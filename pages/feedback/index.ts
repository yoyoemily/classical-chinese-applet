// ============================================
// 意见建议页面
// ============================================
import { submitSuggestion } from '../../api/index';

interface IFeedbackData {
  content: string;
  contact: string;
  categories: string[];
  categoryIndex: number;
  submitting: boolean;
}

Page<IFeedbackData, WechatMiniprogram.Page.CustomOption>({
  data: {
    content: '',
    contact: '',
    categories: ['功能建议', '问题反馈', '体验优化', '其他'],
    categoryIndex: 0,
    submitting: false,
  },

  onInputContent(e: WechatMiniprogram.Input): void {
    this.setData({ content: e.detail.value });
  },

  onInputContact(e: WechatMiniprogram.Input): void {
    this.setData({ contact: e.detail.value });
  },

  onCategoryChange(e: WechatMiniprogram.PickerChange): void {
    this.setData({ categoryIndex: Number(e.detail.value) });
  },

  async onSubmit(): Promise<void> {
    const { content, contact, categories, categoryIndex, submitting } = this.data;
    if (submitting) return;
    if (!content.trim()) {
      wx.showToast({ title: '请输入您的建议', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      await submitSuggestion({
        content: content.trim(),
        contact: contact.trim() || undefined,
        category: categories[categoryIndex],
      });
      wx.showToast({ title: '感谢您的建议！', icon: 'success', duration: 1500 });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err: any) {
      this.setData({ submitting: false });
      wx.showToast({ title: err?.message || '提交失败，请重试', icon: 'none' });
    }
  },
});
