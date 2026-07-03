import type { IWord, IMeaning, FeedbackCategory } from '../../typings/index.d';
import { fetchWordDetail, submitFeedback } from '../../api/index';

interface IMeaningItem extends IMeaning {
  expanded: boolean;
}

interface IWordSummaryData {
  word: IWord | null;
  character: string;
  characterType: string;
  explanation: string;
  oracleForm: string;
  examFrequency: string;
  meaningItems: IMeaningItem[];
  loading: boolean;

  // 错误反馈
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;
}

Page<IWordSummaryData, WechatMiniprogram.Page.CustomOption>({
  data: {
    word: null, character: '', characterType: '', explanation: '',
    oracleForm: '', examFrequency: '',
    meaningItems: [],
    loading: true,
    showFeedbackPanel: false, feedbackCategory: '', feedbackDescription: '', feedbackSubmitting: false,
  },
  onLoad(options: Record<string, string | undefined>): void {
    const wordId = options.wordId || '';
    if (wordId) this.loadWord(wordId);
    else this.setData({ loading: false });
  },
  async loadWord(wordId: string): Promise<void> {
    try {
      const word = await fetchWordDetail(wordId);
      if (!word) { this.setData({ loading: false }); return; }
      const meaningItems: IMeaningItem[] = (word.meanings || []).map(m => ({ ...m, expanded: false }));
      this.setData({
        word, character: word.character,
        characterType: word.characterType || '',
        explanation: word.explanation || '',
        oracleForm: word.oracleForm || '',
        examFrequency: word.examFrequency || '',
        meaningItems,
        loading: false,
      });
    } catch { this.setData({ loading: false }); }
  },
  onTapMeaning(e: WechatMiniprogram.TouchEvent): void {
    const idx = e.currentTarget.dataset.index as number;
    const item = this.data.meaningItems[idx];
    if (!item) return;
    this.setData({ [`meaningItems[${idx}].expanded`]: !item.expanded });
  },
  onTapContinue(): void { wx.navigateBack(); },
  onShareAppMessage() { return { title: `学习「${this.data.character || ''}」`, path: '/pages/index/index' }; },

  // ==========================================
  // 错误反馈
  // ==========================================

  onTapFeedback(): void {
    this.setData({ showFeedbackPanel: true, feedbackCategory: '', feedbackDescription: '' });
  },

  onCloseFeedback(): void {
    this.setData({ showFeedbackPanel: false });
  },

  onSelectFeedbackCategory(e: WechatMiniprogram.BaseEvent): void {
    const cat = e.currentTarget.dataset.category as string;
    this.setData({ feedbackCategory: cat === this.data.feedbackCategory ? '' : cat });
  },

  onFeedbackDescriptionInput(e: WechatMiniprogram.Input): void {
    this.setData({ feedbackDescription: e.detail.value });
  },

  async onSubmitFeedback(): Promise<void> {
    if (!this.data.feedbackCategory) {
      wx.showToast({ title: '请选择错误类型', icon: 'none' });
      return;
    }
    if (this.data.feedbackSubmitting) return;
    this.setData({ feedbackSubmitting: true });

    try {
      await submitFeedback({
        category: this.data.feedbackCategory as FeedbackCategory,
        source: 'word_summary',
        description: this.data.feedbackDescription,
        context: {
          wordId: this.data.word?.id,
        },
      });
      this.setData({ showFeedbackPanel: false, feedbackSubmitting: false });
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ feedbackSubmitting: false });
    }
  },
});
