// ============================================
// 经典阅读器页面 v2
// 支持 full/chunked 加载 + strip/list/accordion/author 导航
// ============================================
import type {
  IClassicMeta, ITocNode, IContentBlock, IChapterParagraph, IClassicGlossaryItem,
  FeedbackCategory
} from '../../typings/index.d';
import { fetchClassicMeta, fetchClassicContent, submitFeedback, completeAudioListen } from '../../api/index';
import { getTTSPlayer } from '../../utils/tts';
import { splitByRareChar } from '../../utils/util';
import { calcAudioXP } from '../../constants/config';

/** 典故注释：段切分结构 */
interface IGlossarySegment {
  text: string;
  isGlossary: boolean;
  word?: string;
  explanation?: string;
  /** 生僻字拼音（仅当 segment 为单一生僻字时携带） */
  pinyin?: string;
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
  /** 当前篇章作者（选集型从 TOC/content 获取） */
  chapterAuthor: string;
  /** 当前篇章朝代（选集型从 TOC/content 获取） */
  chapterEra: string;
  /** 当前内容的段落切分 */
  paragraphSegments: IGlossarySegment[][];
  loading: boolean;
  contentLoading: boolean;
  /** 目录面板 */
  tocNodes: ITocNode[];
  showTocPanel: boolean;
  /** author nav mode: 面板层级 0=作者列表, 1=该作者诗篇列表 */
  authorLevel: number;
  /** author nav mode: 当前选中的作者（group id） */
  selectedAuthor: string;
  /** author nav mode: 当前选中作者的诗篇列表 */
  authorEntries: ITocNode[];
  /** 典故弹窗 */
  glossaryPopup: { paragraphIndex: number; word: string; explanation: string } | null;
  /** 创作背景 */
  showBackground: boolean;
  /** 语音播报 */
  audioLoading: boolean;
  audioPlaying: boolean;
  /** 错误反馈 */
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;
  /** +XP 动效 */
  xpAnimation: { xp: number } | null;
  /** 当前用户已听读节点 ID 集合 */
  listenedNodeIds: Record<string, boolean>;
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
    chapterAuthor: '',
    chapterEra: '',
    paragraphSegments: [],
    loading: true,
    contentLoading: false,
    tocNodes: [],
    showTocPanel: false,
    authorLevel: 0,
    selectedAuthor: '',
    authorEntries: [],
    glossaryPopup: null,
    showBackground: false,
    audioLoading: false,
    audioPlaying: false,
    showFeedbackPanel: false,
    feedbackCategory: '',
    feedbackDescription: '',
    feedbackSubmitting: false,
    xpAnimation: null,
    listenedNodeIds: {},
  },

  _tts: null as ReturnType<typeof getTTSPlayer> | null,
  _classicId: 0,

  async onLoad(options: Record<string, string | undefined>): Promise<void> {
    const classicId = Number(options.id);
    if (!classicId) {
      wx.navigateBack();
      return;
    }
    this._classicId = classicId;

    try {
      // 初始化 TTS
      this._tts = getTTSPlayer();
      this._tts.stop();

      const meta = await fetchClassicMeta(classicId);

      // full 模式：兼容旧结构 chapters 字段
      const fullChapters = (meta as Record<string, unknown>).chapters as IClassicChapter[] | undefined;

      const listenedMap: Record<string, boolean> = {};
      (meta.listenedNodeIds || []).forEach(id => { listenedMap[id] = true; });
      this.setData({ meta, tocNodes: meta.toc, loading: false, listenedNodeIds: listenedMap });

      if (meta.loadMode === 'full' && fullChapters) {
        // full 加载：直接渲染全部内容
        const paragraphSegments = this.buildAllGlossarySegments(fullChapters);
        this.setData({ fullChapters, paragraphSegments, currentNodeId: '' });
      } else {
        // chunked 模式：等待用户选择
        // 如果 navMode 是 strip/accordion 且有内容，自动加载第一篇
        if ((meta.navMode === 'strip' || meta.navMode === 'accordion') && meta.toc.length > 0) {
          const firstNode = this.findFirstLeaf(meta.toc);
          if (firstNode) this.loadContent(firstNode.id);
        }
        // author 模式：显示提示，不自动加载
        if (meta.navMode === 'author') {
          this.setData({ authorLevel: 0 });
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

    // 获取当前篇章的 author/era（优先从 content 本身取，再从 TOC 叶子节点取）
    const chapterAuthor = content.author || this.getTocLeafAuthor(nodeId);
    const chapterEra = content.era || this.getTocLeafEra(nodeId);

    this.setData({
      currentContent: content,
      currentNodeId: nodeId,
      chapterAuthor,
      chapterEra,
      paragraphSegments,
    });
  },

  // ==========================================
  // 目录面板操作
  // ==========================================

  onToggleToc(): void {
    const willOpen = !this.data.showTocPanel;
    this.setData({ showTocPanel: willOpen, authorLevel: 0 });
    // 打开目录时从服务端刷新 listenedNodeIds
    if (!willOpen) return;
    fetchClassicMeta(this._classicId).then(meta => {
      const m: Record<string, boolean> = {};
      (meta.listenedNodeIds || []).forEach(id => { m[id] = true; });
      this.setData({ listenedNodeIds: m });
    }).catch(() => {});
  },

  onCloseToc(): void {
    this.setData({ showTocPanel: false, authorLevel: 0 });
  },

  onTapTocNode(e: WechatMiniprogram.BaseEvent): void {
    const { nodeId, isLeaf } = e.currentTarget.dataset as { nodeId: string; isLeaf: boolean };
    if (!isLeaf) return;

    this.setData({ showTocPanel: false, authorLevel: 0 });

    if (this.data.meta?.loadMode === 'full') {
      // full 模式：scroll-into-view 跳转
      this.setData({ currentNodeId: nodeId });
    } else {
      // chunked 模式：按需加载
      this.loadContent(nodeId);
    }
  },

  // ==========================================
  // author 导航模式：二级浏览
  // ==========================================

  /** 点击作者 → 展开该作者诗篇列表 */
  onTapAuthor(e: WechatMiniprogram.BaseEvent): void {
    const { groupId } = e.currentTarget.dataset as { groupId: string };
    const node = this.data.tocNodes.find(n => n.id === groupId);
    if (node && node.children) {
      this.setData({
        selectedAuthor: node.title,
        authorEntries: node.children.filter(c => c.isLeaf),
        authorLevel: 1,
      });
    }
  },

  /** 返回作者列表 */
  onBackToAuthorList(): void {
    this.setData({ authorLevel: 0, selectedAuthor: '', authorEntries: [] });
  },

  /** 点击诗篇 → 加载内容 */
  onTapAuthorEntry(e: WechatMiniprogram.BaseEvent): void {
    const { nodeId, isLeaf } = e.currentTarget.dataset as { nodeId: string; isLeaf: boolean };
    if (!isLeaf) return;
    this.setData({ showTocPanel: false, authorLevel: 0 });
    this.loadContent(nodeId);
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

  /**
   * 将 TOC 扁平化为叶子节点（按阅读顺序），用于上下篇导航。
   * accordion/author 模式下叶子节点嵌套在 children 中，直接遍历顶层 tocNodes 会漏掉。
   */
  flattenTocLeaves(nodes: ITocNode[]): ITocNode[] {
    const result: ITocNode[] = [];
    for (const n of nodes) {
      if (n.isLeaf) {
        result.push(n);
      } else if (n.children && n.children.length > 0) {
        for (const child of n.children) {
          result.push(child);
        }
      }
    }
    return result;
  },

  getLeafNodes(): ITocNode[] {
    const meta = this.data.meta;
    if (!meta || !meta.toc || meta.toc.length === 0) return [];
    // accordion / author 模式需递归扁平化，strip / list 模式顶层即为叶子
    if (meta.navMode === 'accordion' || meta.navMode === 'author') {
      return this.flattenTocLeaves(meta.toc);
    }
    return meta.toc.filter(n => n.isLeaf);
  },

  onTapPrevChapter(): void {
    const leaves = this.getLeafNodes();
    if (leaves.length === 0) return;
    const idx = leaves.findIndex(n => n.id === this.data.currentNodeId);
    if (idx > 0) {
      this.loadContent(leaves[idx - 1].id);
    }
  },

  onTapNextChapter(): void {
    const leaves = this.getLeafNodes();
    if (leaves.length === 0) return;
    const idx = leaves.findIndex(n => n.id === this.data.currentNodeId);
    if (idx < leaves.length - 1) {
      this.loadContent(leaves[idx + 1].id);
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
          // 多字 glossary 词拆成单字段，每个带独立拼音
          for (const ch of g.word) {
            segments.push({
              text: ch,
              isGlossary: true,
              word: g.word,
              explanation: g.explanation,
              pinyin: para.rareCharPinyin?.[ch],
            });
          }
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
        // 生僻字二次切分：非 glossary 文本段按 rareCharPinyin 拆开
        const plainText = text.slice(start, i);
        const rareSegs = splitByRareChar(plainText, para.rareCharPinyin);
        for (const rs of rareSegs) {
          segments.push({
            text: rs.text,
            isGlossary: false,
            pinyin: rs.pinyin,
          });
        }
      }
    }
    return segments;
  },

  // ==========================================
  // 创作背景

  onTapBackground(): void {
    this.setData({ showBackground: true });
  },

  onCloseBackground(): void {
    this.setData({ showBackground: false });
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
    const { meta, currentContent, fullChapters } = this.data;
    if (!meta) return;

    if (meta.loadMode === 'full' && fullChapters.length > 0) {
      this._playFullText(fullChapters);
    } else if (currentContent) {
      const c = currentContent;
      const text = c.paragraphs ? c.paragraphs.map(p => p.text).join('') : (c.text || '');
      this._tts?.play(text, undefined, {
        onStatusChange: (status) => {
          this.setData({
            audioLoading: status === 'loading',
            audioPlaying: status === 'playing',
          });
        },
        onEnded: () => {
          this._onAudioEnded(currentContent, text);
        },
      });
    }
  },

  _playFullText(chapters: IClassicChapter[]): void {
    if (!this._tts) return;
    const text = chapters
      .map(ch => ch.paragraphs.map(p => p.text).join(''))
      .join('');
    // full 模式下播放全文，完成后按整本经典统计
    const classicId = this._classicId;
    this._tts.play(text, undefined, {
      onStatusChange: (status) => {
        this.setData({
          audioLoading: status === 'loading',
          audioPlaying: status === 'playing',
        });
      },
      onEnded: () => {
        // full 模式：按第一个叶子节点或全书标示
        const nodeId = this.data.currentNodeId || 'full';
        this._onAudioEndedForNode(nodeId, text);
      },
    });
  },

  _onAudioEnded(contentBlock: IContentBlock, text: string): void {
    const contentId = `${this._classicId}:${contentBlock.id}`;
    this._onAudioEndedForNode(contentBlock.id, text);
  },

  _onAudioEndedForNode(nodeId: string, text: string): void {
    const contentId = `${this._classicId}:${nodeId}`;
    completeAudioListen({
      contentType: 'classic_chapter',
      contentId,
    }).then(res => {
      if (res.xpGained > 0) {
        // 标记该节点已读
        const listened = { ...this.data.listenedNodeIds };
        listened[nodeId] = true;
        this.setData({ listenedNodeIds: listened, xpAnimation: { xp: res.xpGained } });
        // 后台从服务端刷新，确保数据一致
        fetchClassicMeta(this._classicId).then(meta => {
          const m2: Record<string, boolean> = {};
          (meta.listenedNodeIds || []).forEach(id => { m2[id] = true; });
          this.setData({ listenedNodeIds: m2 });
        }).catch(() => {});
        setTimeout(() => {
          if (this.data.xpAnimation) this.setData({ xpAnimation: null });
        }, 2200);
      }
    }).catch(() => {}); // 静默失败
  },

  onDismissXpAnimation(): void {
    this.setData({ xpAnimation: null });
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
	          nodeId: this.data.currentNodeId,
	          nodeTitle: this.data.currentContent?.title,
	          className: this.data.meta?.name,
	        },
		      });
	      wx.showToast({ title: '感谢反馈', icon: 'success' });
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

  /** 从 TOC 中查找叶子节点的 author */
  getTocLeafAuthor(nodeId: string): string {
    const leaf = this.findTocNode(nodeId);
    return leaf?.author || '';
  },

  /** 从 TOC 中查找叶子节点的 era */
  getTocLeafEra(nodeId: string): string {
    const leaf = this.findTocNode(nodeId);
    return leaf?.era || '';
  },

  /** 递归遍历 TOC 查找指定 id 的节点 */
  findTocNode(nodeId: string, nodes?: ITocNode[]): ITocNode | null {
    const list = nodes || this.data.tocNodes;
    for (const n of list) {
      if (n.id === nodeId) return n;
      if (n.children && n.children.length > 0) {
        const found = this.findTocNode(nodeId, n.children);
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
