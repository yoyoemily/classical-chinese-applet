import type { IArticle, IArticleSentence, ICharAnnotation, FeedbackCategory } from '../../typings/index.d';
import { fetchArticleDetail, submitFeedback } from '../../api/index';
import { getTTSPlayer } from '../../utils/tts';
import { safeJSONParse } from '../../utils/util';
import { STORAGE_KEYS } from '../../constants/config';

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

/** 通篇阅读：生词分段 */
interface IVocabSegment {
  text: string;
  isKeyword: boolean;
  word?: string;
  definition?: string;
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

  // 音频播放
  audioLoading: boolean;
  audioPlaying: boolean;

  // 内联生词链接
  /** 每句的文本分段（用于通篇阅读模式的高亮渲染） */
  vocabSegments: IVocabSegment[][];
  /** 当前弹出的生词信息 */
  vocabPopup: { word: string; definition: string } | null;

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
    vocabSegments: [], vocabPopup: null,
    audioLoading: false, audioPlaying: false,
    showFeedbackPanel: false, feedbackCategory: '', feedbackDescription: '', feedbackSubmitting: false,
  },

  _tts: null as ReturnType<typeof getTTSPlayer> | null,
  _autoPlayAudio: true,

  async onLoad(options: Record<string, string | undefined>): Promise<void> {
    const articleId = options.id || '';
    if (!articleId) { wx.navigateBack(); return; }
    try {
      // 加载设置
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const settings = raw ? safeJSONParse<{ autoPlayAudio?: boolean }>(raw, {}) : {};
      this._autoPlayAudio = settings.autoPlayAudio ?? true;

      // 初始化 TTS 播放器
      this._tts = getTTSPlayer();
      this._tts.stop();

      const article = await fetchArticleDetail(articleId);
      // 为每个句子生成 plainChars 回退数组，供AI注释模式在无标注数据时使用
      for (const s of article.sentences) {
        (s as IArticleSentence & { plainChars: string[] }).plainChars = s.text.split('');
      }
      const clauses = this.buildClauses(article);
      const vocabSegments = this.buildVocabSegments(article);
      this.setData({
        article,
        expandedStates: new Array(article.sentences.length).fill(false),
        clauseExpandedStates: new Array(clauses.length).fill(false),
        clauses,
        vocabSegments,
        loading: false,
      });

      // 自动播放
      if (this._autoPlayAudio) {
        this._playArticleAudio(article);
      }
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
  // AI注释 — 判断一句是否有标注数据
  // ==========================================

  /** 判断给定句子是否具备完整的AI注释数据 */
  hasAnnotations(sentence: IArticleSentence): sentence is IArticleSentence & { charAnnotations: ICharAnnotation[] } {
    return !!(sentence.charAnnotations && sentence.charAnnotations.length > 0);
  },

  // ==========================================
  // AI注释 — 点击实词弹出释义
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
  // AI注释 — 关闭弹出的释义
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

  // ==========================================
  // 内联生词链接 — 将句子按 keyWords 切分为普通文本/生词片段
  // ==========================================

  /**
   * 对一条句子的文本按 keyWords 做最长匹配切分，生成 segment 数组。
   * 每个 segment 要么是普通文本，要么是匹配到的生词（带释义）。
   */
  buildVocabSegments(article: IArticle): IVocabSegment[][] {
    return article.sentences.map(s => {
      const segments: IVocabSegment[] = [];
      // 按 word 长度降序排列，保证最长匹配优先
      const sortedKeywords = [...s.keyWords].sort((a, b) => b.word.length - a.word.length);
      let i = 0;
      const text = s.text;
      while (i < text.length) {
        let matched = false;
        for (const kw of sortedKeywords) {
          if (text.startsWith(kw.word, i)) {
            segments.push({
              text: kw.word,
              isKeyword: true,
              word: kw.word,
              definition: kw.definition,
            });
            i += kw.word.length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          // 收集连续的非关键词文本
          const start = i;
          i++;
          // 继续直到遇到下一个关键词或文本末尾
          while (i < text.length) {
            let hit = false;
            for (const kw of sortedKeywords) {
              if (text.startsWith(kw.word, i)) { hit = true; break; }
            }
            if (hit) break;
            i++;
          }
          segments.push({ text: text.slice(start, i), isKeyword: false });
        }
      }
      return segments;
    });
  },

  /** 点击生词 → 弹出释义卡片 */
  onTapVocabWord(e: WechatMiniprogram.BaseEvent): void {
    const { word, definition } = e.currentTarget.dataset as { word: string; definition: string };
    const current = this.data.vocabPopup;
    if (current && current.word === word) {
      // 再次点击同一个词 → 收起
      this.setData({ vocabPopup: null });
    } else {
      this.setData({ vocabPopup: { word, definition } });
    }
  },

  /** 关闭生词释义弹窗 */
  onDismissVocabPopup(): void {
    this.setData({ vocabPopup: null });
  },

  onShareAppMessage() {
    return {
      title: `阅读「${this.data.article?.title || ''}」`,
      path: '/pages/index/index',
    };
  },

  // ==========================================
  // 音频播放
  // ==========================================

  onTapAudio(): void {
    if (!this.data.article) return;

    // 正在播放或加载中 → 停止
    if (this._tts?.status === 'loading' || this._tts?.status === 'playing') {
      this._tts.stop();
      return;
    }

    this._playArticleAudio(this.data.article);
  },

  /** 拼接全文文本 */
  _buildFullText(article: IArticle): string {
    return article.sentences.map(s => s.text).join('');
  },

  _playArticleAudio(article: IArticle): void {
    if (!this._tts) return;
    const text = this._buildFullText(article);
    this._tts.play(text, article.fullTextAudioUrl, {
      onStatusChange: (status) => {
        this.setData({
          audioLoading: status === 'loading',
          audioPlaying: status === 'playing',
        });
      },
    });
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

  // ==========================================
  // 生命周期
  // ==========================================

  onHide(): void {
    this._tts?.stop();
  },

  onUnload(): void {
    this._tts?.destroy();
    this._tts = null;
  },
});
