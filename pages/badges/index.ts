import type { IBadge, IUserBadge } from '../../typings/index.d';
import { fetchBadges } from '../../api/index';

interface IDisplayBadge { id: string; name: string; description: string; icon: string; earned: boolean; earnedDate: string; }
interface IBadgesData { activeFilter: string; filters: { key: string; label: string }[]; badges: IDisplayBadge[]; loading: boolean; }

Page<IBadgesData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeFilter: 'all', filters: [{key:'all',label:'全部'},{key:'earned',label:'已获得'},{key:'unearned',label:'未获得'}],
    badges: [], loading: false,
  },
  onLoad(): void { this.load(); },
  async load(): Promise<void> {
    this.setData({ loading: true });
    try {
      const result = await fetchBadges();
      const userMap = new Map<string, IUserBadge>();
      result.userBadges.forEach(ub => userMap.set(ub.badgeId, ub));
      const displayBadges: IDisplayBadge[] = result.badges.map(b => {
        const ub = userMap.get(b.id);
        return { id: b.id, name: b.name, description: b.description, icon: ub ? b.icon : '🔒', earned: !!ub, earnedDate: ub?.earnedDate || '' };
      });
      this.setData({ badges: displayBadges, loading: false });
    } catch { this.setData({ loading: false }); }
  },
  onTapFilter(e: WechatMiniprogram.BaseEvent): void {
    const f = e.currentTarget.dataset.filter as string;
    if (f !== this.data.activeFilter) this.setData({ activeFilter: f });
  },
});
