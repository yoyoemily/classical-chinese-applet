// ============================================
// 勋章定义 Mock 数据
// ============================================
import type { IBadge } from '../typings/index.d';

export const mockBadges: IBadge[] = [
  // 连续打卡系列
  { id: 'badge_streak_3', name: '初识文言', description: '累计学习 3 天', icon: '🥉', category: 'streak', condition: { type: 'streak', value: 3 } },
  { id: 'badge_streak_7', name: '日积月累', description: '累计学习 7 天', icon: '🥈', category: 'streak', condition: { type: 'streak', value: 7 } },
  { id: 'badge_streak_21', name: '持之以恒', description: '累计学习 21 天', icon: '🥇', category: 'streak', condition: { type: 'streak', value: 21 } },
  { id: 'badge_streak_60', name: '水滴石穿', description: '累计学习 60 天', icon: '💎', category: 'streak', condition: { type: 'streak', value: 60 } },
  { id: 'badge_streak_180', name: '金石为开', description: '累计学习 180 天', icon: '👑', category: 'streak', condition: { type: 'streak', value: 180 } },
  // 坚持打卡系列
  { id: 'badge_streak_30', name: '渐入佳境', description: '累计学习 30 天', icon: '🌟', category: 'streak', condition: { type: 'streak', value: 30 } },
  { id: 'badge_streak_100', name: '百尺竿头', description: '累计学习 100 天', icon: '🔮', category: 'streak', condition: { type: 'streak', value: 100 } },
  { id: 'badge_streak_365', name: '破万卷书', description: '累计学习 365 天', icon: '🏆', category: 'streak', condition: { type: 'streak', value: 365 } },
];

/**
 * 检查新获得的勋章（返回第一枚达标勋章，每天最多一枚）
 */
export function checkNewBadge(
  existingBadgeIds: string[],
  streak: number,
): IBadge | null {
  const earned = new Set(existingBadgeIds);
  // 按 conditionValue 升序排列的勋章列表中找到第一枚达标且未获得的
  const sorted = [...mockBadges].sort((a, b) => a.condition.value - b.condition.value);
  for (const b of sorted) {
    if (!earned.has(b.id) && streak >= b.condition.value) {
      return b;
    }
  }
  return null;
}
