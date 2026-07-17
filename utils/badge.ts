// ============================================
// 勋章计算工具
// ============================================
import type { IBadge } from '../typings/index.d';

export interface NextBadgeInfo {
  name: string;
  icon: string;
  gap: number;
  gapLabel: string;
  percent: number;
}

/**
 * 计算下一枚可获得的勋章
 * @param currentStreak 当前连续打卡天数
 * @param badges 全部勋章定义
 * @param userBadgeIds 用户已获得的勋章 ID 集合
 * @returns 下一个勋章信息，全部获得后返回 null
 */
export function computeNextBadge(
  currentStreak: number,
  badges: IBadge[],
  userBadgeIds: Set<string>,
): NextBadgeInfo | null {
  const unearned = badges.filter(b => !userBadgeIds.has(b.id));
  if (unearned.length === 0) return null;

  let bestGap = Infinity;
  let bestBadge: IBadge | null = null;
  for (const badge of unearned) {
    const target = badge.condition.value;
    const gap = Math.max(0, target - currentStreak);
    if (gap < bestGap) {
      bestGap = gap;
      bestBadge = badge;
    }
  }

  if (!bestBadge) return null;

  const target = bestBadge.condition.value;
  const percent = target > 0 ? Math.min(Math.round((currentStreak / target) * 100), 100) : 100;
  return {
    name: bestBadge.name,
    icon: bestBadge.icon,
    gap: bestGap,
    gapLabel: bestGap === 0 ? '即将获得' : '天',
    percent,
  };
}
