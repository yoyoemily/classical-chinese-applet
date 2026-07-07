import { completeStudy, fetchProgress } from '../../api/index';
import { calcLevel, getLevelXP, ENCOURAGEMENT_POEMS } from '../../constants/config';
import { randomPick } from '../../utils/util';
import { getCurrentBookId } from '../../utils/storage';
import type { IBadge } from '../../typings/index.d';

interface IStudyCompleteData {
  correctCount: number; wrongCount: number; accuracy: number;
  streak: number; xpGained: number; newBadges: IBadge[];
  poem: string; levelInfo: { level: number; title: string }; xpToNext: number;
  loading: boolean;
}

Page<IStudyCompleteData, WechatMiniprogram.Page.CustomOption>({
  data: {
    correctCount: 0, wrongCount: 0, accuracy: 0, streak: 0, xpGained: 0,
    newBadges: [], poem: '', levelInfo: { level: 1, title: '童生' }, xpToNext: 100, loading: true,
  },
  onLoad(options: Record<string, string | undefined>): void {
    const correct = parseInt(options.correctCount || '0', 10);
    const wrong = parseInt(options.wrongCount || '0', 10);
    this.init(correct, wrong);
  },
  async init(correct: number, wrong: number): Promise<void> {
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const poem = randomPick(ENCOURAGEMENT_POEMS);
    try {
      const bookId = getCurrentBookId();
      const result = await completeStudy({ wordBookId: bookId, correctCount: correct, wrongCount: wrong });
      const progress = await fetchProgress(bookId);
      const levelInfo = calcLevel(progress.totalXP);
      let xpAccum = 0;
      for (let l = 1; l < levelInfo.level; l++) xpAccum += getLevelXP(l);
      const xpIntoLevel = progress.totalXP - xpAccum;
      const xpForLevel = getLevelXP(levelInfo.level);
      this.setData({
        correctCount: correct, wrongCount: wrong, accuracy, streak: progress.currentStreak,
        xpGained: result.xpGained, newBadges: result.newBadges, poem, levelInfo,
        xpToNext: Math.max(0, xpForLevel - xpIntoLevel), loading: false,
      });
    } catch {
      const progress = { currentStreak: 0 };
      this.setData({ correctCount: correct, wrongCount: wrong, accuracy, streak: progress.currentStreak, xpGained: correct * 10, poem, loading: false });
    }
  },
  onTapMistake(): void { wx.switchTab({ url: '/pages/mistake-book/index' }); },
  onTapHome(): void { wx.switchTab({ url: '/pages/index/index' }); },
  onShareAppMessage() { return { title: `今日学习完成！答对 ${this.data.correctCount} 题`, path: '/pages/index/index' }; },
});
