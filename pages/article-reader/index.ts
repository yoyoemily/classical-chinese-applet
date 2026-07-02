import type { IArticle } from '../../typings/index.d';
import { fetchArticleDetail } from '../../api/index';

/** 阅读模式 */
type ReadingMode = 'plain' | 'paragraph' | 'sentence';

/** 逐句释义模式用的子句 */
interface IClause {
  text: string;
  translation: string;
  sentenceIndex: number;
  clauseIndex: number;
}

interface IArticleReaderData {
  article: IArticle | null;
  loading: boolean;
  readingMode: ReadingMode;
  /** 通篇释义用：按 sentence 的展开状态 */
  expandedStates: boolean[];
  /** 逐句释义用：按 clause 的展开状态 */
  clauseExpandedStates: boolean[];
  /** 逐句释义用：全文按句号拆分的子句列表 */
  clauses: IClause[];
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
  // 通篇释义 — 点击段落展开/收起译文
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
});
