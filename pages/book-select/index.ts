import { fetchWordBooks } from '../../api/index';
import { getCurrentBookId, setCurrentBookId } from '../../utils/storage';

interface IBookItem {
  id: string; name: string; description: string; category: string; coverColor: string;
  totalWords: number; studyMode?: string; identifyPrompt?: string; examLevel?: string; initialized?: boolean;
}

interface IBookSelectData {
  books: IBookItem[];
  filteredBooks: IBookItem[];
  currentBookId: string;
  activeTab: 'all' | 'zhongkao' | 'gaokao';
  tabs: { key: 'all' | 'zhongkao' | 'gaokao'; label: string }[];
}

Page<IBookSelectData, WechatMiniprogram.Page.CustomOption>({
  data: {
    books: [],
    filteredBooks: [],
    currentBookId: '',
    activeTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'zhongkao', label: '中考' },
      { key: 'gaokao', label: '高考' },
    ],
  },
  onLoad(): void { this.load(); },
  onShow(): void { this.load(); },
  async load(): Promise<void> {
    try {
      const books = await fetchWordBooks();
      this.setData({ books, currentBookId: getCurrentBookId() });
      this.applyFilter();
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  applyFilter(): void {
    const { books, activeTab } = this.data;
    const filteredBooks = activeTab === 'all' ? books : books.filter(b => b.examLevel === activeTab);
    this.setData({ filteredBooks });
  },
  onTapTab(e: WechatMiniprogram.BaseEvent): void {
    const tab = e.currentTarget.dataset.tab as 'all' | 'zhongkao' | 'gaokao';
    if (!tab || tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.applyFilter();
  },
  onTapBook(e: WechatMiniprogram.BaseEvent): void {
    const bookId = e.currentTarget.dataset.bookId as string;
    const book = this.data.books.find(b => b.id === bookId);
    if (!bookId || bookId === this.data.currentBookId) return;
    if (!book?.initialized) {
      wx.showToast({ title: '该词书尚未初始化完成', icon: 'none' });
      return;
    }
    setCurrentBookId(bookId);
    this.setData({ currentBookId: bookId });
    wx.showToast({ title: '已切换词书', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 800);
  },
});
