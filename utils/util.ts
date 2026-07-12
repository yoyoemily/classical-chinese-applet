/** 通用工具函数 */

/**
 * 格式化时间
 * @param date - 日期对象或时间戳
 * @param fmt - 格式，默认 'yyyy-MM-dd HH:mm:ss'
 */
export function formatDate(
  date: Date | number,
  fmt: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const d: Date = typeof date === 'number' ? new Date(date) : date;

  const o: Record<string, number> = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'H+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds(),
    'q+': Math.floor((d.getMonth() + 3) / 3),
    S: d.getMilliseconds(),
  };

  let result: string = fmt;
  if (/(y+)/.test(result)) {
    result = result.replace(RegExp.$1, String(d.getFullYear()).slice(4 - RegExp.$1.length));
  }

  for (const [key, val] of Object.entries(o)) {
    if (new RegExp(`(${key})`).test(result)) {
      result = result.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? String(val) : `00${val}`.slice(String(val).length)
      );
    }
  }

  return result;
}

/**
 * 节流
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>): void {
    if (timer) return;
    timer = setTimeout((): void => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 防抖
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout((): void => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 获取全局 App 实例
 */
export function getApp(): WechatMiniprogram.App.Instance<IAppOption> {
  return getApp<IAppOption>();
}

/**
 * 安全解析 JSON
 */
export function safeJSONParse<T = unknown>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * 获取路由参数（字符串，类型安全）
 */
export function getRouterParam(
  options: Record<string, string | undefined> | undefined,
  key: string
): string {
  return options?.[key] ?? '';
}

/**
 * 格式化时间，返回 "HH:mm:ss"
 */
export function formatTime(date: Date | number): string {
  const d: Date = typeof date === 'number' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 生成唯一 ID（简易版）
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 随机取数组元素
 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 随机打乱数组
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生僻字拼音段
 */
export interface IRareCharSegment {
  text: string
  isGlossary: false
  pinyin?: string
}

/**
 * 将普通文本段按生僻字二次切分。
 * 生僻字拆成独立 segment 并携带 pinyin，非生僻字继续合并在普通段中。
 *
 * @param segText 普通文本段的文本
 * @param rareCharPinyin 该句/段的生僻字拼音映射 { "字": "拼音" }
 * @returns 切分后的段数组
 */
export function splitByRareChar(
  segText: string,
  rareCharPinyin?: Record<string, string>
): IRareCharSegment[] {
  if (!rareCharPinyin || Object.keys(rareCharPinyin).length === 0) {
    return [{ text: segText, isGlossary: false }];
  }

  const segments: IRareCharSegment[] = [];
  let plain = '';
  for (const ch of segText) {
    const py = rareCharPinyin[ch];
    if (py) {
      // 生僻字：先刷出累积的普通文本
      if (plain) {
        segments.push({ text: plain, isGlossary: false });
        plain = '';
      }
      // 生僻字单独成段，带拼音
      segments.push({ text: ch, isGlossary: false, pinyin: py });
    } else {
      plain += ch;
    }
  }
  if (plain) {
    segments.push({ text: plain, isGlossary: false });
  }
  return segments;
}
