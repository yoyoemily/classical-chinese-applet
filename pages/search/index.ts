// ============================================
// 全局搜索页面
// ============================================
import type { IWordSearchResult, IWordQuickItem } from '../../typings/index.d';
import { searchWords, fetchWordsByType } from '../../api/index';
import { QUICK_GROUP_ORDER, groupLabel, groupIcon, type QuickGroupKey } from '../../utils/wordType';

interface IMeaningExample {
  example: string
  translation?: string
  source?: string
}

interface IGroupedMeaning {
  definition: string
  examples: IMeaningExample[]
}

/** 搜索结果项，在 IWordSearchResult 基础上增加按义项分组的例句 */
interface ISearchResultItem extends IWordSearchResult {
  groupedMeanings: IGroupedMeaning[]
}

interface ISearchData {
  keyword: string;
  results: ISearchResultItem[];
  searched: boolean;
  loading: boolean;
  history: string[];
  showHistory: boolean;
  /** 快捷搜索：词类分组数据 */
  quickGroups: Record<string, IWordQuickItem[]>;
  /** 分类展开/折叠状态 */
  expandedCategories: Record<string, boolean>;
}

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const GROUP_ORDER_STR = QUICK_GROUP_ORDER as readonly string[];

Page<ISearchData, WechatMiniprogram.Page.CustomOption>({
  data: {
    keyword: '',
    results: [],
    searched: false,
    loading: false,
    history: [],
    showHistory: true,
    quickGroups: {},
    expandedCategories: Object.fromEntries(QUICK_GROUP_ORDER.map(k => [k, true])) as Record<string, boolean>,
  },
  _debounceTimer: 0 as unknown as ReturnType<typeof setTimeout>,

  onLoad(): void {
    this.loadHistory();
    this.loadQuickWords();
  },

  onShow(): void {
    // 每次进入自动聚焦
  },

  /** 加载快捷搜索词类分组数据 */
  async loadQuickWords(): Promise<void> {
    try {
      const quickGroups = await fetchWordsByType();
      this.setData({ quickGroups });
    } catch (err) {
      console.error('加载快捷搜索数据失败:', err);
    }
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
    history = history.filter(h => h !== keyword);
    history.unshift(keyword);
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
      const rawResults = await searchWords(keyword);
      // Group meanings by definition — same definition aggregates examples
      const results: ISearchResultItem[] = rawResults.map(r => {
        const groupMap = new Map<string, IMeaningExample[]>();
        r.meanings.forEach(m => {
          const def = (m.definition || '').trim();
          if (!groupMap.has(def)) groupMap.set(def, []);
          groupMap.get(def)!.push({ example: m.example, translation: m.translation, source: m.source });
        });
        const groupedMeanings: IGroupedMeaning[] = Array.from(groupMap.entries()).map(([def, examples]) => ({
          definition: def,
          examples,
        }));
        return { ...r, groupedMeanings };
      });
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

  /** 点击快捷搜索字词 chip */
  onTapQuickWord(e: WechatMiniprogram.BaseEvent): void {
    const character = e.currentTarget.dataset.character as string;
    if (!character) return;
    this.setData({ keyword: character, showHistory: false });
    this.doSearch(character);
  },

  /** 切换分类展开/折叠 */
  onToggleCategory(e: WechatMiniprogram.BaseEvent): void {
    const category = e.currentTarget.dataset.category as string;
    if (!category) return;
    const expandedCategories = { ...this.data.expandedCategories };
    expandedCategories[category] = !expandedCategories[category];
    this.setData({ expandedCategories });
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

  // ---- template helpers ----
  groupLabel(key: string): string { return groupLabel(key as QuickGroupKey); },
  groupIcon(key: string): string { return groupIcon(key as QuickGroupKey); },
});