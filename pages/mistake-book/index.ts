// ============================================
// 错题本页面
// ============================================
import type { IMistakeRecord, MistakeFilter } from '../../typings/index.d';
import { fetchMistakes, removeMistakeApi } from '../../api/index';
import { MISTAKE_FILTERS } from '../../constants/config';

interface IMistakeBookData {
  activeFilter: MistakeFilter;
  filters: { key: string; label: string }[];
  mistakes: IMistakeRecord[];
  expandedWordId: string;
  loading: boolean;
  isEmpty: boolean;
}

Page<IMistakeBookData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeFilter: 'all',
    filters: MISTAKE_FILTERS as unknown as { key: string; label: string }[],
    mistakes: [],
    expandedWordId: '',
    loading: false,
    isEmpty: false,
  },

  onLoad(): void {
    this.loadMistakes();
  },

  onShow(): void {
    this.loadMistakes();
  },

  /** 加载错题列表 */
  async loadMistakes(): Promise<void> {
    this.setData({ loading: true });

    try {
      const all = await fetchMistakes();
      const filtered = this.applyFilter(all, this.data.activeFilter);
      this.setData({
        mistakes: filtered,
        isEmpty: filtered.length === 0,
        loading: false,
      });
    } catch (err) {
      console.error('加载错题本失败:', err);
      this.setData({ mistakes: [], isEmpty: true, loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /** 应用筛选 */
  applyFilter(mistakes: IMistakeRecord[], filter: MistakeFilter): IMistakeRecord[] {
    if (filter === 'all') return mistakes;

    if (filter === 'frequent') {
      // 错误 3 次以上
      return mistakes.filter(m => m.errorCount >= 3);
    }

    if (filter === 'recent') {
      // 7 天内
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return mistakes.filter(m => new Date(m.lastErrorTime).getTime() >= sevenDaysAgo);
    }

    return mistakes;
  },

  /** 切换筛选 */
  onTapFilter(e: WechatMiniprogram.BaseEvent): void {
    const filter = e.currentTarget.dataset.filter as MistakeFilter;
    if (filter === this.data.activeFilter) return;
    this.setData({ activeFilter: filter });
    this.loadMistakes();
  },

  /** 点击词条展开/收起详情 */
  onTapWord(e: WechatMiniprogram.BaseEvent): void {
    const wordId = e.currentTarget.dataset.wordId as string;
    const current = this.data.expandedWordId;
    this.setData({ expandedWordId: current === wordId ? '' : wordId });
  },

  /** 手动移除错题 */
  async onRemoveMistake(e: WechatMiniprogram.BaseEvent): void {
    const wordId = e.currentTarget.dataset.wordId as string;
    wx.showModal({
      title: '确认移除',
      content: '该词的错题记录将被清除',
      confirmText: '移除',
      confirmColor: '#4a6a5e',
      success: async (res) => {
        if (res.confirm) {
          try {
            await removeMistakeApi(wordId);
            this.setData({ expandedWordId: '' });
            this.loadMistakes();
            wx.showToast({ title: '已移除', icon: 'success' });
          } catch {
            wx.showToast({ title: '移除失败', icon: 'none' });
          }
        }
      },
    });
  },

  /** 点击跳转到字总结 */
  onTapWordDetail(e: WechatMiniprogram.BaseEvent): void {
    const wordId = e.currentTarget.dataset.wordId as string;
    if (!wordId) return;
    wx.navigateTo({ url: `/pages/word-summary/index?wordId=${wordId}` });
  },
});
