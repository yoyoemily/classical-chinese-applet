import { STORAGE_KEYS, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, MISTAKE_REMOVE_THRESHOLD_OPTIONS, DEFAULT_MISTAKE_REMOVE_THRESHOLD } from '../../constants/config';
import { getMistakeRemoveThreshold, setMistakeRemoveThreshold } from '../../utils/storage';
import { safeJSONParse } from '../../utils/util';

interface IStudySettingsData {
  dailyNewWords: number;
  dailyReviewWords: number;
  autoPlayAudio: boolean;
  answerSound: boolean;
  studyOrder: number;
  mistakeThreshold: number;
  newWordsRange: number[];
  reviewWordsRange: number[];
  studyOrderOptions: string[];
}

const NEW_WORDS_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

Page<IStudySettingsData, WechatMiniprogram.Page.CustomOption>({
  data: {
    dailyNewWords: DEFAULT_DAILY_NEW_WORDS,
    dailyReviewWords: DEFAULT_DAILY_REVIEW_WORDS,
    autoPlayAudio: true,
    answerSound: true,
    studyOrder: 0,
    mistakeThreshold: DEFAULT_MISTAKE_REMOVE_THRESHOLD,
    newWordsRange: NEW_WORDS_RANGE,
    reviewWordsRange: Array.from({ length: 20 }, (_, i) => i + 1),
    studyOrderOptions: ['顺序', '乱序'],
  },

  onLoad(): void {
    this.load();
  },

  load(): void {
    try {
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const saved = raw ? safeJSONParse<Partial<IStudySettingsData>>(raw, {}) : {};
      this.setData({
        dailyNewWords: saved.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS,
        dailyReviewWords: saved.dailyReviewWords ?? DEFAULT_DAILY_REVIEW_WORDS,
        autoPlayAudio: saved.autoPlayAudio ?? true,
        answerSound: saved.answerSound ?? true,
        studyOrder: saved.studyOrder ?? 0,
        mistakeThreshold: getMistakeRemoveThreshold(),
      });
    } catch { /* use defaults */ }
  },

  save(): void {
    wx.setStorageSync(STORAGE_KEYS.SETTINGS, JSON.stringify({
      dailyNewWords: this.data.dailyNewWords,
      dailyReviewWords: this.data.dailyReviewWords,
      autoPlayAudio: this.data.autoPlayAudio,
      answerSound: this.data.answerSound,
      studyOrder: this.data.studyOrder,
    }));
  },

  onNewWordsChange(e: WechatMiniprogram.PickerChange): void {
    this.setData({ dailyNewWords: NEW_WORDS_RANGE[Number(e.detail.value)] });
    this.save();
  },
  onReviewWordsChange(e: WechatMiniprogram.PickerChange): void {
    this.setData({ dailyReviewWords: Number(e.detail.value) + 1 });
    this.save();
  },
  onToggleAutoPlay(e: WechatMiniprogram.SwitchChange): void {
    this.setData({ autoPlayAudio: e.detail.value });
    this.save();
  },
  onToggleAnswerSound(e: WechatMiniprogram.SwitchChange): void {
    this.setData({ answerSound: e.detail.value });
    this.save();
  },
  onStudyOrderChange(e: WechatMiniprogram.PickerChange): void {
    this.setData({ studyOrder: Number(e.detail.value) });
    this.save();
  },
  onMistakeThresholdChange(e: WechatMiniprogram.PickerChange): void {
    const value = Number(e.detail.value);
    const threshold = MISTAKE_REMOVE_THRESHOLD_OPTIONS[value];
    this.setData({ mistakeThreshold: threshold });
    setMistakeRemoveThreshold(threshold);
  },
});
