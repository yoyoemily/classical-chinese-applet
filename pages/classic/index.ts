// ============================================
// 经典著作列表页
// ============================================
import type { IClassicItem } from '../../typings/index.d';
import { fetchClassics } from '../../api/index';

type ClassicCategory = '经' | '史' | '子' | '集';

interface IClassicGroup {
  category: ClassicCategory;
  items: IClassicItem[];
}

interface IClassicData {
  activeTab: ClassicCategory;
  groups: IClassicGroup[];
  displayItems: IClassicItem[];
  loading: boolean;
  error: boolean;
}

const CATEGORY_TABS: { key: ClassicCategory; label: string; count: number }[] = [
  { key: '经', label: '经部', count: 11 },
  { key: '史', label: '史部', count: 9 },
  { key: '子', label: '子部', count: 15 },
  { key: '集', label: '集部', count: 17 },
];

function buildGroups(items: IClassicItem[]): IClassicGroup[] {
  return CATEGORY_TABS.map(tab => ({
    category: tab.key,
    items: items.filter(c => c.category === tab.key),
  }));
}

Page<IClassicData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeTab: '经',
    groups: [],
    displayItems: [],
    loading: true,
    error: false,
  },

  onLoad(): void {
    this.initPage();
  },

  async initPage(): Promise<void> {
    try {
      const items = await fetchClassics();
      if (items && items.length > 0) {
        const groups = buildGroups(items);
        this.setData({
          groups,
          displayItems: groups.find(g => g.category === this.data.activeTab)?.items || [],
          loading: false,
        });
        return;
      }
    } catch (_) {
      // 网络错误，展示错误提示
    }
    this.setData({ loading: false, error: true });
  },

  /** 重试加载 */
  onTapRetry(): void {
    this.setData({ loading: true, error: false });
    this.initPage();
  },

  /** 切换分类 Tab */
  onTapTab(e: WechatMiniprogram.BaseEvent): void {
    const tab = e.currentTarget.dataset.tab as ClassicCategory;
    if (tab === this.data.activeTab) return;
    const group = this.data.groups.find(g => g.category === tab);
    this.setData({
      activeTab: tab,
      displayItems: group?.items || [],
    });
  },

  /** 点击经典卡片——已完成的可进入，未完成的提示整理中 */
  onTapClassic(e: WechatMiniprogram.BaseEvent): void {
    const id = Number(e.currentTarget.dataset.id);
    const isCompleted = e.currentTarget.dataset.isCompleted as number | undefined;
    if (!id) return;
    if (isCompleted === 1) {
      wx.navigateTo({ url: `/pages/classic-reader/index?id=${id}` });
    } else {
      wx.showToast({ title: '该经典正在整理中，敬请期待', icon: 'none', duration: 2000 });
    }
  },

  /** 点击左上角提示图标 */
  onTapTip(): void {
    wx.showModal({
      title: '经典阅读',
      content: '五十二部传世典籍，按经、史、子、集四部分类，上起商周、下至明清。每部经典附原文、译文、典故注释与生僻字拼音旁注，支持语音播报，助你无障碍通读原典。',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  showLockTip(): void {
    wx.showToast({
      title: '该经典正在整理中，敬请期待',
      icon: 'none',
      duration: 2000,
    });
  },
});
