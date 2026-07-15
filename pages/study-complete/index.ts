import { getStudySummary } from '../../utils/storage';
import { randomPick } from '../../utils/util';
import { ENCOURAGEMENT_POEMS } from '../../constants/config';

interface IStudyCompleteData {
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  xpGained: number;
  poem: string;
}

Page<IStudyCompleteData, WechatMiniprogram.Page.CustomOption>({
  data: {
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    xpGained: 0,
    poem: '',
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
  },
  onTapMistake(): void { wx.navigateTo({ url: '/pages/mistake-book/index' }); },
  onTapHome(): void { wx.switchTab({ url: '/pages/index/index' }); },
  onShareAppMessage() { return { title: `今日学习完成！答对 ${this.data.correctCount} 题`, path: '/pages/index/index' }; },
});
