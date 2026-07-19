import type { IWordEntry, IKeyWordRef } from '../../typings/index.d';
import { fetchWordDetail } from '../../api/index';
import { wordTypeLabel } from '../../utils/wordType';

interface ISentenceItem {
  sentenceText?: string
  sentenceTranslation?: string
  articleId?: string
  articleTitle?: string
}

interface IMeaningItem {
  definition?: string
  sentences: ISentenceItem[]
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
      // Group by definition — same definition aggregates sentences
      const groupMap = new Map<string, IKeyWordRef[]>();
      keyWordRefs.forEach(m => {
        const def = (m.definition || '').trim();
        const key = def || `__empty_${m.kid || ''}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(m);
      });
      const meaningItems: IMeaningItem[] = Array.from(groupMap.entries()).map(([def, refs]) => ({
        definition: def.startsWith('__empty_') ? '' : def,
        sentences: refs.map(m => ({
          sentenceText: m.sentenceText || '',
          sentenceTranslation: m.sentenceTranslation || '',
          articleId: m.articleId || '',
          articleTitle: m.articleTitle || '',
        })),
        expanded: true,
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
