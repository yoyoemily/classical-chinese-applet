// ============================================
// 经典阅读器页面
// ============================================
import type { IClassicBook, IClassicChapter, IChapterParagraph, IClassicGlossaryItem, FeedbackCategory } from '../../typings/index.d';
import { fetchClassicBookDetail, submitFeedback } from '../../api/index';
import { getTTSPlayer } from '../../utils/tts';
import { safeJSONParse } from '../../utils/util';
import { STORAGE_KEYS } from '../../constants/config';

/** 典故注释：段切分结构 */
interface IGlossarySegment {
  text: string;
  isGlossary: boolean;
  word?: string;
  explanation?: string;
}

interface IClassicReaderData {
  book: IClassicBook | null;
  loading: boolean;
  /** 三段嵌套：paragraphSegments[chapterIndex][paragraphIndex] = IGlossarySegment[] */
  paragraphSegments: IGlossarySegment[][][];
  /** 典故弹窗 */
  glossaryPopup: { chapterIndex: number; paragraphIndex: number; word: string; explanation: string } | null;
  /** 语音播报 */
  audioLoading: boolean;
  audioPlaying: boolean;
  /** 错误反馈 */
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;
}

Page<IClassicReaderData, WechatMiniprogram.Page.CustomOption>({
  data: {
    book: null,
    loading: true,
    paragraphSegments: [],
    glossaryPopup: null,
    audioLoading: false,
    audioPlaying: false,
    showFeedbackPanel: false,
    feedbackCategory: '',
    feedbackDescription: '',
    feedbackSubmitting: false,
  },

  _tts: null as ReturnType<typeof getTTSPlayer> | null,
  _autoPlayAudio: true,

  async onLoad(options: Record<string, string | undefined>): Promise<void> {
    const classicId = Number(options.id);
    if (!classicId) {
      wx.navigateBack();
      return;
    }
    try {
      // 加载设置
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const settings = raw ? safeJSONParse<{ autoPlayAudio?: boolean }>(raw, {}) : {};
      this._autoPlayAudio = settings.autoPlayAudio ?? true;

      // 初始化 TTS
      this._tts = getTTSPlayer();
      this._tts.stop();

      const book = await fetchClassicBookDetail(classicId);
      const paragraphSegments = this.buildAllGlossarySegments(book);
      this.setData({ book, paragraphSegments, loading: false });

      if (this._autoPlayAudio) {
        this._playBookAudio(book);
      }
    } catch {
      this.setData({ loading: false });
    }
  },

  // ==========================================
  // 典故注释段切分
  // ==========================================

  /**
   * 对所有章节的所有段落执行最长匹配切分
   */
  buildAllGlossarySegments(book: IClassicBook): IGlossarySegment[][][] {
    return book.chapters.map(ch =>
      ch.paragraphs.map(p => this.buildSegment(p))
    );
  },

  /**
   * 对单个段落的原文按 glossary 做最长匹配切分
   */
  buildSegment(para: IChapterParagraph): IGlossarySegment[] {
    const segments: IGlossarySegment[] = [];
    const glossary = para.glossary || [];
    // 按 word 长度降序，最长匹配优先
    const sorted = [...glossary].sort((a, b) => b.word.length - a.word.length);
    let i = 0;
    const text = para.text;
    while (i < text.length) {
      let matched = false;
      for (const g of sorted) {
        if (text.startsWith(g.word, i)) {
          segments.push({
            text: g.word,
            isGlossary: true,
            word: g.word,
            explanation: g.explanation,
          });
          i += g.word.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const start = i;
        i++;
        while (i < text.length) {
          let hit = false;
          for (const g of sorted) {
            if (text.startsWith(g.word, i)) { hit = true; break; }
          }
          if (hit) break;
          i++;
        }
        segments.push({ text: text.slice(start, i), isGlossary: false });
      }
    }
    return segments;
  },

  // ==========================================
  // 典故注释 — 点击/关闭
  // ==========================================

  onTapGlossaryWord(e: WechatMiniprogram.BaseEvent): void {
    const { chapterIndex, paragraphIndex, word, explanation } =
      e.currentTarget.dataset as { chapterIndex: number; paragraphIndex: number; word: string; explanation: string };
    const current = this.data.glossaryPopup;
    if (current && current.chapterIndex === chapterIndex && current.paragraphIndex === paragraphIndex && current.word === word) {
      this.setData({ glossaryPopup: null });
    } else {
      this.setData({ glossaryPopup: { chapterIndex, paragraphIndex, word, explanation } });
    }
  },

  onDismissGlossaryPopup(): void {
    this.setData({ glossaryPopup: null });
  },

  // ==========================================
  // 语音播报
  // ==========================================

  onTapAudio(): void {
    if (!this.data.book) return;
    if (this._tts?.status === 'loading' || this._tts?.status === 'playing') {
      this._tts.stop();
      return;
    }
    this._playBookAudio(this.data.book);
  },

  _buildFullText(book: IClassicBook): string {
    return book.chapters
      .map(ch => ch.paragraphs.map(p => p.text).join(''))
      .join('');
  },

  _playBookAudio(book: IClassicBook): void {
    if (!this._tts) return;
    const text = this._buildFullText(book);
    this._tts.play(text, undefined, {
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
        source: 'classic_reader',
        description: this.data.feedbackDescription,
        context: {
          classicId: this.data.book?.id,
        },
      });
      this.setData({ showFeedbackPanel: false, feedbackSubmitting: false });
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ feedbackSubmitting: false });
    }
  },

  // ==========================================
  // 分享
  // ==========================================

  onShareAppMessage() {
    return {
      title: `阅读「${this.data.book?.name || ''}」`,
      path: '/pages/index/index',
    };
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
