// ============================================
// wordType 工具函数——集中管理 word_type 值映射与显示
// ============================================

/** 数据库存储的 word_type 值 */
export type WordTypeCode = 'shi' | 'xu' | 'tongjia' | 'gujinyi' | 'huoyong';

/** 所有有效的 wordType 码（用于数据库写过解析） */
export const ALL_WORD_TYPES: WordTypeCode[] = ['shi', 'xu', 'tongjia', 'gujinyi', 'huoyong'];

/** 快捷搜索用分组 key（实词+虚词合并） */
export type QuickGroupKey = 'shixu' | 'tongjia' | 'gujinyi' | 'huoyong';

/** wordType → 中文显示名 */
const WORD_TYPE_LABELS: Record<WordTypeCode, string> = {
  shi: '实词',
  xu: '虚词',
  tongjia: '通假字',
  gujinyi: '古今异义',
  huoyong: '词类活用',
};

/** 快捷搜索分组 key → 显示名 */
const GROUP_LABELS: Record<QuickGroupKey, string> = {
  shixu: '实词虚词',
  tongjia: '通假字',
  gujinyi: '古今异义',
  huoyong: '词类活用',
};

/** 快捷搜索分组 key → 图标 */
const GROUP_ICONS: Record<QuickGroupKey, string> = {
  shixu: '📖',
  tongjia: '🔄',
  gujinyi: '⏳',
  huoyong: '⚡',
};

/** 快捷搜索分组展示顺序 */
export const QUICK_GROUP_ORDER: QuickGroupKey[] = ['shixu', 'tongjia', 'huoyong', 'gujinyi'];

/** wordType 码 → 中文显示名 */
export function wordTypeLabel(code: WordTypeCode | string): string {
  return WORD_TYPE_LABELS[code as WordTypeCode] || code || '';
}

/** 快捷搜索分组 key → 中文显示名 */
export function groupLabel(key: QuickGroupKey): string {
  return GROUP_LABELS[key] || key;
}

/** 快捷搜索分组 key → 图标 */
export function groupIcon(key: QuickGroupKey): string {
  return GROUP_ICONS[key] || '';
}

/** 将 wordType 码映射到快捷搜索分组 key */
export function wordTypeToGroupKey(code: WordTypeCode | string | undefined | null): QuickGroupKey | null {
  if (!code) return null;
  if (code === 'shi' || code === 'xu') return 'shixu';
  if (code === 'tongjia') return 'tongjia';
  if (code === 'gujinyi') return 'gujinyi';
  if (code === 'huoyong') return 'huoyong';
  return null;
}
