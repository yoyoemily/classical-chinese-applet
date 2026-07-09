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

export const EDUCATION_STAGES = [
  { key: 'all', label: '全部' },
  { key: 'junior', label: '初中' },
  { key: 'senior', label: '高中' },
] as const;

export const JUNIOR_GRADES = [
  { key: 'all', label: '全部' },
  { key: 'grade7a', label: '七上' },
  { key: 'grade7b', label: '七下' },
  { key: 'grade8a', label: '八上' },
  { key: 'grade8b', label: '八下' },
  { key: 'grade9a', label: '九上' },
  { key: 'grade9b', label: '九下' },
] as const;

export const SENIOR_GRADES = [
  { key: 'all', label: '全部' },
  { key: 'grade10a', label: '高一上' },
  { key: 'grade10b', label: '高一下' },
  { key: 'grade11a', label: '高二上' },
  { key: 'grade11b', label: '高二下' },
  { key: 'grade12a', label: '高三上' },
  { key: 'grade12b', label: '高三下' },
] as const;

/** @deprecated 使用 EDUCATION_STAGES + JUNIOR_GRADES / SENIOR_GRADES 替代 */
export const TEXTBOOK_GRADES = [
  { key: 'all', label: '全部' },
  { key: 'grade7a', label: '七上' },
  { key: 'grade7b', label: '七下' },
  { key: 'grade8a', label: '八上' },
  { key: 'grade8b', label: '八下' },
  { key: 'grade9a', label: '九上' },
  { key: 'grade9b', label: '九下' },
  { key: 'grade10a', label: '高一上' },
  { key: 'grade10b', label: '高一下' },
  { key: 'grade11a', label: '高二上' },
  { key: 'grade11b', label: '高二下' },
  { key: 'grade12a', label: '高三上' },
  { key: 'grade12b', label: '高三下' },
] as const;

// ============================================
// 错题本筛选项
// ============================================
export const MISTAKE_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'frequent', label: '高频错误' },
  { key: 'recent', label: '近期' },
] as const;

/** 错题移出阈值选项（连续答对次数） */
export const MISTAKE_REMOVE_THRESHOLD_OPTIONS = [1, 2, 3] as const;
export const DEFAULT_MISTAKE_REMOVE_THRESHOLD = 3;

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

// ============================================
// 前置步骤提示文案（按词书 category 兜底）
// ============================================
export const PRESTEP_PROMPTS: Record<string, string> = {
  tongjia: '请从句子中找出通假字',
  ancient_modern: '请从句子中找出古今异义词',
  flexible_usage: '请从句子中找出词类活用字',
};
