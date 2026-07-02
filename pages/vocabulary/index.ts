// ============================================
// 生词本页面
// ============================================
import type { IVocabularyItem, VocabularyTab } from '../../typings/index.d';
import { fetchVocabulary } from '../../api/index';
import { getCurrentBookId } from '../../utils/storage';
import { VOCABULARY_TABS } from '../../constants/config';

interface IVocabularyData {
  activeTab: VocabularyTab;
  tabs: { key: string; label: string }[];
  words: IVocabularyItem[];
  loading: boolean;
  isEmpty: boolean;
}

Page<IVocabularyData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeTab: 'all',
    tabs: VOCABULARY_TABS as unknown as { key: string; label: string }[],
    words: [],
    loading: false,
    isEmpty: false,
  },

  onLoad(): void {
    this.loadVocabulary();
  },

  onShow(): void {
    // 每次显示时刷新（可能从其他页面返回后数据有更新）
    this.loadVocabulary();
  },

  /** 加载生词列表 */
  async loadVocabulary(): Promise<void> {
    const wordBookId = getCurrentBookId();
    if (!wordBookId) {
      this.setData({ words: [], isEmpty: true, loading: false });
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await fetchVocabulary(wordBookId, this.data.activeTab);
      this.setData({
        words: result.list,
        isEmpty: result.list.length === 0,
        loading: false,
      });
    } catch (err) {
      console.error('加载生词本失败:', err);
      this.setData({ words: [], isEmpty: true, loading: false });
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /** 切换 Tab */
  onTapTab(e: WechatMiniprogram.BaseEvent): void {
    const tab = e.currentTarget.dataset.tab as VocabularyTab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.loadVocabulary();
  },

  /** 点击生词卡片，跳转到字词详情 */
  onTapWord(e: WechatMiniprogram.BaseEvent): void {
    const wordId = e.currentTarget.dataset.wordId as string;
    if (!wordId) return;
    wx.navigateTo({
      url: `/pages/word-summary/index?wordId=${wordId}`,
    });
  },
});
