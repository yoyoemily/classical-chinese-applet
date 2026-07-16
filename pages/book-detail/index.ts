import type { IWordBook } from '../../typings/index.d';
import { fetchWordBookDetail, fetchProgress } from '../../api/index';
interface IBookDetailData { book: IWordBook | null; learned: number; mastered: number; total: number; loading: boolean; }
Page<IBookDetailData, WechatMiniprogram.Page.CustomOption>({
  data: { book: null, learned: 0, mastered: 0, total: 0, loading: true },
  async onLoad(o: Record<string, string | undefined>): Promise<void> {
    const id = o.id || '';
    try {
      const book = await fetchWordBookDetail(id);
      const p = await fetchProgress(id);
      const learned = book ? Object.values(p.wordProgresses).filter(wp => book.wordEntries.some(w => w.id === wp.entryId)).length : 0;
      const mastered = book ? Object.values(p.wordProgresses).filter(wp => wp.stage === 'done' && book.wordEntries.some(w => w.id === wp.entryId)).length : 0;
      this.setData({ book, learned, mastered, total: book?.wordEntries.length || 0, loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },
  onTapBack(): void { wx.navigateBack(); },
});
