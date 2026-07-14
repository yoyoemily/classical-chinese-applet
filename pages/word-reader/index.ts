import { fetchWordBookDetail } from '../../api/index';
import type { IWord, IMeaning } from '../../typings/index.d';

interface IUsageItem extends IMeaning {
  expanded: boolean;
}

interface IWordEntry {
  id: string;
  character: string;
  pinyin: string;
  usages: IUsageItem[];
  allExpanded: boolean;
}

interface IWordReaderData {
  bookName: string;
  bookDescription: string;
  words: IWordEntry[];
  loading: boolean;
}

Page<IWordReaderData, WechatMiniprogram.Page.CustomOption>({
  data: {
    bookName: '',
    bookDescription: '',
    words: [],
    loading: true,
  },
  onLoad(options: Record<string, string | undefined>): void {
    const bookId = options.bookId || 'wb_function_words';
    this.loadBook(bookId);
  },
  async loadBook(bookId: string): Promise<void> {
    try {
      const book = await fetchWordBookDetail(bookId);
      if (!book || !book.words) {
        this.setData({ loading: false });
        wx.showToast({ title: '词书数据为空', icon: 'none' });
        return;
      }
      const entries: IWordEntry[] = book.words.map((w: IWord) => ({
        id: w.id,
        character: w.character,
        pinyin: w.pinyin || '',
        usages: (w.meanings || []).map((m: IMeaning) => ({ ...m, expanded: false })),
        allExpanded: false,
      }));
      this.setData({
        bookName: book.name || '虚词词书',
        bookDescription: book.description || '',
        words: entries,
        loading: false,
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  onTapCharacter(e: WechatMiniprogram.TouchEvent): void {
    const idx = e.currentTarget.dataset.index as number;
    const word = this.data.words[idx];
    if (!word) return;
    const shouldExpand = !word.allExpanded;
    const update: Record<string, unknown> = {};
    word.usages.forEach((_, i) => {
      update[`words[${idx}].usages[${i}].expanded`] = shouldExpand;
    });
    update[`words[${idx}].allExpanded`] = shouldExpand;
    this.setData(update);
  },
  onShareAppMessage() {
    return {
      title: this.data.bookName || '文言虚词一本通',
      path: '/pages/word-reader/index',
    };
  },
});
