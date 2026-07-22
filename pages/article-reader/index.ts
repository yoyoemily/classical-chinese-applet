import type { IArticle, IArticleSentence, IGlossaryItem, FeedbackCategory } from '../../typings/index.d';
import { fetchArticleDetail, submitFeedback, completeAudioListen } from '../../api/index';
import { getTTSPlayer } from '../../utils/tts';
import { splitByRareChar } from '../../utils/util';
import { calcAudioXP } from '../../constants/config';
import type { WordTypeCode } from '../../utils/wordType';

	/** 阅读模式 */
	type ReadingMode = 'plain' | 'sentence' | 'glossary';

	/** 逐句释义模式用的子句 */
	interface IClause {
	  text: string;
	  translation: string;
	  sentenceIndex: number;
	  clauseIndex: number;
	}

	/** 通篇阅读：生词分段 */
	interface IVocabSegment {
	  text: string;
	  isKeyword: boolean;
	  word?: string;
	  definition?: string;
	  /** 生僻字拼音 */
	  pinyin?: string;
	  /** 生词类型：shi/xu/tongjia/gujinyi/huoyong */
	  wordType?: WordTypeCode;
	}

	/** 典故注释：段切分结构 */
	interface IGlossarySegment {
	  text: string;
	  isGlossary: boolean;
	  word?: string;
	  definition?: string;
	  /** 生僻字拼音 */
	  pinyin?: string;
	}

	interface IArticleReaderData {
	  article: IArticle | null;
	  loading: boolean;
	  readingMode: ReadingMode;
	  /** 段落释义用：按 sentence 的展开状态 */
	  expandedStates: boolean[];
	  /** 逐句释义用：按 clause 的展开状态 */
	  clauseExpandedStates: boolean[];
	  /** 通篇阅读用：生词分段（二维数组：sentenceIndex → segmentIndex） */
	  vocabSegments: IVocabSegment[][];
	  /** 典故注释用：glossary 段切分 */
	  glossarySegments: IGlossarySegment[][];
	  /** 逐句释义用：拆分后的子句 */
	  clauses: IClause[];
	  /** 内联生词解释弹窗 */
	  vocabPopup: { sentenceIndex: number; word: string; definition: string } | null;
	  /** 典故注释弹窗 */
	  glossaryPopup: { sentenceIndex: number; word: string; definition: string } | null;
	  /** 创作背景浮层 */
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
	}

	Page<IArticleReaderData, WechatMiniprogram.Page.CustomOption>({
	  data: {
	    article: null,
	    loading: true,
	    readingMode: 'plain',
	    expandedStates: [],
	    clauseExpandedStates: [],
	    vocabSegments: [],
	    glossarySegments: [],
	    clauses: [],
	    vocabPopup: null,
	    glossaryPopup: null,
	    showBackground: false,
	    audioLoading: false,
	    audioPlaying: false,
	    showFeedbackPanel: false,
	    feedbackCategory: 'sentence_text',
	    feedbackDescription: '',
	    feedbackSubmitting: false,
	    xpAnimation: null,
	  },

	  _tts: null as ReturnType<typeof getTTSPlayer> | null,
	  _articleId: '',

	  // ==========================================
	  // 生命周期
	  // ==========================================

	  onLoad(options: Record<string, string | undefined>): void {
	    const id = options.id || '';
	    this._articleId = id;
	    const mode = (options.mode as ReadingMode) || 'plain';

	    this.setData({ readingMode: mode });
	    this._tts = getTTSPlayer();
	    this._tts.stop();
	    this.loadArticle();
	  },

	  onHide(): void {
	    if (this._tts) this._tts.stop();
	  },

	  onUnload(): void {
	    if (this._tts) this._tts.destroy();
	  },

	  // ==========================================
	  // 数据加载
	  // ==========================================

	  async loadArticle(): Promise<void> {
	    this.setData({ loading: true });
	    try {
	      const article = await fetchArticleDetail(this._articleId);
	      const clauses = this.buildClauses(article);
	      const vocabSegments = this.buildVocabSegments(article);
	      const glossarySegments = this.buildGlossarySegments(article);

	      this.setData({
	        article,
	        clauses,
	        vocabSegments,
	        glossarySegments,
	        expandedStates: article.sentences.map(() => false),
	        clauseExpandedStates: clauses.map(() => false),
	        loading: false,
	      });

	    } catch {
	      this.setData({ loading: false });
	    }
	  },

	  // ==========================================
	  // 阅读模式切换
	  // ==========================================

	  onSwitchMode(e: WechatMiniprogram.BaseEvent): void {
	    const mode = (e.currentTarget.dataset as { mode: ReadingMode }).mode;
	    if (mode && mode !== this.data.readingMode) {
	      this.setData({ readingMode: mode });
	    }
	  },

	  // ==========================================
	  // 逐句释义：按标点拆分为子句
	  // ==========================================

	  buildClauses(article: IArticle): IClause[] {
	    const clauses: IClause[] = [];
	    article.sentences.forEach((s, si) => {
	      const textParts = s.text.split(/([。！？；])/);
	      const transParts = s.translation.split(/([。！？；])/);
	      let ci = 0;
	      for (let j = 0; j < textParts.length; j++) {
	        const t = textParts[j].trim();
	        if (!t || t === '。' || t === '！' || t === '？' || t === '；') continue;
	        const tr = transParts[j]?.trim() || '';
	        clauses.push({ text: t, translation: tr, sentenceIndex: si, clauseIndex: ci });
	        ci++;
	      }
	    });
	    return clauses;
	  },

	  // ==========================================
	  // 典故注释段切分
	  // ==========================================

	  /**
	   * 对每句的文本按 glossary 词条做最长匹配切分，生成 segment 数组。
	   * 匹配的 glossary 词标记 isGlossary=true，其余为普通文本。
	   */
	  buildGlossarySegments(article: IArticle): IGlossarySegment[][] {
	    return article.sentences.map(s => {
	      const segments: IGlossarySegment[] = [];
	      const glossary = s.glossary || [];
	      // 按 word 长度降序排列，保证最长匹配优先
	      const sorted = [...glossary].sort((a, b) => b.word.length - a.word.length);
	      let i = 0;
	      const text = s.text;
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
	                definition: g.definition,
	                pinyin: s.rareCharPinyin?.[ch],
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
	          // 生僻字二次切分
	          const plainText = text.slice(start, i);
	          const rareSegs = splitByRareChar(plainText, s.rareCharPinyin);
	          for (const rs of rareSegs) {
	            segments.push({
	              text: rs.text,
	              isGlossary: false,
	              pinyin: rs.pinyin,
	            });
	          }
	        }
	      }
	      // 合并属于同一 word 的连续 keyword 字符，
	      // 使多字词（如"明年"）渲染为一条完整下划线，
	      // 而不同 word 的相邻字符保持独立、视觉上自然区分。
	      const merged: IGlossarySegment[] = [];
	      for (let idx = 0; idx < segments.length; idx++) {
	        const cur = segments[idx];
	        if (cur.isGlossary && merged.length > 0) {
	          const prev = merged[merged.length - 1];
	          if (prev.isGlossary && prev.word === cur.word) {
	            prev.text += cur.text;
	            continue;
	          }
	        }
	        merged.push({ ...cur });
	      }
	      return merged;
	    });
	  },

	  // ==========================================
	  // 典故注释 — 点击词条弹出释义
	  // ==========================================

	  onTapGlossary(e: WechatMiniprogram.BaseEvent): void {
	    const { sentenceIndex, word, definition } = e.currentTarget.dataset as { sentenceIndex: number; word: string; definition: string };
	    const current = this.data.glossaryPopup;
	    if (current && current.sentenceIndex === sentenceIndex && current.word === word) {
	      this.setData({ glossaryPopup: null });
	    } else {
	      this.setData({
	        glossaryPopup: { sentenceIndex, word, definition },
	      });
	    }
	  },

	  /** 关闭典故注释弹窗 */
	  onDismissGlossary(): void {
	    this.setData({ glossaryPopup: null });
	  },

	  // ==========================================
	  // 内联生词链接 — 将句子按 keyWords 切分为普通文本/生词片段
	  // ==========================================

	  /**
	   * 对一条句子的文本按 keyWords 做最长匹配切分，生成 segment 数组。
	   * 每个 segment 要么是普通文本，要么是匹配到的生词（带释义）。
	   * 消歧 keyWord 有 matchWord 字段时用 matchWord 定位句中出现位置，
	   * 但仅 word 中的字符标记为生词（高亮可点击），上下文字符渲染为普通文本。
	   */
	  buildVocabSegments(article: IArticle): IVocabSegment[][] {
	    return article.sentences.map(s => {
	      const segments: IVocabSegment[] = [];
	      // 按 matchWord ?? word 长度降序排列，保证最长匹配优先
	      const sortedKeywords = [...s.keyWords].sort(
	        (a, b) => (b.matchWord || b.word).length - (a.matchWord || a.word).length
	      );
	      let i = 0;
	      const text = s.text;
	      while (i < text.length) {
	        let matched = false;
	        for (const kw of sortedKeywords) {
	          const matchKey = kw.matchWord || kw.word;
	          if (text.startsWith(matchKey, i)) {
	            // matchKey 中 word 的起始偏移
	            const wordStart = matchKey.indexOf(kw.word);
	            // 逐字符处理 matchKey
	            for (let k = 0; k < matchKey.length; k++) {
	              const ch = matchKey[k];
	              const isKeywordChar = wordStart !== -1
	                && k >= wordStart
	                && k < wordStart + kw.word.length;
	              segments.push({
	                text: ch,
	                isKeyword: isKeywordChar,
	                word: isKeywordChar ? kw.word : undefined,
	                definition: isKeywordChar ? kw.definition : undefined,
	                wordType: isKeywordChar ? (kw.wordType as WordTypeCode | undefined) : undefined,
	                pinyin: s.rareCharPinyin?.[ch],
	              });
	            }
	            i += matchKey.length;
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
	              if (text.startsWith(kw.matchWord || kw.word, i)) { hit = true; break; }
	            }
	            if (hit) break;
	            i++;
	          }
	          // 生僻字二次切分
	          const plainText = text.slice(start, i);
	          const rareSegs = splitByRareChar(plainText, s.rareCharPinyin);
	          for (const rs of rareSegs) {
	            segments.push({
	              text: rs.text,
	              isKeyword: false,
	              pinyin: rs.pinyin,
	            });
	          }
	        }
	      }
	      // 合并属于同一 word 的连续 keyword 字符，
	      // 使多字词（如"明年"）渲染为一条完整下划线，
	      // 而不同 word 的相邻字符保持独立、视觉上自然区分。
	      const merged: IVocabSegment[] = [];
	      for (let idx = 0; idx < segments.length; idx++) {
	        const cur = segments[idx];
	        if (cur.isKeyword && merged.length > 0) {
	          const prev = merged[merged.length - 1];
	          if (prev.isKeyword && prev.word === cur.word) {
	            prev.text += cur.text;
	            continue;
	          }
	        }
	        merged.push({ ...cur });
	      }
	      return merged;
	    });
	  },

	  // ==========================================
	  // 内联生词 — 点击弹出释义
	  // ==========================================

	  onTapVocabWord(e: WechatMiniprogram.BaseEvent): void {
	    const { sentenceIndex, word, definition } =
	      e.currentTarget.dataset as { sentenceIndex: number; word: string; definition: string };
	    const current = this.data.vocabPopup;
	    if (current && current.sentenceIndex === sentenceIndex && current.word === word) {
	      this.setData({ vocabPopup: null });
	    } else {
	      this.setData({ vocabPopup: { sentenceIndex, word, definition } });
	    }
	  },

	  /** 关闭内联生词弹窗 */
	  onDismissVocabPopup(): void {
	    this.setData({ vocabPopup: null });
	  },

	  // ==========================================
	  // 通篇阅读 — 点击段落展开/收起译文
	  // ==========================================

	  onTapSentence(e: WechatMiniprogram.BaseEvent): void {
	    const { index } = e.currentTarget.dataset as { index: number };
	    const states = [...this.data.expandedStates];
	    states[index] = !states[index];
	    this.setData({ expandedStates: states });
	  },

	  // ==========================================
	  // 逐句释义 — 点击展开/收起
	  // ==========================================

	  onTapClause(e: WechatMiniprogram.BaseEvent): void {
	    const { clauseIndex } = e.currentTarget.dataset as { clauseIndex: number };
	    const states = [...this.data.clauseExpandedStates];
	    states[clauseIndex] = !states[clauseIndex];
	    this.setData({ clauseExpandedStates: states });
	  },

	  // ==========================================
	  // 创作背景
	  // ==========================================

	  onTapBackground(): void {
	    this.setData({ showBackground: true });
	  },

	  onCloseBackground(): void {
	    this.setData({ showBackground: false });
	  },

	  // ==========================================
	  // 语音播报
	  // ==========================================

	  onTapAudio(): void {
	    if (!this._tts || !this.data.article) return;
	    if (this.data.audioPlaying) {
	      this._tts.stop();
	      return;
	    }
	    this._playArticleAudio(this.data.article);
	  },

	  _playArticleAudio(article: IArticle): void {
	    const text = article.sentences.map(s => s.text).join('');
	    this._tts!.play(text, article.fullTextAudioUrl, {
	      onStatusChange: (status) => {
	        this.setData({
	          audioLoading: status === 'loading',
	          audioPlaying: status === 'playing',
	        });
	      },
	      onEnded: () => {
	        this._onAudioEnded(article);
	      },
	    });
	  },

	  _onAudioEnded(article: IArticle): void {
	    completeAudioListen({
	      contentType: 'article',
	      contentId: article.id,
	    }).then(res => {
	      if (res.xpGained > 0) {
	        this.setData({ xpAnimation: { xp: res.xpGained } });
	        setTimeout(() => {
	          if (this.data.xpAnimation) this.setData({ xpAnimation: null });
	        }, 2200);
	      }
	    }).catch(() => {}); // 静默失败，不影响阅读体验
	  },

	  onDismissXpAnimation(): void {
	    this.setData({ xpAnimation: null });
	  },

	  // ==========================================
	  // 错误反馈
	  // ==========================================

	  onTapFeedback(): void {
	    this.setData({ showFeedbackPanel: true });
	  },

	  onCloseFeedback(): void {
	    this.setData({ showFeedbackPanel: false });
	  },

	  onSelectFeedbackCategory(e: WechatMiniprogram.BaseEvent): void {
	    const { category } = e.currentTarget.dataset as { category: string };
	    this.setData({ feedbackCategory: category });
	  },

	  onFeedbackDescriptionInput(e: WechatMiniprogram.BaseEvent): void {
	    this.setData({ feedbackDescription: (e.detail as { value: string }).value });
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
	          articleId: this._articleId,
	          readingMode: this.data.readingMode,
	          articleTitle: this.data.article?.title,
	        },
	      });
	      wx.showToast({ title: '感谢反馈', icon: 'success' });
	      this.setData({ showFeedbackPanel: false, feedbackDescription: '' });
	    } catch {
	      wx.showToast({ title: '提交失败', icon: 'none' });
	    } finally {
	      this.setData({ feedbackSubmitting: false });
	    }
	  },
	});
