import { fetchWordBooks } from '../../api/index';
import { getCurrentBookId, setCurrentBookId } from '../../utils/storage';

interface IBookItem {
  id: string; name: string; description: string; category: string; coverColor: string;
  totalWords: number; studyMode?: string; identifyPrompt?: string; examLevel?: string; initialized?: boolean;
}

interface IBookSelectData {
  books: IBookItem[];
  currentBookId: string;
}

Page<IBookSelectData, WechatMiniprogram.Page.CustomOption>({
  data: {
    books: [],
    currentBookId: '',
  },
  onLoad(): void { this.load(); },
  onShow(): void { this.load(); },
  async load(): Promise<void> {
    try {
      const books = await fetchWordBooks();
      this.setData({ books, currentBookId: getCurrentBookId() });
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  onTapBook(e: WechatMiniprogram.BaseEvent): void {
    const bookId = e.currentTarget.dataset.bookId as string;
    const book = this.data.books.find(b => b.id === bookId);
    if (!bookId || bookId === this.data.currentBookId) return;
    if (!book?.initialized) {
      wx.showToast({ title: '该词书尚未初始化完成', icon: 'none' });
      return;
    }
    // readonly 模式：跳转阅读页，不切换当前词书
    if (book.studyMode === 'readonly') {
      wx.navigateTo({ url: `/pages/word-reader/index?bookId=${bookId}` });
      return;
    }
    setCurrentBookId(bookId);
    this.setData({ currentBookId: bookId });
    wx.showToast({ title: '已切换词书', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
