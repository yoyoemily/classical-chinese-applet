// ============================================
// 经典阅读器页面 v2
// 支持 full/chunked 加载 + strip/list/accordion/search 导航
// ============================================
import type {
  IClassicMeta, ITocNode, IContentBlock, IChapterParagraph, IClassicGlossaryItem,
  FeedbackCategory
} from '../../typings/index.d';
import { fetchClassicMeta, fetchClassicContent, submitFeedback } from '../../api/index';
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
  meta: IClassicMeta | null;
  /** full 模式下的全量章节（兼容旧逻辑） */
  fullChapters: IClassicChapter[];
  /** chunked 模式下的当前内容块 */
  currentContent: IContentBlock | null;
  /** chunked 模式已加载内容的缓存 */
  contentCache: Record<string, IContentBlock>;
  /** 当前选中的目录节点 ID */
  currentNodeId: string;
  /** 当前内容的段落切分 */
  paragraphSegments: IGlossarySegment[][];
  loading: boolean;
  contentLoading: boolean;
  /** 目录面板 */
  tocNodes: ITocNode[];
  showTocPanel: boolean;
  tocSearchKeyword: string;
  /** 典故弹窗 */
  glossaryPopup: { paragraphIndex: number; word: string; explanation: string } | null;
  /** 语音播报 */
  audioLoading: boolean;
  audioPlaying: boolean;
  /** 错误反馈 */
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;
}

/** 旧版章节结构（full 模式用，兼容 mock 数据类型） */
interface IClassicChapter {
  id: number;
  title: string;
  paragraphs: IChapterParagraph[];
}

