// ============================================
// 复习间隔（天）
// ============================================
export const EBBINGHAUS_INTERVALS: Record<number, number> = {
  0: 0,   // 当天
  1: 1,   // +1 天
  2: 2,   // +2 天
  3: 4,   // +4 天
  4: 7,   // +7 天
  5: 15,  // +15 天
  6: 30,  // +30 天
};

/** 将复习阶段映射为间隔天数 */
export function getIntervalDays(stage: number): number {
  return EBBINGHAUS_INTERVALS[stage] ?? 30;
}

// ============================================
// 每日学习配置
// ============================================
export const DEFAULT_DAILY_NEW_WORDS = 2;
export const DEFAULT_DAILY_REVIEW_WORDS = 5;
export const MAX_DAILY_REVIEW_LIMIT = 15;

// ============================================
// 等级体系
// ============================================
export const XP_PER_CORRECT = 10;
export const XP_PER_CHECKIN = 20;
export const XP_STREAK_7_BONUS = 50;
export const XP_BADGE_BONUS = 100;

export const RANK_TITLES: string[] = [
  '童生', '秀才', '举人', '贡士', '进士', '探花', '榜眼', '状元', '翰林'
];

/** 每级所需经验 */
export function getLevelXP(level: number): number {
  return 100 * level;
}

/** 根据总 XP 计算等级 */
export function calcLevel(totalXP: number): { level: number; title: string } {
  let remaining = totalXP;
  let lvl = 1;
  while (remaining >= getLevelXP(lvl) && lvl < 50) {
    remaining -= getLevelXP(lvl);
    lvl++;
  }
  const titleIndex = Math.min(Math.floor((lvl - 1) / 6), RANK_TITLES.length - 1);
  return { level: lvl, title: RANK_TITLES[titleIndex] };
}

// ============================================
// 存储 Key
// ============================================
export const STORAGE_KEYS = {
  CURRENT_BOOK: 'currentWordBookId',
  PROGRESS: 'userProgress',
  BADGES: 'userBadges',
  SESSION: 'studySession',
  SETTINGS: 'userSettings',
  CACHED_ANSWERS: 'cachedAnswers',
  USER_PROFILE: 'userProfile',
  TOKEN: 'authToken',
} as const;

// ============================================
// 名篇分类
// ============================================
export const ARTICLE_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'prose', label: '散文' },
  { key: 'argument', label: '论说' },
  { key: 'poem', label: '诗词' },
  { key: 'verse', label: '骈赋' },
] as const;

export const TEXTBOOK_GRADES = [
  { key: 'all', label: '全部' },
  { key: 'grade7a', label: '七上' },
  { key: 'grade7b', label: '七下' },
  { key: 'grade8a', label: '八上' },
  { key: 'grade8b', label: '八下' },
  { key: 'grade9a', label: '九上' },
  { key: 'grade9b', label: '九下' },
] as const;

// ============================================
// 生词本 Tab
// ============================================
export const VOCABULARY_TABS = [
  { key: 'all', label: '全部' },
  { key: 'difficult', label: '困难' },
  { key: 'unclear', label: '模糊' },
  { key: 'familiar', label: '熟悉' },
  { key: 'mastered', label: '掌握' },
] as const;

// ============================================
// 励志诗词库（学习反馈随机展示）
// ============================================
export const ENCOURAGEMENT_POEMS: string[] = [
  '路漫漫其修远兮，吾将上下而求索。——屈原',
  '长风破浪会有时，直挂云帆济沧海。——李白',
  '宝剑锋从磨砺出，梅花香自苦寒来。',
  '书山有路勤为径，学海无涯苦作舟。',
  '博观而约取，厚积而薄发。——苏轼',
  '不积跬步，无以至千里。——荀子',
  '业精于勤，荒于嬉。——韩愈',
  '读书破万卷，下笔如有神。——杜甫',
];
