import { loadWordBooks, getCurrentBookId, setCurrentBookId } from '../../utils/storage';

interface IBookSelectData {
  books: { id: string; name: string; description: string; category: string; coverColor: string; totalWords: number }[];
  currentBookId: string;
}

Page<IBookSelectData, WechatMiniprogram.Page.CustomOption>({
  data: { books: [], currentBookId: '' },
  onLoad(): void { this.load(); },
  onShow(): void { this.load(); },
  load(): void {
    const books = loadWordBooks();
    this.setData({ books, currentBookId: getCurrentBookId() });
  },
  onTapBook(e: WechatMiniprogram.BaseEvent): void {
    const bookId = e.currentTarget.dataset.bookId as string;
    if (!bookId || bookId === this.data.currentBookId) return;
    setCurrentBookId(bookId);
    this.setData({ currentBookId: bookId });
    wx.showToast({ title: '已切换词书', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
