// ============================================
// 系统公告列表页
// ============================================
import type { IAnnouncement } from '../../typings/index.d';
import { fetchAnnouncements } from '../../api/index';
import { setAnnouncementLastReadId } from '../../utils/storage';

interface IAnnouncementItem {
  id: number;
  title: string;
  displayTime: string;
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

  _fullList: [] as IAnnouncement[],

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
      this._fullList = rawList;

      const list: IAnnouncementItem[] = rawList.map(item => ({
        id: item.id,
        title: item.title,
        displayTime: this.formatTime(item.publishTime),
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
    const item = this._fullList[index];
    if (!item) return;

    // 通过 globalData 中转内容，避免 URL 长度限制
    const app = getApp<IAppOption>();
    app.globalData._announcementForDetail = {
      title: item.title,
      content: item.content,
      displayTime: this.formatTime(item.publishTime),
    };

    wx.navigateTo({ url: '/pages/announcement-list/detail/index' });
  },

  // ==========================================
  // 工具方法
  // ==========================================

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const normalized = isoString.replace('T', ' ').substring(0, 19);
    const d = new Date(normalized.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return isoString.substring(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年${m}月${day}日`;
  },
});
