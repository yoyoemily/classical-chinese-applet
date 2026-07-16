import type { IBadge } from '../../typings/index.d';
import { getStudySummary } from '../../utils/storage';
import { randomPick } from '../../utils/util';
import { ENCOURAGEMENT_POEMS } from '../../constants/config';

interface IStudyCompleteData {
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  xpGained: number;
  poem: string;
  showBadgeModal: boolean;
  newBadge: IBadge | null;
}

Page<IStudyCompleteData, WechatMiniprogram.Page.CustomOption>({
  data: {
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    xpGained: 0,
    poem: '',
    showBadgeModal: false,
    newBadge: null,
  },
  onLoad(): void {
    const summary = getStudySummary();
    const correct = summary?.correctCount ?? 0;
    const wrong = summary?.wrongCount ?? 0;
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const xpGained = summary?.xpGained ?? 0;
    const poem = randomPick(ENCOURAGEMENT_POEMS);

    this.setData({
      correctCount: correct,
      wrongCount: wrong,
      accuracy,
      xpGained,
      poem,
    });

    // 检查是否有新勋章，延迟弹出让完成页先渲染
    const newBadge = summary?.newBadge ?? null;
    if (newBadge) {
      setTimeout(() => {
        this.setData({ showBadgeModal: true, newBadge });
      }, 400);
    }
  },
  onCloseBadgeModal(): void {
    this.setData({ showBadgeModal: false });
  },
  onTapMistake(): void { wx.navigateTo({ url: '/pages/mistake-book/index' }); },
  onTapHome(): void { wx.switchTab({ url: '/pages/index/index' }); },
  onShareAppMessage() { return { title: `今日学习完成！答对 ${this.data.correctCount} 题`, path: '/pages/index/index' }; },
});
