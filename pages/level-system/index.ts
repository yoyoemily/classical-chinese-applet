// ============================================
// 等级体系页面
// ============================================
import { fetchUserProfile } from '../../api/index';
import { RANK_TITLES, LEVEL_THRESHOLDS } from '../../constants/config';

interface ILevelSystemData {
  level: number;
  title: string;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  ranks: { lv: number; title: string; xpRange: string; isCurrent: boolean; isPassed: boolean }[];
  loading: boolean;
}

Page<ILevelSystemData, WechatMiniprogram.Page.CustomOption>({
  data: {
    level: 1,
    title: '童生',
    totalXP: 0,
    currentLevelXP: 0,
    nextLevelXP: 100,
    progressPercent: 0,
    ranks: [],
    loading: true,
  },

  onLoad(): void {
    this.loadData();
  },

  async loadData(): Promise<void> {
    this.setData({ loading: true });
    try {
      const profile = await fetchUserProfile();
      const level = profile.level || 1;
      const title = profile.title || '童生';
      const totalXP = profile.totalXP || 0;

      // 当前等级的 XP 区间和进度
      const idx = Math.max(0, level - 1);
      const currentLevelMin = LEVEL_THRESHOLDS[idx];
      const currentLevelXP = totalXP - currentLevelMin;
      // 下一级阈值（最后一级用当前阈值 × 1 作为显示占位，实际不会再升级）
      const isMax = idx >= LEVEL_THRESHOLDS.length - 1;
      const nextThreshold = isMax ? currentLevelMin : LEVEL_THRESHOLDS[idx + 1];
      const nextLevelXP = nextThreshold - currentLevelMin;
      const progressPercent = isMax ? 100 : Math.min(Math.round((currentLevelXP / nextLevelXP) * 100), 100);

      // 构建等级表
      const ranks = RANK_TITLES.map((t, i) => {
        const lv = i + 1;
        const minXP = LEVEL_THRESHOLDS[i];
        const isLast = i >= LEVEL_THRESHOLDS.length - 1;
        const xpRange = isLast ? `≥${minXP.toLocaleString()} XP` : `${minXP.toLocaleString()} - ${(LEVEL_THRESHOLDS[i + 1] - 1).toLocaleString()} XP`;
        return {
          lv,
          title: t,
          xpRange,
          isCurrent: lv === level,
          isPassed: lv < level,
        };
      });

      this.setData({
        level,
        title,
        totalXP,
        currentLevelXP,
        nextLevelXP,
        progressPercent,
        ranks,
        loading: false,
      });
    } catch {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
