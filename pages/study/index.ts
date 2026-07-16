import { getCurrentBookId, saveSession, getMistakes, addMistake, removeMistake, getMistakeRemoveThreshold, initStudySummary, incrementStudySummary, getStudySummary } from '../../utils/storage';
import { fetchTodayTask, fetchWordBookDetail, submitAnswer, submitFeedback, completeStudy, completeWord } from '../../api/index';
import { shuffle } from '../../utils/util';
import { getTTSPlayer } from '../../utils/tts';
import { playCorrectSound, playWrongSound, playCompleteSound, destroyAudioContext } from '../../utils/audio-feedback';
import { STORAGE_KEYS, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, PRESTEP_PROMPTS } from '../../constants/config';
import type { IStudySession, IWordEntry, IQuizItem, FeedbackCategory } from '../../typings/index.d';
import { wordTypeLabel } from '../../utils/wordType';

interface IStudyData {
  screen: 'preStep' | 'question';
  showResult: boolean;
  currentWord: string;
  currentWordType: string;
  currentSentence: { id: string; text: string; source: string; translation: string; articleId?: string; audioUrl?: string } | null;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  sentencePrefix: string;
  sentenceTarget: string;
  sentenceSuffix: string;
  // 揭晓结果时用到的字段
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
  sentenceChars: Array<{ char: string; index: number; isPunct: boolean; selected: boolean; correct: boolean }>;
  preStepSelectedIndices: number[];
  preStepMaxSelect: number;
  preStepCorrectChar: string;
  preStepCorrectIndices: number[];
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
    screen: 'question', showResult: false, currentWord: '', currentWordType: '', currentSentence: null,
    options: [], selectedIndex: -1, correctIndex: -1,
    sentencePrefix: '', sentenceTarget: '', sentenceSuffix: '',
    sentenceText: '', sentenceSource: '', sentenceTranslation: '',
    userAnswer: '', correctAnswer: '', mnemonic: '',
    totalWords: 0, completedWords: 0, modeLabel: '复习',
    correctCount: 0, wrongCount: 0, showCorrect: false, showWrong: false,
    loading: true, dotsArray: [],
    audioPlaying: false, audioLoading: false,
    showFeedbackPanel: false, feedbackCategory: '', feedbackDescription: '', feedbackSubmitting: false,
    preStepPrompt: '', sentenceChars: [], preStepSelectedIndices: [],
    preStepMaxSelect: 1, preStepCorrectChar: '', preStepCorrectIndices: [],
    showPreStepCorrect: false, showPreStepWrong: false,
  },

  _session: null as IStudySession | null,
  _wordsMap: {} as Record<string, IWordEntry>,
  _answering: false,
  _needResume: false,
  _bookId: '',
  _tts: null as ReturnType<typeof getTTSPlayer> | null,
  _autoPlayAudio: true,
  _answerSound: true,

  // 前置步骤相关
  _hasPreStep: false,
  _preStepDoneForCurrentWord: false,
  _bookIdentifyPrompt: '',

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
      const settings = raw ? JSON.parse(raw) as { autoPlayAudio?: boolean; dailyNewWords?: number; dailyReviewWords?: number; answerSound?: boolean; studyOrder?: number } : {};
      this._autoPlayAudio = settings.autoPlayAudio ?? true;
      this._answerSound = settings.answerSound ?? true;
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
        // 缓存词书的学习模式和前置提示文案
        this._hasPreStep = book.studyMode === 'identify_first';
        this._bookIdentifyPrompt = (book as unknown as Record<string, unknown>).identifyPrompt as string || '';
        for (const e of book.wordEntries) {
          this._wordsMap[e.id] = e;
        }
      }
      // 根据设置决定是否乱序（复习和新学各自独立 shuffle，复习仍优先）
      if (settings.studyOrder === 1) {
        task.reviewWords = shuffle(task.reviewWords);
        task.newWords = shuffle(task.newWords);
      }

      const allWords = [...task.reviewWords, ...task.newWords];
      const session: IStudySession = {
        words: allWords, currentWordIndex: 0, currentSentenceIndex: 0,
        mode: task.reviewWords.length > 0 ? 'review' : 'new',
        completedCount: 0, correctCount: 0, wrongCount: 0, xpGained: 0, startTime: Date.now(),
      };
      this._session = session;
      saveSession(session);
      initStudySummary();
      const dots = Math.min(allWords.length, 10);
      this.setData({
        totalWords: allWords.length, dotsArray: Array.from({ length: dots }, (_, i) => i),
        modeLabel: session.mode === 'review' ? '复习' : '新学', loading: false,
      });
      this.showNextQuestion();
    } catch (e) {
      console.error('init error:', e);
      wx.showToast({ title: '加载失败: ' + (e as Error).message, icon: 'none' });
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
    const sent = word.quizItems[s.currentSentenceIndex];

    const targetWord = (sent as Record<string, unknown>).targetWord as string || word.character;
    const maxSelect = targetWord.length;

    // 把句子拆成逐字数组，标点/空格不参与选择
    const chars: Array<{ char: string; index: number; isPunct: boolean; selected: boolean; correct: boolean }> = [];
    for (let i = 0; i < sent.sentenceText.length; i++) {
      const ch = sent.sentenceText[i];
      const isPunct = ch === '、' || ch === '。' || ch === '，' || ch === '！' || ch === '？'
        || ch === '；' || ch === '：' || ch === '“' || ch === '”' || ch === '‘' || ch === '’'
        || ch === '《' || ch === '》' || ch === '（' || ch === '）' || ch === '「' || ch === '」'
        || ch === '『' || ch === '』' || ch === '【' || ch === '】'
        || ch === '\r' || ch === '\n' || ch === '\t' || ch === ' '
        || ch === '…' || ch === '—' || ch === '　' || ch === '．';
      chars.push({ char: ch, index: i, isPunct, selected: false, correct: false });
    }

    // 计算正确答案在句子中的起始位置
    const correctStartIdx = sent.sentenceText.indexOf(targetWord);
    const correctIndices: number[] = [];
    if (correctStartIdx >= 0) {
      for (let i = correctStartIdx; i < correctStartIdx + maxSelect; i++) {
        correctIndices.push(i);
      }
    }

    this.setData({
      screen: 'preStep',
      currentSentence: { id: sent.id, text: sent.sentenceText || '', source: sent.sentenceSource || '', translation: sent.sentenceTranslation || '', articleId: sent.articleId, audioUrl: sent.audioUrl },
      preStepPrompt: this._getPreStepPrompt(),
      sentenceChars: chars,
      preStepSelectedIndices: [],
      preStepMaxSelect: maxSelect,
      preStepCorrectChar: targetWord,
      preStepCorrectIndices: correctIndices,
      showPreStepCorrect: false,
      showPreStepWrong: false,
    });
  },

  _getPreStepPrompt(): string {
    // 优先使用当前词书 entry 的 identifyPrompt（从 API 返回的词书信息缓存）
    if (this._bookIdentifyPrompt) return this._bookIdentifyPrompt;
    // 兜底：按当前词的 wordType 生成
    const s = this._session;
    if (s) {
      const word = s.words[s.currentWordIndex];
      const w = this._wordsMap[word.entryId];
      if (w) {
        const cat = (w as unknown as Record<string, string>).category;
        if (cat && PRESTEP_PROMPTS[cat]) return PRESTEP_PROMPTS[cat];
      }
    }
    return '请从句子中找出目标字词';
  },

  onTapSentenceChar(e: WechatMiniprogram.BaseEvent): void {
    if (this.data.showPreStepCorrect || this.data.showPreStepWrong) return;

    const index = e.currentTarget.dataset.index as number;
    const isPunct = e.currentTarget.dataset.ispunct as boolean;
    if (isPunct) return;

    const maxSelect = this.data.preStepMaxSelect;
    const selected = [...this.data.preStepSelectedIndices];

    // 点同一个字 → 取消选中
    if (selected.includes(index)) {
      this._applyCharFlags([], [], false, false);
      return;
    }

    // 单选模式 → 直接选中并提交
    if (maxSelect === 1) {
      this._submitPreStepForIndex(index);
      return;
    }

    // 双选模式：第一个字 or 不相邻 → 重置选新字
    if (selected.length === 0 || Math.abs(index - selected[0]) !== 1) {
      this._applyCharFlags([index], [], false, false);
      return;
    }

    // 双选模式：相邻 → 扩展为连续双选
    const pair = [Math.min(selected[0], index), Math.max(selected[0], index)];
    this._applyCharFlags(pair, [], false, false);
  },

  onConfirmPreStep(): void {
    if (this.data.showPreStepCorrect || this.data.showPreStepWrong) return;
    const selected = [...this.data.preStepSelectedIndices];
    if (selected.length === 0) return;
    this._submitPreStepForIndices(selected);
  },

  _applyCharFlags(selectedIndices: number[], correctIndices: number[], showCorrect: boolean, showWrong: boolean): void {
    const chars = this.data.sentenceChars.map((c, i) => ({
      ...c,
      selected: selectedIndices.includes(i),
      correct: showCorrect && correctIndices.includes(i),
    }));
    this.setData({ sentenceChars: chars, preStepSelectedIndices: selectedIndices,
      showPreStepCorrect: showCorrect, showPreStepWrong: showWrong });
  },

  _submitPreStepForIndex(index: number): void {
    const correctChar = this.data.preStepCorrectChar;
    const match = this.data.sentenceChars[index]?.char === correctChar;

    if (match) {
      this._applyCharFlags([index], this.data.preStepCorrectIndices, true, false);
      setTimeout(() => {
        this._preStepDoneForCurrentWord = true;
        this.showMeaningQuestion();
      }, 600);
    } else {
      this._applyCharFlags([index], [], false, true);
      setTimeout(() => {
        this._applyCharFlags([], [], false, false);
      }, 600);
    }
  },

  _submitPreStepForIndices(indices: number[]): void {
    const sorted = [...indices].sort((a, b) => a - b);
    const chars = this.data.sentenceChars;
    const correctChar = this.data.preStepCorrectChar;
    const selectedText = sorted.map(i => chars[i].char || '').join('');

    if (selectedText === correctChar) {
      this._applyCharFlags(sorted, this.data.preStepCorrectIndices, true, false);
      setTimeout(() => {
        this._preStepDoneForCurrentWord = true;
        this.showMeaningQuestion();
      }, 600);
    } else {
      this._applyCharFlags(sorted, [], false, true);
      setTimeout(() => {
        this._applyCharFlags([], [], false, false);
      }, 600);
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
    if (s.currentSentenceIndex >= word.quizItems.length) {
      this.goToWordSummary(word.entryId);
      return;
    }
    const sent: IQuizItem = word.quizItems[s.currentSentenceIndex] as IQuizItem;
    // 正确答案直接从 quizItem.definition 取，不再需要 correctMeaningIndex 桥接
    const correctAnswer = sent.definition;
    const opts = shuffle([correctAnswer, ...sent.distractors]);
    const ci = opts.indexOf(correctAnswer);
    const idx = sent.sentenceText ? sent.sentenceText.indexOf(word.character) : -1;
    const prefix = idx >= 0 ? sent.sentenceText!.slice(0, idx) : (sent.sentenceText || '');
    const target = idx >= 0 ? sent.sentenceText!.slice(idx, idx + word.character.length) : '';
    const suffix = idx >= 0 ? sent.sentenceText!.slice(idx + word.character.length) : '';
    this.setData({
      screen: 'question', showResult: false, currentWord: word.character,
      currentWordType: wordTypeLabel(sent.targetWord ? this._wordsMap[word.entryId]?.wordType || '' : ''),
      currentSentence: { id: sent.id, text: sent.sentenceText || '', source: sent.sentenceSource || '', translation: sent.sentenceTranslation || '', articleId: sent.articleId, audioUrl: sent.audioUrl },
      options: opts, selectedIndex: -1, correctIndex: ci,
      sentencePrefix: prefix, sentenceTarget: target, sentenceSuffix: suffix,
      showCorrect: false, showWrong: false,
    });

    if (this._autoPlayAudio) {
      this._playSentenceAudio(sent.sentenceText || '', sent.audioUrl);
    }
  },

  onSelectOption(e: WechatMiniprogram.BaseEvent): void {
    if (this._answering || this.data.showResult) return;
    this._answering = true;
    const idx = Number(e.currentTarget.dataset.index);
    const isCorrect = idx === this.data.correctIndex;
    this.setData({ selectedIndex: idx });
    this.recordAnswer(isCorrect, idx);
    if (isCorrect) {
      if (this._answerSound) playCorrectSound();
      this.setData({ showCorrect: true });
      setTimeout(() => {
        this.showResult();
        this._answering = false;
      }, 400);
    } else {
      if (this._answerSound) playWrongSound();
      this.setData({ showWrong: true });
      setTimeout(() => {
        this.showResult();
        this._answering = false;
      }, 500);
    }
  },

  onTapDontKnow(): void {
    if (this._answering || this.data.showResult) return;
    this._answering = true;
    this.recordAnswer(false, -1);
    if (this._answerSound) playWrongSound();
    this.setData({ selectedIndex: -1, showWrong: true });
    setTimeout(() => {
      this.showResult();
      this._answering = false;
    }, 500);
  },

  /** 揭晓结果：译文 + 记忆口诀（仅答错时） */
  showResult(): void {
    const { currentSentence } = this.data;
    const s = this._session;
    const mnemonic = s ? this._wordsMap[s.words[s.currentWordIndex].entryId]?.mnemonic || '' : '';

    this.setData({
      showResult: true,
      sentenceTranslation: currentSentence?.translation || '',
      mnemonic,
    });
  },

  onContinue(): void {
    const s = this._session;
    if (!s) return;
    const word = s.words[s.currentWordIndex];
    s.currentSentenceIndex++;
    if (s.currentSentenceIndex >= word.quizItems.length) {
      this.goToWordSummary(word.entryId);
    } else {
      this.showNextQuestion();
    }
  },

  async goToWordSummary(entryId: string): Promise<void> {
    const s = this._session!;
    s.currentWordIndex++;
    s.currentSentenceIndex = 0;
    s.completedCount = s.currentWordIndex;

    // 通知后端字词完成，获取 XP（await 确保 XP 累加到 session 后再推进）
    let xpGained = 0;
    try {
      const res = await completeWord({ wordBookId: this._bookId, entryId });
      xpGained = res?.xpGained || 0;
      if (xpGained) s.xpGained += xpGained;
    } catch { /* ignore */ }

    // 最后一个字：跳过字总结，直接完成
    if (s.currentWordIndex >= s.words.length) {
      this._preStepDoneForCurrentWord = false;
      this.finishStudy();
      return;
    }

    const remaining = s.words.slice(s.currentWordIndex);
    s.mode = remaining.length > 0 && remaining.every(w => !w.isReview) ? 'new' : s.mode;
    // 重置前置步骤状态，下一词重新判断
    this._preStepDoneForCurrentWord = false;
    saveSession(s);
    this.setData({
      completedWords: s.currentWordIndex,
      modeLabel: s.mode === 'review' ? '复习' : '新学',
    });

    wx.navigateTo({ url: `/pages/word-summary/index?entryId=${entryId}&xpGained=${xpGained}` });
    this._needResume = true;
  },

  async finishStudy(): Promise<void> {
    const s = this._session!;
    const correct = s.correctCount;
    const wrong = s.wrongCount;

    // 更新缓存中的 xpGained（仅新学词正确计数）
    const summary = getStudySummary();
    if (summary) {
      summary.xpGained = s.xpGained;
    }
    // 异步通知后端完成学习，await 以便拿到新勋章
    try {
      const result = await completeStudy({ wordBookId: getCurrentBookId(), correctCount: correct, wrongCount: wrong, xpGained: s.xpGained });
      if (summary && result.newBadge) {
        summary.newBadge = result.newBadge;
      }
    } catch { /* 网络异常不阻塞跳转 */ }
    if (summary) {
      wx.setStorageSync('study_summary', JSON.stringify(summary));
    }

    // 播放完成音效，然后跳转（延迟 0.8s 等音效播完）
    if (this._answerSound) playCompleteSound();
    const delay = this._answerSound ? 800 : 0;
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/study-complete/index' });
    }, delay);
  },

  async recordAnswer(isCorrect: boolean, selectedIndex: number): Promise<void> {
    const s = this._session!;
    const word = s.words[s.currentWordIndex];
    const sent = word.quizItems[s.currentSentenceIndex];
    const options = this.data.options;
    const correctIdx = this.data.correctIndex;
    const wrongAnswer = selectedIndex >= 0 && selectedIndex < options.length
      ? options[selectedIndex] : '不知道';
    const correctAnswer = correctIdx >= 0 && correctIdx < options.length
      ? options[correctIdx] : '';
    try {
      await submitAnswer({
        wordBookId: this._bookId, entryId: word.entryId, quizItemId: sent.id,
        selectedOption: selectedIndex, correct: isCorrect,
        correctAnswer, wrongAnswer,
      });
      // XP 在 completeWord 中发放，不再在 submitAnswer 中累加
    } catch { /* ignore */ }

    if (isCorrect) {
      s.correctCount++;
      this.setData({ correctCount: s.correctCount });
      incrementStudySummary(true);
      // 答对时检查是否需要移出错题本
      this._checkAndRemoveMistake(word.entryId);
    } else {
      s.wrongCount++;
      this.setData({ wrongCount: s.wrongCount });
      incrementStudySummary(false);
      // 答错时记录到错题本
      this._recordMistake(word.entryId, word.character, sent, selectedIndex);
    }
  },

  /** 答错时记录到错题本 */
  _recordMistake(entryId: string, character: string, sent: IStudyData['currentSentence'], selectedIndex: number): void {
    if (!sent) return;
    const fullWord = this._wordsMap[entryId];
    const existing = getMistakes().find(m => m.entryId === entryId);

    const options = this.data.options;
    const correctIdx = this.data.correctIndex;
    const wrongAnswer = selectedIndex >= 0 && selectedIndex < options.length
      ? options[selectedIndex]
      : '不知道';
    const correctAnswer = correctIdx >= 0 && correctIdx < options.length
      ? options[correctIdx]
      : '';

    const sentences = existing?.sentences ? [...existing.sentences] : [];
    const sentIdx = sentences.findIndex(s => s.quizItemId === sent.id);

    if (sentIdx >= 0) {
      const prev = sentences[sentIdx];
      sentences[sentIdx] = {
        ...prev,
        wrongAnswer,
        correctAnswer,
        errorCount: prev.errorCount + 1,
        consecutiveCorrect: 0,
      };
    } else {
      sentences.push({
        quizItemId: sent.id,
        sentenceText: sent.text,
        wrongAnswer,
        correctAnswer,
        errorCount: 1,
        consecutiveCorrect: 0,
      });
    }

    addMistake({
      entryId,
      character,
      pinyin: fullWord?.pinyin || '',
      totalErrors: (existing?.totalErrors || 0) + 1,
      lastErrorTime: new Date().toISOString().split('T')[0],
      sentences,
    });
  },

  /** 答对时检查是否达到移出阈值 */
  _checkAndRemoveMistake(entryId: string): void {
    const existing = getMistakes().find(m => m.entryId === entryId);
    if (!existing) return;

    const word = this._session?.words[this._session.currentWordIndex];
    if (!word) return;
    const currentSent = word.quizItems[this._session!.currentSentenceIndex];
    if (!currentSent) return;

    const sentences = existing.sentences.map(s => {
      if (s.quizItemId === currentSent.id) {
        return { ...s, consecutiveCorrect: s.consecutiveCorrect + 1 };
      }
      return s;
    });

    const threshold = getMistakeRemoveThreshold();
    const remaining = sentences.filter(s => s.consecutiveCorrect < threshold);

    if (remaining.length === 0) {
      removeMistake(entryId);
    } else {
      // 重新计算 totalErrors（移出的句子可能有多条 errorCount）
      const newTotal = remaining.reduce((sum, s) => sum + s.errorCount, 0);
      addMistake({ ...existing, sentences: remaining, totalErrors: newTotal });
    }
  },

  onTapFullText(): void {
    const { currentSentence } = this.data;
    if (!currentSentence?.articleId) return;
    wx.navigateTo({ url: `/pages/article-reader/index?id=${currentSentence.articleId}` });
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
          wordId: word?.entryId,
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
    destroyAudioContext();
  },
});
