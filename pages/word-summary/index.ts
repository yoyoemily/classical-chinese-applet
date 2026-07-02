import type { IWord, IMeaning } from '../../typings/index.d';
import { fetchWordDetail } from '../../api/index';
import { getWordProgress } from '../../utils/storage';
import { getMasteryLabel } from '../../utils/ebbinghaus';

interface IWordSummaryData {
  word: IWord | null;
  pinyin: string;
  radical: string;
  strokes: number;
  structure: string;
  meanings: IMeaning[];
  homophones: string[];
  similarShapes: string[];
  masteryLabel: string;
  masteryProgress: number;
  loading: boolean;
}

Page<IWordSummaryData, WechatMiniprogram.Page.CustomOption>({
  data: {
    word: null, pinyin: '', radical: '', strokes: 0, structure: '',
    meanings: [], homophones: [], similarShapes: [],
    masteryLabel: '学习中', masteryProgress: 0, loading: true,
  },
  onLoad(options: Record<string, string | undefined>): void {
    const wordId = options.wordId || '';
    if (wordId) this.loadWord(wordId);
    else this.setData({ loading: false });
  },
  async loadWord(wordId: string): Promise<void> {
    try {
      const word = await fetchWordDetail(wordId);
      if (!word) { this.setData({ loading: false }); return; }
      const progress = getWordProgress(wordId);
      const label = getMasteryLabel(progress);
      const masteryProgress = progress ? (progress.stage === 'done' ? 100 : typeof progress.stage === 'number' ? Math.round((progress.stage / 6) * 100) : 0) : 0;
      this.setData({
        word, pinyin: word.pinyin, radical: word.radical, strokes: word.strokes,
        structure: word.structure, meanings: word.meanings,
        homophones: word.similarHomophones || [], similarShapes: word.similarShapes || [],
        masteryLabel: label, masteryProgress, loading: false,
      });
    } catch { this.setData({ loading: false }); }
  },
  onTapContinue(): void { wx.navigateBack(); },
  onShareAppMessage() { return { title: `学习「${this.data.word?.character || ''}」`, path: '/pages/index/index' }; },
});
