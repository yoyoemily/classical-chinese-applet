// ============================================
// 勋章定义 Mock 数据
// ============================================
import type { IBadge } from '../typings/index.d';

export const mockBadges: IBadge[] = [
  // 连续打卡系列
  { id: 'badge_streak_3', name: '初识文言', description: '连续打卡 3 天', icon: '🥉', category: 'streak', condition: { type: 'streak', value: 3 } },
  { id: 'badge_streak_7', name: '日积月累', description: '连续打卡 7 天', icon: '🥈', category: 'streak', condition: { type: 'streak', value: 7 } },
  { id: 'badge_streak_21', name: '持之以恒', description: '连续打卡 21 天', icon: '🥇', category: 'streak', condition: { type: 'streak', value: 21 } },
  { id: 'badge_streak_60', name: '水滴石穿', description: '连续打卡 60 天', icon: '💎', category: 'streak', condition: { type: 'streak', value: 60 } },
  { id: 'badge_streak_180', name: '金石为开', description: '连续打卡 180 天', icon: '👑', category: 'streak', condition: { type: 'streak', value: 180 } },
  // 学习成就系列
  { id: 'badge_book_1', name: '学者', description: '完成 1 本词书', icon: '📖', category: 'achievement', condition: { type: 'book_complete', value: 1 } },
  { id: 'badge_book_3', name: '博学', description: '完成 3 本词书', icon: '📚', category: 'achievement', condition: { type: 'book_complete', value: 3 } },
  { id: 'badge_accuracy_90', name: '一字不漏', description: '某词书正确率超过 90%', icon: '🎯', category: 'achievement', condition: { type: 'accuracy', value: 90 } },
  { id: 'badge_perfect_50', name: '百发百中', description: '连续 50 题全对', icon: '🔥', category: 'achievement', condition: { type: 'streak_correct', value: 50 } },
  // 积累系列
  { id: 'badge_total_100', name: '初出茅庐', description: '累计学习 100 题', icon: '🌱', category: 'milestone', condition: { type: 'total_answers', value: 100 } },
  { id: 'badge_total_500', name: '渐入佳境', description: '累计学习 500 题', icon: '🌿', category: 'milestone', condition: { type: 'total_answers', value: 500 } },
  { id: 'badge_total_1000', name: '博闻强识', description: '累计学习 1000 题', icon: '🌳', category: 'milestone', condition: { type: 'total_answers', value: 1000 } },
];

/**
 * 检查新获得的勋章
 */
export function checkNewBadges(
  existingBadges: string[],
  conditions: { streak: number; completedBooks: number; accuracy: number; streakCorrect: number; totalAnswers: number }
): IBadge[] {
  const earned = new Set(existingBadges);
  return mockBadges.filter(b => {
    if (earned.has(b.id)) return false;
    const { type, value } = b.condition;
    const current = (conditions as Record<string, number>)[
      type === 'streak' ? 'streak' :
      type === 'book_complete' ? 'completedBooks' :
      type === 'accuracy' ? 'accuracy' :
      type === 'streak_correct' ? 'streakCorrect' :
      type === 'total_answers' ? 'totalAnswers' : ''
    ];
    return current !== undefined && current >= value;
  });
}
