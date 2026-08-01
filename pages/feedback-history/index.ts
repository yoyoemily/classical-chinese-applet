// ============================================
// 我的反馈历史页面
// ============================================
import type { IFeedbackListItem, IFeedbackDetail } from '../../typings/index.d';
import { fetchMyFeedback, fetchFeedbackDetail, markFeedbackRead } from '../../api/index';

interface IFeedbackHistoryData {
  list: IFeedbackListItem[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  pageSize: number;
  /** 当前展开详情的反馈 */
  selectedFeedback: IFeedbackDetail | null;
  showDetail: boolean;
  detailLoading: boolean;
}

Page<IFeedbackHistoryData, WechatMiniprogram.Page.CustomOption>({
  data: {
    list: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    selectedFeedback: null,
    showDetail: false,
    detailLoading: false,
  },

  onLoad(): void {
    this.loadList();
  },

  onShow(): void {
    // 首次进入不重复加载，onLoad 已处理
    if (this.data.list.length > 0) {
      this.loadList(true);
    }
  },

  /** 下拉刷新 */
  onPullDownRefresh(): void {
    this.loadList(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /** 触底加载更多 */
  onReachBottom(): void {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  /** 加载列表（reset=true 时重置到第一页） */
  async loadList(reset = false): Promise<void> {
    if (this.data.loading) return;
    this.setData({ loading: true });

    const page = reset ? 1 : this.data.page;
    try {
      const result = await fetchMyFeedback({ page, pageSize: this.data.pageSize });
      this.setData({
        list: reset ? result.list : [...this.data.list, ...result.list],
        total: result.total,
        page,
        hasMore: result.hasMore,
        loading: false,
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** 加载下一页 */
  async loadMore(): Promise<void> {
    const nextPage = this.data.page + 1;
    this.setData({ page: nextPage });
    await this.loadList();
  },

  /** 点击反馈卡片展开详情 */
  async onTapFeedback(e: WechatMiniprogram.BaseEvent): Promise<void> {
    const id = e.currentTarget.dataset.id as number;
    if (this.data.detailLoading) return;

    this.setData({ detailLoading: true, showDetail: true });

    try {
      const detail = await fetchFeedbackDetail(id);
      this.setData({ selectedFeedback: detail, detailLoading: false });

      // 已处理未读 → 自动标记已读
      if (detail.resolved === 1 && !detail.readAt) {
        try {
          await markFeedbackRead(id);
          // 更新列表中对应项的 readAt
          const list = this.data.list.map(item => {
            if (item.id === id) {
              return { ...item, readAt: new Date().toISOString() };
            }
            return item;
          });
          this.setData({ list });
        } catch {
          // 静默失败，不阻塞用户查看
        }
      }
    } catch {
      this.setData({ detailLoading: false });
      wx.showToast({ title: '加载详情失败', icon: 'none' });
    }
  },

  /** 关闭详情弹层 */
  onCloseDetail(): void {
    this.setData({ showDetail: false, selectedFeedback: null });
  },

  /** 阻止弹层点击穿透 */
  onStopPropagation(): void {
    // 空方法，仅用于 catchtap 阻止冒泡
  },
});
