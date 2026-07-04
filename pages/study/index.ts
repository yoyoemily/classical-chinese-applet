import { getCurrentBookId, saveSession } from '../../utils/storage';
import { fetchTodayTask, fetchWordBookDetail, submitAnswer, submitFeedback } from '../../api/index';
import { shuffle } from '../../utils/util';
import { getTTSPlayer } from '../../utils/tts';
import { STORAGE_KEYS, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, PRESTEP_PROMPTS } from '../../constants/config';
import type { IStudySession, IWord, FeedbackCategory } from '../../typings/index.d';

interface IStudyData {
  screen: 'preStep' | 'question' | 'correction';
  currentWord: string;
  currentWordType: string;
  currentSentence: { id: string; text: string; source: string; translation: string; fullText?: string; articleId?: string; audioUrl?: string } | null;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  sentencePrefix: string;
  sentenceTarget: string;
  sentenceSuffix: string;
  // 纠错页也用到的字段
  sentenceText: string;
  sentenceSource: string;
  sentenceTranslation: string;
  userAnswer: string;
  correctAnswer: string;
  mnemonic: string;
  totalWords: number;
  completedWords: number;
  modeLabel: string;
  correctCount: number;
  wrongCount: number;
  showCorrect: boolean;
  showWrong: boolean;
  loading: boolean;
  dotsArray: number[];
  audioPlaying: boolean;
  audioLoading: boolean;

  // 错误反馈
  showFeedbackPanel: boolean;
  feedbackCategory: string;
  feedbackDescription: string;
  feedbackSubmitting: boolean;

  // 前置步骤
  preStepPrompt: string;
  charOptions: string[];
  preStepCorrectChar: string;
  preStepSelectedChar: string;
  showPreStepCorrect: boolean;
  showPreStepWrong: boolean;
}

const FEEDBACK_CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'sentence_text', label: '原文有误' },
  { key: 'translation', label: '译文有误' },
  { key: 'definition', label: '释义有误' },
  { key: 'source', label: '出处有误' },
  { key: 'other', label: '其他' },
];

