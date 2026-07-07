import { STORAGE_KEYS, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, MISTAKE_REMOVE_THRESHOLD_OPTIONS, DEFAULT_MISTAKE_REMOVE_THRESHOLD } from '../../constants/config';
import { getMistakeRemoveThreshold, setMistakeRemoveThreshold } from '../../utils/storage';
import { safeJSONParse } from '../../utils/util';

interface ISettingsData {
  dailyNewWords: number; dailyReviewWords: number;
  autoPlayAudio: boolean; answerSound: boolean; vibrateFeedback: boolean;
  studyOrder: number;
  mistakeThreshold: number;
  version: string;
  newWordsRange: number[]; reviewWordsRange: number[]; studyOrderOptions: string[];
}

Page<ISettingsData, WechatMiniprogram.Page.CustomOption>({
  data: {
    dailyNewWords: DEFAULT_DAILY_NEW_WORDS, dailyReviewWords: DEFAULT_DAILY_REVIEW_WORDS,
    autoPlayAudio: true, answerSound: true, vibrateFeedback: false,
    studyOrder: 0,
    mistakeThreshold: DEFAULT_MISTAKE_REMOVE_THRESHOLD,
    version: '0.1.0',
    newWordsRange: Array.from({ length: 10 }, (_, i) => i + 1),
    reviewWordsRange: Array.from({ length: 20 }, (_, i) => i + 1),
    studyOrderOptions: ['顺序', '乱序'],
  },
  onLoad(): void { this.load(); },
  load(): void {
    try {
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const saved = raw ? safeJSONParse<Partial<ISettingsData>>(raw, {}) : {};
      this.setData({
        dailyNewWords: saved.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS,
        dailyReviewWords: saved.dailyReviewWords ?? DEFAULT_DAILY_REVIEW_WORDS,
        autoPlayAudio: saved.autoPlayAudio ?? true,
        answerSound: saved.answerSound ?? true,
        vibrateFeedback: saved.vibrateFeedback ?? false,
        studyOrder: saved.studyOrder ?? 0,
        mistakeThreshold: getMistakeRemoveThreshold(),
      });
    } catch { /* use defaults */ }
  },
  save(): void {
    wx.setStorageSync(STORAGE_KEYS.SETTINGS, JSON.stringify({
      dailyNewWords: this.data.dailyNewWords, dailyReviewWords: this.data.dailyReviewWords,
      autoPlayAudio: this.data.autoPlayAudio, answerSound: this.data.answerSound,
      vibrateFeedback: this.data.vibrateFeedback,
      studyOrder: this.data.studyOrder,
    }));
  },
  onNewWordsChange(e: WechatMiniprogram.PickerChange): void { this.setData({ dailyNewWords: Number(e.detail.value) + 1 }); this.save(); },
  onReviewWordsChange(e: WechatMiniprogram.PickerChange): void { this.setData({ dailyReviewWords: Number(e.detail.value) + 1 }); this.save(); },
  onToggleAutoPlay(e: WechatMiniprogram.SwitchChange): void { this.setData({ autoPlayAudio: e.detail.value }); this.save(); },
  onToggleAnswerSound(e: WechatMiniprogram.SwitchChange): void { this.setData({ answerSound: e.detail.value }); this.save(); },
  onToggleVibrate(e: WechatMiniprogram.SwitchChange): void { this.setData({ vibrateFeedback: e.detail.value }); this.save(); },
  onStudyOrderChange(e: WechatMiniprogram.PickerChange): void { this.setData({ studyOrder: Number(e.detail.value) }); this.save(); },
  onMistakeThresholdChange(e: WechatMiniprogram.PickerChange): void {
    const value = Number(e.detail.value);
    const threshold = MISTAKE_REMOVE_THRESHOLD_OPTIONS[value];
    this.setData({ mistakeThreshold: threshold });
    setMistakeRemoveThreshold(threshold);
  },
  onClearData(): void {
    wx.showModal({
      title: '确认清除', content: '将清除所有学习进度、打卡记录和勋章数据，此操作不可恢复。',
      confirmText: '确定清除', confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          ['userProgress', 'userBadges', 'studySession', 'cachedAnswers'].forEach(k => wx.removeStorageSync(k));
          wx.showToast({ title: '数据已清除', icon: 'success' });
        }
      },
    });
  },
});
