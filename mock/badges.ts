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
  { id: 'badge_streak_30', name: '三十而立', description: '累计学习 30 天', icon: '🌟', category: 'streak', condition: { type: 'streak', value: 30 } },
  { id: 'badge_streak_100', name: '百尺竿头', description: '累计学习 100 天', icon: '🔮', category: 'streak', condition: { type: 'streak', value: 100 } },
  { id: 'badge_streak_365', name: '破万卷书', description: '累计学习 365 天', icon: '🏆', category: 'streak', condition: { type: 'streak', value: 365 } },
];

/**
 * 检查新获得的勋章（全部为累计学习天数维度）
 */
export function checkNewBadges(
  existingBadges: string[],
  streak: number,
): IBadge[] {
  const earned = new Set(existingBadges);
  return mockBadges.filter(b => {
    if (earned.has(b.id)) return false;
    return streak >= b.condition.value;
  });
}
