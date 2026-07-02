import type { IBadge, IUserBadge } from '../../typings/index.d';
import { fetchBadges } from '../../api/index';

// 精选 8 枚勋章，覆盖连续打卡、学习成就、积累里程碑三个维度
const SELECTED_BADGE_IDS = [
  'badge_streak_3',
  'badge_streak_7',
  'badge_streak_21',
  'badge_streak_60',
  'badge_streak_180',
  'badge_book_1',
  'badge_accuracy_90',
  'badge_total_1000',
];

// 8 种配色主题，对应 8 枚勋章的独立视觉风格
const THEME_MAP: Record<string, string> = {
  badge_streak_3: 'bronze',
  badge_streak_7: 'silver',
  badge_streak_21: 'gold',
  badge_streak_60: 'diamond',
  badge_streak_180: 'royal',
  badge_book_1: 'indigo',
  badge_accuracy_90: 'crimson',
  badge_total_1000: 'emerald',
};

interface IDisplayBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate: string;
  theme: string;
}

interface IBadgesData {
  badges: IDisplayBadge[];
  loading: boolean;
}

Page<IBadgesData, WechatMiniprogram.Page.CustomOption>({
  data: {
    badges: [],
    loading: false,
  },

  onLoad(): void {
    this.load();
  },

  async load(): Promise<void> {
    this.setData({ loading: true });
    try {
      const result = await fetchBadges();
      const userMap = new Map<string, IUserBadge>();
      result.userBadges.forEach(ub => userMap.set(ub.badgeId, ub));

      const displayBadges: IDisplayBadge[] = SELECTED_BADGE_IDS
        .map((id, index) => {
          const b = result.badges.find(badge => badge.id === id);
          if (!b) return null;
          const ub = userMap.get(b.id);
          // 临时：前 2 个展示为已获得，方便预览样式
          const earned = ub ? !!ub : index < 2;
          return {
            id: b.id,
            name: b.name,
            description: b.description,
            icon: b.icon,
            earned,
            earnedDate: ub?.earnedDate || (index < 2 ? '2026-06-28' : ''),
            theme: THEME_MAP[b.id] || 'bronze',
          };
        })
        .filter((b): b is IDisplayBadge => b !== null);

      this.setData({ badges: displayBadges, loading: false });
    } catch {
      this.setData({ loading: false });
    }
  },
});
