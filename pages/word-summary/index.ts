import type { IWordEntry, IKeyWordRef } from '../../typings/index.d';
import { fetchWordDetail } from '../../api/index';
import { wordTypeLabel } from '../../utils/wordType';

interface IMeaningItem {
  kid: string
  word?: string
  definition?: string
  sentenceText?: string
  sentenceTranslation?: string
  articleId?: string
  articleTitle?: string
  expanded: boolean
}

interface IWordSummaryData {
  word: IWordEntry | null;
  character: string;
  wordType: string;
  characterType: string;
  explanation: string;
  oracleForm: string;
  examFrequency: string;
  meaningItems: IMeaningItem[];
  loading: boolean;
  xpGained: number;
}

Page<IWordSummaryData, WechatMiniprogram.Page.CustomOption>({
  data: {
    word: null, character: '', wordType: '', characterType: '', explanation: '',
    oracleForm: '', examFrequency: '',
    meaningItems: [],
    loading: true,
    xpGained: 0,
  },
  onLoad(options: Record<string, string | undefined>): void {
    const entryId = options.entryId || options.wordId || '';
    const xpGained = parseInt(options.xpGained || '0', 10) || 0;
    this.setData({ xpGained });
    if (entryId) this.loadWord(entryId);
    else this.setData({ loading: false });
  },
  async loadWord(entryId: string): Promise<void> {
    try {
      const word = await fetchWordDetail(entryId);
      if (!word) { this.setData({ loading: false }); return; }
      // Adapt: fetchWordDetail may return IWord (old) or IWordEntry (new).
      // keyWordRefs is on IWordEntry; meanings is on old IWord.
      const rawWord = word as unknown as Record<string, unknown>;
      const keyWordRefs = (rawWord.keyWordRefs || rawWord.meanings || []) as IKeyWordRef[];
      const meaningItems: IMeaningItem[] = keyWordRefs.map(m => ({
        kid: m.kid || '',
        word: m.word || '',
        definition: m.definition || (m as unknown as { definition?: string }).definition || '',
        sentenceText: m.sentenceText || (m as unknown as { example?: string }).example || '',
        sentenceTranslation: m.sentenceTranslation || (m as unknown as { translation?: string }).translation || '',
        articleId: m.articleId || '',
        articleTitle: m.articleTitle || (m as unknown as { source?: string }).source || '',
        expanded: false,
      }));
      this.setData({
        word, character: word.character,
        wordType: wordTypeLabel(word.wordType || ''),
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
