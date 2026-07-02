import type { IWordBook } from '../../typings/index.d';
import { loadWordBookData, getProgress } from '../../utils/storage';
interface IBookDetailData { book: IWordBook | null; learned: number; mastered: number; total: number; loading: boolean; }
Page<IBookDetailData, WechatMiniprogram.Page.CustomOption>({
  data: { book: null, learned: 0, mastered: 0, total: 0, loading: true },
  onLoad(o: Record<string, string | undefined>): void {
    const id = o.id || '';
    const book = loadWordBookData(id);
    const p = getProgress();
    const learned = book ? Object.values(p.wordProgresses).filter(wp => book.words.some(w => w.id === wp.wordId)).length : 0;
    const mastered = book ? Object.values(p.wordProgresses).filter(wp => wp.stage === 'done' && book.words.some(w => w.id === wp.wordId)).length : 0;
    this.setData({ book, learned, mastered, total: book?.words.length || 0, loading: false });
  },
  onTapBack(): void { wx.navigateBack(); },
});
