// ============================================
// 系统公告列表页
// ============================================
import { fetchAnnouncements } from '../../api/index';
import { setAnnouncementLastReadId } from '../../utils/storage';

interface IAnnouncementItem {
  id: number;
  title: string;
  displayTime: string;
  isPinned: boolean;
}

interface IAnnouncementListData {
  list: IAnnouncementItem[];
  loading: boolean;
}

Page<IAnnouncementListData, WechatMiniprogram.Page.CustomOption>({
  data: {
    list: [],
    loading: true,
  },

  // ==========================================
  // 生命周期
  // ==========================================

  onLoad(): void {
    this.loadAnnouncements();
  },

  // ==========================================
  // 数据加载
  // ==========================================

  async loadAnnouncements(): Promise<void> {
    this.setData({ loading: true });

    try {
      const rawList = await fetchAnnouncements();
      const list: IAnnouncementItem[] = rawList.map(item => ({
        id: item.id,
        title: item.title,
        displayTime: item.publishTime,
        isPinned: !!item.isPinned,
      }));

      this.setData({ list, loading: false });

      if (rawList.length > 0) {
        const maxId = Math.max(...rawList.map(item => item.id));
        setAnnouncementLastReadId(maxId);
      }
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // ==========================================
  // 点击事件
  // ==========================================

  onTapItem(e: WechatMiniprogram.TouchEvent): void {
    const index = Number(e.currentTarget.dataset.index);
    const id = this.data.list[index]?.id;
    if (!id) return;

    wx.navigateTo({ url: `/pages/announcement-list/detail/index?id=${id}` });
  },
});
