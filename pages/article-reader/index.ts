import type { IArticle, IArticleSentence, ICharAnnotation, FeedbackCategory } from '../../typings/index.d';
import { fetchArticleDetail, submitFeedback } from '../../api/index';

/** 阅读模式 */
type ReadingMode = 'plain' | 'paragraph' | 'sentence' | 'annotation';

/** 逐句释义模式用的子句 */
interface IClause {
  text: string;
  translation: string;
  sentenceIndex: number;
  clauseIndex: number;
}

/** 标注模式中已展开的释义位置记录 */
interface IActiveAnnotation {
  sentenceIndex: number;
  charIndex: number;
  definition: string;
}

interface IArticleReaderData {
  article: IArticle | null;
  loading: boolean;
  readingMode: ReadingMode;
  /** 段落释义用：按 sentence 的展开状态 */
  expandedStates: boolean[];
  /** 逐句释义用：按 clause 的展开状态 */
  clauseExpandedStates: boolean[];
  /** 逐句释义用：全文按句号拆分的子句列表 */
  clauses: IClause[];
  /** 标注模式：当前激活的释义 */
  activeAnnotation: IActiveAnnotation | null;

  // 错误反馈
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;
}

/** 按中文标点拆分文本为子句，返回非空片段 */
function splitClauses(text: string): string[] {
  return text
    .split(/[。！？；]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

Page<IArticleReaderData, WechatMiniprogram.Page.CustomOption>({
  data: {
    article: null, loading: true, readingMode: 'plain' as ReadingMode,
    expandedStates: [], clauseExpandedStates: [], clauses: [],
    activeAnnotation: null,
    showFeedbackPanel: false, feedbackCategory: '', feedbackDescription: '', feedbackSubmitting: false,
  },

  async onLoad(options: Record<string, string | undefined>): Promise<void> {
    const articleId = options.id || '';
    if (!articleId) { wx.navigateBack(); return; }
    try {
      const article = await fetchArticleDetail(articleId);
      const clauses = this.buildClauses(article);
      this.setData({
        article,
        expandedStates: new Array(article.sentences.length).fill(false),
        clauseExpandedStates: new Array(clauses.length).fill(false),
        clauses,
        loading: false,
      });
    } catch { this.setData({ loading: false }); }
  },

  // ==========================================
  // 子句构建
  // ==========================================

  buildClauses(article: IArticle): IClause[] {
    const result: IClause[] = [];
    for (let si = 0; si < article.sentences.length; si++) {
      const s = article.sentences[si];
      const textParts = splitClauses(s.text);
      const transParts = splitClauses(s.translation);
      for (let ci = 0; ci < textParts.length; ci++) {
        result.push({
          text: textParts[ci],
          translation: transParts[ci] || transParts[transParts.length - 1] || s.translation,
          sentenceIndex: si,
          clauseIndex: ci,
        });
      }
    }
    return result;
  },

  // ==========================================
  // 模式切换
  // ==========================================

  onSwitchMode(e: WechatMiniprogram.BaseEvent): void {
    const mode = e.currentTarget.dataset.mode as ReadingMode;
    if (mode === this.data.readingMode) return;
    this.setData({ readingMode: mode });
  },

  // ==========================================
  // 段落释义 — 点击段落展开/收起译文
  // ==========================================

  onTapSentence(e: WechatMiniprogram.BaseEvent): void {
    const idx = Number(e.currentTarget.dataset.index);
    const states = [...this.data.expandedStates];
    states[idx] = !states[idx];
    this.setData({ expandedStates: states });
  },

  // ==========================================
  // 逐句释义 — 点击子句展开/收起译文
  // ==========================================

  onTapClause(e: WechatMiniprogram.BaseEvent): void {
    const ci = Number(e.currentTarget.dataset.clauseIndex);
    const states = [...this.data.clauseExpandedStates];
    states[ci] = !states[ci];
    this.setData({ clauseExpandedStates: states });
  },

  // ==========================================
  // 逐字标注 — 判断一句是否有标注数据
  // ==========================================

  /** 判断给定句子是否具备完整的逐字标注数据 */
  hasAnnotations(sentence: IArticleSentence): sentence is IArticleSentence & { charAnnotations: ICharAnnotation[] } {
    return !!(sentence.charAnnotations && sentence.charAnnotations.length > 0);
  },

  // ==========================================
  // 逐字标注 — 点击实词弹出释义
  // ==========================================

  onTapChar(e: WechatMiniprogram.BaseEvent): void {
    const { sentenceIndex, charIndex } = e.currentTarget.dataset as Record<string, number>;
    const sentence = this.data.article?.sentences[sentenceIndex];
    if (!sentence?.charAnnotations) return;
    const ann = sentence.charAnnotations[charIndex];
    if (!ann || ann.role !== 'content' || !ann.definition) return;

    const active = this.data.activeAnnotation;
    if (active && active.sentenceIndex === sentenceIndex && active.charIndex === charIndex) {
      // 再次点击同一字 → 收起
      this.setData({ activeAnnotation: null });
    } else {
      this.setData({
        activeAnnotation: { sentenceIndex, charIndex, definition: ann.definition },
      });
    }
  },

  // ==========================================
  // 逐字标注 — 关闭弹出的释义
  // ==========================================

  onDismissAnnotation(): void {
    this.setData({ activeAnnotation: null });
  },

  // ==========================================
  // 重点字词跳转
  // ==========================================

  onTapKeyword(e: WechatMiniprogram.BaseEvent): void {
    const wordBookId = e.currentTarget.dataset.wordBookId as string | undefined;
    const word = e.currentTarget.dataset.word as string | undefined;
    if (wordBookId) {
      wx.navigateTo({ url: `/pages/word-summary/index?wordId=${encodeURIComponent(word || '')}` });
    }
  },

  onShareAppMessage() {
    return {
      title: `阅读「${this.data.article?.title || ''}」`,
      path: '/pages/index/index',
    };
  },

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
        source: 'article_reader',
        description: this.data.feedbackDescription,
        context: {
          articleId: this.data.article?.id,
          readingMode: this.data.readingMode,
        },
      });
      this.setData({ showFeedbackPanel: false, feedbackSubmitting: false });
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ feedbackSubmitting: false });
    }
  },
});