Page<IStudyData, WechatMiniprogram.Page.CustomOption>({
  data: {
    screen: 'question', currentWord: '', currentWordType: '', currentSentence: null,
    options: [], selectedIndex: -1, correctIndex: -1,
    sentencePrefix: '', sentenceTarget: '', sentenceSuffix: '',
    sentenceText: '', sentenceSource: '', sentenceTranslation: '',
    userAnswer: '', correctAnswer: '', mnemonic: '',
    totalWords: 0, completedWords: 0, modeLabel: '复习',
    correctCount: 0, wrongCount: 0, showCorrect: false, showWrong: false,
    loading: true, dotsArray: [],
    audioPlaying: false, audioLoading: false,
    showFeedbackPanel: false, feedbackCategory: '', feedbackDescription: '', feedbackSubmitting: false,
    preStepPrompt: '', charOptions: [], preStepCorrectChar: '',
    preStepSelectedChar: '', showPreStepCorrect: false, showPreStepWrong: false,
  },

  _session: null as IStudySession | null,
  _wordsMap: {} as Record<string, IWord>,
  _answering: false,
  _needResume: false,
  _bookId: '',
  _tts: null as ReturnType<typeof getTTSPlayer> | null,
  _autoPlayAudio: true,

  // 前置步骤相关
  _hasPreStep: false,
  _preStepDoneForCurrentWord: false,

  onLoad(): void {
    this.init();
  },

  onShow(): void {
    if (this._needResume) {
      this._needResume = false;
      const s = this._session;
      if (!s) return;
      if (s.currentWordIndex >= s.words.length) {
        this.finishStudy();
      } else {
        this.showNextQuestion();
      }
    }
  },

  async init(): Promise<void> {
    try {
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const settings = raw ? JSON.parse(raw) as { autoPlayAudio?: boolean; dailyNewWords?: number; dailyReviewWords?: number } : {};
      this._autoPlayAudio = settings.autoPlayAudio ?? true;
      const dailyNew = settings.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS;
      const dailyReview = settings.dailyReviewWords ?? DEFAULT_DAILY_REVIEW_WORDS;

      this._tts = getTTSPlayer();
      this._tts.stop();

      const bookId = getCurrentBookId();
      this._bookId = bookId;

      const [task, book] = await Promise.all([
        fetchTodayTask(bookId, dailyNew, dailyReview),
        fetchWordBookDetail(bookId),
      ]).catch(() => [null, null] as const);

      if (!task || task.totalWords === 0) {
        wx.showToast({ title: '今日没有需要学习的字', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
      if (book) {
        wx.setNavigationBarTitle({ title: book.name });
        // 缓存词书的学习模式
        this._hasPreStep = book.studyMode === 'identify_first';
        for (const w of book.words) {
          this._wordsMap[w.id] = w;
        }
      }
      const allWords = [...task.reviewWords, ...task.newWords];
      const session: IStudySession = {
        words: allWords, currentWordIndex: 0, currentSentenceIndex: 0,
        mode: task.reviewWords.length > 0 ? 'review' : 'new',
        completedCount: 0, correctCount: 0, wrongCount: 0, startTime: Date.now(),
      };
      this._session = session;
      saveSession(session);
      const dots = Math.min(allWords.length, 10);
      this.setData({
        totalWords: allWords.length, dotsArray: Array.from({ length: dots }, (_, i) => i),
        modeLabel: session.mode === 'review' ? '复习' : '新学', loading: false,
      });
      this.showNextQuestion();
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  // ==========================================
  // 路由：根据词书学习模式决定是否先走前置步骤
  // ==========================================

  showNextQuestion(): void {
    const s = this._session;
    if (!s) return;
    if (s.currentWordIndex >= s.words.length) { this.finishStudy(); return; }

    if (this._hasPreStep && !this._preStepDoneForCurrentWord) {
      this.showPreStep();
    } else {
      this.showMeaningQuestion();
    }
  },

  // ==========================================
  // 前置步骤：从句子中识别目标字
  // ==========================================

  showPreStep(): void {
    const s = this._session;
    if (!s) return;
    const word = s.words[s.currentWordIndex];
    const sent = word.sentences[s.currentSentenceIndex];
    const book = this._wordsMap[word.wordId];
    // 从词书中取 category，生成对应提示文案
    // studyMode 是词书级别属性，但当前 _hasPreStep 已为 true
    // identifyPrompt 优先，否则按 category 兜底

    // 从句子中提取字符选项（去重、排除标点）
    const punctuation = /[，。！？、；：""''《》（）\s，．？！：；…—　]/g;
    const cleaned = sent.text.replace(punctuation, '');
    const chars = [...new Set(cleaned.split(''))].filter(c => c.trim().length > 0);

    // 确保 targetWord 在选项中（处理多字目标的情况）
    const options = chars.slice(0, 12); // 最多 12 个选项

    this.setData({
      screen: 'preStep',
      preStepPrompt: this._getPreStepPrompt(),
      charOptions: options,
      preStepCorrectChar: word.character,
      preStepSelectedChar: '',
      showPreStepCorrect: false,
      showPreStepWrong: false,
    });
  },

  _getPreStepPrompt(): string {
    // 优先使用当前词书 entry 的 identifyPrompt
    const s = this._session;
    if (s) {
      const word = s.words[s.currentWordIndex];
      const book = this._wordsMap[word.wordId];
      if (book && (book as unknown as Record<string, unknown>).identifyPrompt) {
        return (book as unknown as Record<string, unknown>).identifyPrompt as string;
      }
    }
    // 兜底：按当前词的 wordType 生成
    const s2 = this._session;
    if (s2) {
      const word = s2.words[s2.currentWordIndex];
      const book = this._wordsMap[word.wordId];
      if (book) {
        const cat = (book as unknown as Record<string, string>).category;
        if (cat && PRESTEP_PROMPTS[cat]) return PRESTEP_PROMPTS[cat];
      }
    }
    return '请从句子中找出目标字';
  },

  onSelectPreChar(e: WechatMiniprogram.BaseEvent): void {
    if (this.data.showPreStepCorrect || this.data.showPreStepWrong) return;
    const char = e.currentTarget.dataset.char as string;
    const isCorrect = char === this.data.preStepCorrectChar;

    if (isCorrect) {
      this.setData({
        preStepSelectedChar: char,
        showPreStepCorrect: true,
      });
      setTimeout(() => {
        this._preStepDoneForCurrentWord = true;
        this.showMeaningQuestion();
      }, 600);
    } else {
      this.setData({
        preStepSelectedChar: char,
        showPreStepWrong: true,
      });
      setTimeout(() => {
        this.setData({ showPreStepWrong: false, preStepSelectedChar: '' });
      }, 400);
    }
  },

  // ==========================================
  // 释义答题（现有流程）
  // ==========================================

  showMeaningQuestion(): void {
    const s = this._session;
    if (!s) return;
    if (s.currentWordIndex >= s.words.length) { this.finishStudy(); return; }
    const word = s.words[s.currentWordIndex];
    if (s.currentSentenceIndex >= word.sentences.length) {
      this.goToWordSummary(word.wordId);
      return;
    }
    const sent = word.sentences[s.currentSentenceIndex];
    const fullWord = this._wordsMap[word.wordId];
    let correctAnswer = '';
    if (fullWord?.meanings && sent.correctMeaningIndex < fullWord.meanings.length) {
      correctAnswer = fullWord.meanings[sent.correctMeaningIndex].definition;
    }
    const opts = shuffle([correctAnswer, ...sent.distractors]);
    const ci = opts.indexOf(correctAnswer);
    const idx = sent.text.indexOf(word.character);
    const prefix = idx >= 0 ? sent.text.slice(0, idx) : sent.text;
    const target = idx >= 0 ? sent.text.slice(idx, idx + word.character.length) : '';
    const suffix = idx >= 0 ? sent.text.slice(idx + word.character.length) : '';
    this.setData({
      screen: 'question', currentWord: word.character,
      currentWordType: fullWord?.wordType || '',
      currentSentence: { id: sent.id, text: sent.text, source: sent.source, translation: sent.translation, fullText: (sent as Record<string, unknown>).fullText as string, articleId: (sent as Record<string, unknown>).articleId as string | undefined, audioUrl: (sent as Record<string, unknown>).audioUrl as string | undefined },
      options: opts, selectedIndex: -1, correctIndex: ci,
      sentencePrefix: prefix, sentenceTarget: target, sentenceSuffix: suffix,
      showCorrect: false, showWrong: false,
    });

    if (this._autoPlayAudio) {
      this._playSentenceAudio(sent.text, (sent as Record<string, unknown>).audioUrl as string | undefined);
    }
  },

  onSelectOption(e: WechatMiniprogram.BaseEvent): void {
    if (this._answering) return;
    this._answering = true;
    const idx = Number(e.currentTarget.dataset.index);
    const isCorrect = idx === this.data.correctIndex;
    this.setData({ selectedIndex: idx });
    this.recordAnswer(isCorrect, idx);
    if (isCorrect) {
      this.setData({ showCorrect: true });
      setTimeout(() => { this.advance(); this._answering = false; }, 600);
    } else {
      this.setData({ showWrong: true });
      setTimeout(() => { this.showCorrection(idx); this._answering = false; }, 500);
    }
  },

  onTapDontKnow(): void {
    if (this._answering) return;
    this._answering = true;
    this.recordAnswer(false, -1);
    this.setData({ selectedIndex: -1, showWrong: true });
    setTimeout(() => { this.showCorrection(-1); this._answering = false; }, 500);
  },

  showCorrection(selectedIndex: number): void {
    const { options, correctIndex, currentSentence } = this.data;
    const correctAnswer = options[correctIndex];
    const userAnswer = selectedIndex >= 0 ? options[selectedIndex] : '不知道';
    const s = this._session;
    const mnemonic = s ? this._wordsMap[s.words[s.currentWordIndex].wordId]?.mnemonic || '' : '';
    this.setData({
      screen: 'correction', userAnswer, correctAnswer,
      sentenceText: currentSentence?.text || '',
      sentenceSource: currentSentence?.source || '',
      sentenceTranslation: currentSentence?.translation || '',
      mnemonic, showWrong: false, showCorrect: false,
    });
  },

  onCorrectionContinue(): void {
    const s = this._session;
    if (!s) return;
    const word = s.words[s.currentWordIndex];
    s.currentSentenceIndex++;
    if (s.currentSentenceIndex >= word.sentences.length) {
      this.goToWordSummary(word.wordId);
    } else {
      this.showNextQuestion();
    }
  },

  advance(): void {
    const s = this._session;
    if (!s) return;
    const word = s.words[s.currentWordIndex];
    s.currentSentenceIndex++;
    if (s.currentSentenceIndex >= word.sentences.length) {
      this.goToWordSummary(word.wordId);
    } else {
      this.showNextQuestion();
    }
  },

  goToWordSummary(wordId: string): void {
    const s = this._session!;
    s.currentWordIndex++;
    s.currentSentenceIndex = 0;
    s.completedCount = s.currentWordIndex;
    const remaining = s.words.slice(s.currentWordIndex);
    s.mode = remaining.length > 0 && remaining.every(w => !w.isReview) ? 'new' : s.mode;
    // 重置前置步骤状态，下一词重新判断
    this._preStepDoneForCurrentWord = false;
    saveSession(s);
    this.setData({
      completedWords: s.currentWordIndex,
      modeLabel: s.mode === 'review' ? '复习' : '新学',
    });
    wx.navigateTo({ url: `/pages/word-summary/index?wordId=${wordId}` });
    this._needResume = true;
  },

  finishStudy(): void {
    const s = this._session!;
    wx.redirectTo({
      url: `/pages/study-complete/index?correctCount=${s.correctCount}&wrongCount=${s.wrongCount}`,
    });
  },

  async recordAnswer(isCorrect: boolean, selectedIndex: number): Promise<void> {
    const s = this._session!;
    const word = s.words[s.currentWordIndex];
    const sent = word.sentences[s.currentSentenceIndex];
    try {
      await submitAnswer({ wordBookId: this._bookId, wordId: word.wordId, sentenceId: sent.id, selectedOption: selectedIndex, correct: isCorrect });
    } catch { /* ignore */ }
    if (isCorrect) {
      s.correctCount++;
      this.setData({ correctCount: s.correctCount });
    } else {
      s.wrongCount++;
      this.setData({ wrongCount: s.wrongCount });
    }
  },

  onTapFullText(): void {
    const { currentSentence } = this.data;
    if (!currentSentence) return;
    if (currentSentence.articleId) {
      wx.navigateTo({ url: `/pages/article-reader/index?id=${currentSentence.articleId}` });
    } else {
      wx.navigateTo({ url: `/pages/full-text/index?sentenceId=${currentSentence.id}` });
    }
  },

  onTapAudio(): void {
    const { currentSentence } = this.data;
    if (!currentSentence) return;

    if (this._tts?.status === 'loading' || this._tts?.status === 'playing') {
      this._tts.stop();
      return;
    }
    this._playSentenceAudio(currentSentence.text, currentSentence.audioUrl);
  },

  _playSentenceAudio(text: string, audioUrl?: string): void {
    if (!this._tts) return;
    this._tts.play(text, audioUrl, {
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

    const s = this._session;
    const word = s ? s.words[s.currentWordIndex] : null;
    try {
      await submitFeedback({
        category: this.data.feedbackCategory as FeedbackCategory,
        source: 'learning',
        description: this.data.feedbackDescription,
        context: {
          sentenceId: this.data.currentSentence?.id,
          wordId: word?.wordId,
          articleId: this.data.currentSentence?.articleId,
        },
      });
      this.setData({ showFeedbackPanel: false, feedbackSubmitting: false });
    } catch {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ feedbackSubmitting: false });
    }
  },

  onShareAppMessage(): WechatMiniprogram.Page.CustomShareContent {
    return { title: '古文打卡 — 每日10分钟，吃透文言文', path: '/pages/index/index' };
  },

  onHide(): void {
    this._tts?.stop();
  },

  onUnload(): void {
    this._tts?.destroy();
    this._tts = null;
  },
});
