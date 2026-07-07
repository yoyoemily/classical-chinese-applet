// ============================================
// 全局搜索页面
// ============================================
import type { IWordSearchResult } from '../../typings/index.d';
import { searchWords } from '../../api/index';

interface ISearchData {
  keyword: string;
  results: IWordSearchResult[];
  searched: boolean;
  loading: boolean;
  history: string[];
  showHistory: boolean;
}

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

Page<ISearchData, WechatMiniprogram.Page.CustomOption>({
  data: {
    keyword: '',
    results: [],
    searched: false,
    loading: false,
    history: [],
    showHistory: true,
  },
  _debounceTimer: 0 as unknown as ReturnType<typeof setTimeout>,

  onLoad(): void {
    this.loadHistory();
  },

  onShow(): void {
    // 每次进入自动聚焦
    // wx.createSelectorQuery 不适用于 search 组件，直接使用 focus 属性
  },

  /** 加载搜索历史 */
  loadHistory(): void {
    try {
      const raw = wx.getStorageSync(HISTORY_KEY);
      if (raw) {
        const history = JSON.parse(raw) as string[];
        this.setData({ history });
      }
    } catch {
      // ignore
    }
  },

  /** 保存搜索历史 */
  saveHistory(keyword: string): void {
    let history = this.data.history;
    // 去重
    history = history.filter(h => h !== keyword);
    // 插入开头
    history.unshift(keyword);
    // 限制长度
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    this.setData({ history });
    wx.setStorageSync(HISTORY_KEY, JSON.stringify(history));
  },

  /** 清除历史 */
  onClearHistory(): void {
    this.setData({ history: [] });
    wx.removeStorageSync(HISTORY_KEY);
  },

  /** 输入时触发搜索 */
  onInput(e: WechatMiniprogram.Input): void {
    const keyword = e.detail.value.trim();
    this.setData({ keyword, showHistory: true });

    // 防抖 300ms
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.doSearch(keyword);
    }, 300);
  },

  /** 执行搜索 */
  async doSearch(keyword: string): Promise<void> {
    if (!keyword) {
      this.setData({ results: [], searched: false, showHistory: true });
      return;
    }

    this.setData({ loading: true, showHistory: false });

    try {
      const results = await searchWords(keyword);
      this.setData({
        results,
        searched: true,
        loading: false,
      });
    } catch (err) {
      console.error('搜索失败:', err);
      this.setData({
        results: [],
        searched: true,
        loading: false,
      });
    }
  },

  /** 点击搜索按钮 */
  onConfirm(e: WechatMiniprogram.Input): void {
    const keyword = e.detail.value.trim();
    if (!keyword) return;

    this.saveHistory(keyword);
    this.setData({ showHistory: false });
    this.doSearch(keyword);
  },

  /** 点击搜索历史 */
  onTapHistory(e: WechatMiniprogram.BaseEvent): void {
    const keyword = e.currentTarget.dataset.keyword as string;
    this.setData({ keyword, showHistory: false });
    this.doSearch(keyword);
  },

  /** 取消搜索 */
  onCancel(): void {
    wx.navigateBack();
  },

  /** 清空输入框 */
  onClearInput(): void {
    this.setData({ keyword: '', results: [], searched: false, showHistory: true });
  },

  onUnload(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  },
});
