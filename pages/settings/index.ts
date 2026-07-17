import { STORAGE_KEYS, DEFAULT_DAILY_NEW_WORDS, DEFAULT_DAILY_REVIEW_WORDS, MISTAKE_REMOVE_THRESHOLD_OPTIONS, DEFAULT_MISTAKE_REMOVE_THRESHOLD } from '../../constants/config';
import { getMistakeRemoveThreshold, setMistakeRemoveThreshold } from '../../utils/storage';
import { safeJSONParse } from '../../utils/util';
import { clearUserData, recoverUserData, fetchUserInfo } from '../../api/index';
import type { IUserProfile } from '../../typings/index';

interface ISettingsData {
  dailyNewWords: number; dailyReviewWords: number;
  autoPlayAudio: boolean; answerSound: boolean;
  studyOrder: number;
  mistakeThreshold: number;
  version: string;
  newWordsRange: number[]; reviewWordsRange: number[]; studyOrderOptions: string[];
  recoveryDeadline: string;
  clearing: boolean;
}

const NEW_WORDS_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

Page<ISettingsData, WechatMiniprogram.Page.CustomOption>({
  data: {
    dailyNewWords: DEFAULT_DAILY_NEW_WORDS, dailyReviewWords: DEFAULT_DAILY_REVIEW_WORDS,
    autoPlayAudio: true, answerSound: true,
    studyOrder: 0,
    mistakeThreshold: DEFAULT_MISTAKE_REMOVE_THRESHOLD,
    version: '0.1.0',
    newWordsRange: NEW_WORDS_RANGE,
    reviewWordsRange: Array.from({ length: 20 }, (_, i) => i + 1),
    studyOrderOptions: ['顺序', '乱序'],
    recoveryDeadline: '',
    clearing: false,
  },
  onLoad(): void { this.load(); },
  async load(): Promise<void> {
    try {
      const raw = wx.getStorageSync(STORAGE_KEYS.SETTINGS);
      const saved = raw ? safeJSONParse<Partial<ISettingsData>>(raw, {}) : {};
      this.setData({
        dailyNewWords: saved.dailyNewWords ?? DEFAULT_DAILY_NEW_WORDS,
        dailyReviewWords: saved.dailyReviewWords ?? DEFAULT_DAILY_REVIEW_WORDS,
        autoPlayAudio: saved.autoPlayAudio ?? true,
        answerSound: saved.answerSound ?? true,
        studyOrder: saved.studyOrder ?? 0,
        mistakeThreshold: getMistakeRemoveThreshold(),
      });
      // 获取恢复状态
      try {
        const info: IUserProfile = await fetchUserInfo();
        this.setData({ recoveryDeadline: info.recoveryDeadline || '' });
      } catch { /* 获取失败不影响设置页使用 */ }
    } catch { /* use defaults */ }
  },
  onShow(): void {
    // 每次回到设置页刷新恢复截止时间
    if (this.data.recoveryDeadline) {
      fetchUserInfo().then((info: IUserProfile) => {
        this.setData({ recoveryDeadline: info.recoveryDeadline || '' });
      }).catch(() => {});
    }
  },
  save(): void {
    wx.setStorageSync(STORAGE_KEYS.SETTINGS, JSON.stringify({
      dailyNewWords: this.data.dailyNewWords, dailyReviewWords: this.data.dailyReviewWords,
      autoPlayAudio: this.data.autoPlayAudio, answerSound: this.data.answerSound,
      studyOrder: this.data.studyOrder,
    }));
  },
  onNewWordsChange(e: WechatMiniprogram.PickerChange): void { this.setData({ dailyNewWords: NEW_WORDS_RANGE[Number(e.detail.value)] }); this.save(); },
  onReviewWordsChange(e: WechatMiniprogram.PickerChange): void { this.setData({ dailyReviewWords: Number(e.detail.value) + 1 }); this.save(); },
  onToggleAutoPlay(e: WechatMiniprogram.SwitchChange): void { this.setData({ autoPlayAudio: e.detail.value }); this.save(); },
  onToggleAnswerSound(e: WechatMiniprogram.SwitchChange): void { this.setData({ answerSound: e.detail.value }); this.save(); },
  onStudyOrderChange(e: WechatMiniprogram.PickerChange): void { this.setData({ studyOrder: Number(e.detail.value) }); this.save(); },
  onMistakeThresholdChange(e: WechatMiniprogram.PickerChange): void {
    const value = Number(e.detail.value);
    const threshold = MISTAKE_REMOVE_THRESHOLD_OPTIONS[value];
    this.setData({ mistakeThreshold: threshold });
    setMistakeRemoveThreshold(threshold);
  },
  /** 清除学习数据 */
  onClearData(): void {
    wx.showModal({
      title: '确认清除',
      content: '该操作会清除所有历史数据，包括学习记录、错题本、等级勋章等。',
      confirmText: '确定清除',
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ clearing: true });
        try {
          const result = await clearUserData();
          // 更新 token 和 userId
          wx.setStorageSync(STORAGE_KEYS.TOKEN, result.token);
          // 清客户端缓存
          ['userProgress', 'userBadges', 'studySession', 'cachedAnswers', 'study_summary'].forEach(k => wx.removeStorageSync(k));
          this.setData({ recoveryDeadline: result.recoveryDeadline, clearing: false });
          wx.showToast({ title: '数据已清除', icon: 'success' });
        } catch (err: any) {
          this.setData({ clearing: false });
          wx.showToast({ title: err?.message || '清除失败，请重试', icon: 'none' });
        }
      },
    });
  },
  /*
  /** 恢复学习数据 */
  onRecoverData(): void {
    wx.showModal({
      title: '确认恢复',
      content: '即将恢复你之前清除的学习数据。',
      confirmText: '确定恢复',
      confirmColor: '#4a6a5e',
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ clearing: true });
        try {
          const result = await recoverUserData();
          // 更新 token 和 userId
          wx.setStorageSync(STORAGE_KEYS.TOKEN, result.token);
          wx.setStorageSync('userId', result.userId);
          this.setData({ recoveryDeadline: '', clearing: false });
          wx.showToast({ title: '数据已恢复', icon: 'success' });
        } catch (err: any) {
          this.setData({ clearing: false });
          wx.showToast({ title: err?.message || '恢复失败，请重试', icon: 'none' });
        }
      },
    });
  },
});
