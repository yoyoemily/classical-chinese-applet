import type { IWord, IMeaning } from '../../typings/index.d';
import { fetchWordDetail } from '../../api/index';

interface IMeaningItem extends IMeaning {
  expanded: boolean;
}

interface IWordSummaryData {
  word: IWord | null;
  character: string;
  characterType: string;
  explanation: string;
  oracleForm: string;
  examFrequency: string;
  meaningItems: IMeaningItem[];
  loading: boolean;
}

Page<IWordSummaryData, WechatMiniprogram.Page.CustomOption>({
  data: {
    word: null, character: '', characterType: '', explanation: '',
    oracleForm: '', examFrequency: '',
    meaningItems: [],
    loading: true,
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
      const meaningItems: IMeaningItem[] = (word.meanings || []).map(m => ({ ...m, expanded: false }));
      this.setData({
        word, character: word.character,
        characterType: word.characterType || '',
        explanation: word.explanation || '',
        oracleForm: word.oracleForm || '',
        examFrequency: word.examFrequency || '',
        meaningItems,
        loading: false,
      });
    } catch { this.setData({ loading: false }); }
  },
  onTapMeaning(e: WechatMiniprogram.TouchEvent): void {
    const idx = e.currentTarget.dataset.index as number;
    const item = this.data.meaningItems[idx];
    if (!item) return;
    this.setData({ [`meaningItems[${idx}].expanded`]: !item.expanded });
  },
  onTapContinue(): void { wx.navigateBack(); },
  onShareAppMessage() { return { title: `学习「${this.data.character || ''}」`, path: '/pages/index/index' }; },
});