Page<IClassicReaderData, WechatMiniprogram.Page.CustomOption>({
  data: {
    meta: null,
    fullChapters: [],
    currentContent: null,
    contentCache: {},
    currentNodeId: '',
    paragraphSegments: [],
    loading: true,
    contentLoading: false,
    tocNodes: [],
    showTocPanel: false,
    tocSearchKeyword: '',
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
  _classicId: 0,

  async onLoad(options: Record<string, string | undefined>): Promise<void> {
    const classicId = Number(options.id);
    if (!classicId) {
      wx.navigateBack();
      return;
    }
    this._classicId = classicId;

    try {
      // 加载设置
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const settings = raw ? safeJSONParse<{ autoPlayAudio?: boolean }>(raw, {}) : {};
      this._autoPlayAudio = settings.autoPlayAudio ?? true;

      // 初始化 TTS
      this._tts = getTTSPlayer();
      this._tts.stop();

      const meta = await fetchClassicMeta(classicId);

      // full 模式：兼容旧结构 chapters 字段
      const fullChapters = (meta as Record<string, unknown>).chapters as IClassicChapter[] | undefined;

      this.setData({ meta, tocNodes: meta.toc, loading: false });

      if (meta.loadMode === 'full' && fullChapters) {
        // full 加载：直接渲染全部内容
        const paragraphSegments = this.buildAllGlossarySegments(fullChapters);
        this.setData({ fullChapters, paragraphSegments, currentNodeId: '' });

        if (this._autoPlayAudio) {
          this._playFullText(fullChapters);
        }
      } else {
        // chunked 模式：等待用户选择
        // 如果 navMode 是 strip/accordion 且有内容，自动加载第一篇
        if ((meta.navMode === 'strip' || meta.navMode === 'accordion') && meta.toc.length > 0) {
          const firstNode = this.findFirstLeaf(meta.toc);
          if (firstNode) this.loadContent(firstNode.id);
        }
      }
    } catch {
      this.setData({ loading: false });
    }
  },

  // ==========================================
  // 内容加载（chunked 模式）
  // ==========================================

  async loadContent(nodeId: string): Promise<void> {
    const cache = this.data.contentCache;
    if (cache[nodeId]) {
      // 缓存命中
      this.renderContent(cache[nodeId], nodeId);
      return;
    }

    this.setData({ contentLoading: true });
    try {
      const content = await fetchClassicContent(this._classicId, nodeId);
      const newCache = { ...this.data.contentCache, [nodeId]: content };
      this.renderContent(content, nodeId);
      this.setData({ contentCache: newCache, contentLoading: false });
    } catch {
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      this.setData({ contentLoading: false });
    }
  },

  renderContent(content: IContentBlock, nodeId: string): void {
    const paragraphSegments = content.paragraphs
      ? content.paragraphs.map(p => this.buildSegment(p))
      : [];
    this.setData({
      currentContent: content,
      currentNodeId: nodeId,
      paragraphSegments,
    });

    // 自动播报
    if (this._autoPlayAudio && this._tts) {
      const text = content.paragraphs
        ? content.paragraphs.map(p => p.text).join('')
        : (content.text || '');
      this._tts.play(text, undefined, {
        onStatusChange: (status) => {
          this.setData({
            audioLoading: status === 'loading',
            audioPlaying: status === 'playing',
          });
        },
      });
    }
  },

  // ==========================================
  // 目录面板操作
  // ==========================================

  onToggleToc(): void {
    this.setData({ showTocPanel: !this.data.showTocPanel });
  },

  onCloseToc(): void {
    this.setData({ showTocPanel: false });
  },

  onTocSearchInput(e: WechatMiniprogram.Input): void {
    this.setData({ tocSearchKeyword: e.detail.value });
  },

  onTapTocNode(e: WechatMiniprogram.BaseEvent): void {
    const { nodeId, isLeaf } = e.currentTarget.dataset as { nodeId: string; isLeaf: boolean };
    if (!isLeaf) return;

    this.setData({ showTocPanel: false });

    if (this.data.meta?.loadMode === 'full') {
      // full 模式：scroll-into-view 跳转
      this.setData({ currentNodeId: nodeId });
    } else {
      // chunked 模式：按需加载
      this.loadContent(nodeId);
    }
  },

  // ==========================================
  // 横向导航条（strip 模式）
  // ==========================================

  onTapStripNode(e: WechatMiniprogram.BaseEvent): void {
    const { nodeId, isLeaf } = e.currentTarget.dataset as { nodeId: string; isLeaf: boolean };
    if (!isLeaf || nodeId === this.data.currentNodeId) return;

    if (this.data.meta?.loadMode === 'full') {
      this.setData({ currentNodeId: nodeId });
    } else {
      this.loadContent(nodeId);
    }
  },

  // ==========================================
  // 按需加载时切换章节
  // ==========================================

  onTapPrevChapter(): void {
    const nodes = this.data.tocNodes;
    if (nodes.length === 0) return;
    const idx = nodes.findIndex(n => n.id === this.data.currentNodeId);
    if (idx > 0 && nodes[idx - 1].isLeaf) {
      this.loadContent(nodes[idx - 1].id);
    }
  },

  onTapNextChapter(): void {
    const nodes = this.data.tocNodes;
    if (nodes.length === 0) return;
    const idx = nodes.findIndex(n => n.id === this.data.currentNodeId);
    if (idx < nodes.length - 1 && nodes[idx + 1].isLeaf) {
      this.loadContent(nodes[idx + 1].id);
    }
  },

  // ==========================================
  // 典故注释段切分
  // ==========================================

  buildAllGlossarySegments(chapters: IClassicChapter[]): IGlossarySegment[][][] {
    return chapters.map(ch =>
      ch.paragraphs.map(p => this.buildSegment(p))
    );
  },

  buildSegment(para: IChapterParagraph): IGlossarySegment[] {
    const segments: IGlossarySegment[] = [];
    const glossary = para.glossary || [];
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
  // 典故注释弹窗
  // ==========================================

  onTapGlossaryWord(e: WechatMiniprogram.BaseEvent): void {
    const { paragraphIndex, word, explanation } =
      e.currentTarget.dataset as { paragraphIndex: number; word: string; explanation: string };
    const current = this.data.glossaryPopup;
    if (current && current.paragraphIndex === paragraphIndex && current.word === word) {
      this.setData({ glossaryPopup: null });
    } else {
      this.setData({ glossaryPopup: { paragraphIndex, word, explanation } });
    }
  },

  onDismissGlossaryPopup(): void {
    this.setData({ glossaryPopup: null });
  },

  // ==========================================
  // 语音播报
  // ==========================================

  onTapAudio(): void {
    if (this._tts?.status === 'loading' || this._tts?.status === 'playing') {
      this._tts.stop();
      return;
    }
    const { meta } = this.data;
    if (!meta) return;

    if (meta.loadMode === 'full' && this.data.fullChapters.length > 0) {
      this._playFullText(this.data.fullChapters);
    } else if (this.data.currentContent) {
      const c = this.data.currentContent;
      const text = c.paragraphs ? c.paragraphs.map(p => p.text).join('') : (c.text || '');
      this._tts?.play(text, undefined, {
        onStatusChange: (status) => {
          this.setData({
            audioLoading: status === 'loading',
            audioPlaying: status === 'playing',
          });
        },
      });
    }
  },

  _playFullText(chapters: IClassicChapter[]): void {
    if (!this._tts) return;
    const text = chapters
      .map(ch => ch.paragraphs.map(p => p.text).join(''))
      .join('');
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
          classicId: this.data.meta?.id,
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
      title: `阅读「${this.data.meta?.name || ''}」`,
      path: '/pages/index/index',
    };
  },

  // ==========================================
  // 工具方法
  // ==========================================

  /** 从目录树中递归查找第一个叶子节点 */
  findFirstLeaf(nodes: ITocNode[]): ITocNode | null {
    for (const n of nodes) {
      if (n.isLeaf) return n;
      if (n.children && n.children.length > 0) {
        const found = this.findFirstLeaf(n.children);
        if (found) return found;
      }
    }
    return null;
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
