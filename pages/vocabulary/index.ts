// ============================================
// 生词本页面
// ============================================
import { fetchWordBooks, fetchProgress, fetchWordBookDetail } from '../../api/index';
import type { IWordProgress } from '../../typings/index.d';

// ============================================
// 本地类型
// ============================================

/** 掌握等级键值 */
type VocabTab = 'difficult' | 'unclear' | 'familiar' | 'mastered';

/** Tab 项 */
interface IVocabTabItem {
  key: VocabTab;
  label: string;
  count: number;
}

/** 生词本列表项 */
interface IVocabWord {
  entryId: string;
  character: string;
  pinyin: string;
  firstMeaning: string;
  wordBookName: string;
  wordBookId: string;
  classification: VocabTab;
}

interface IVocabularyData {
  activeTab: VocabTab;
  tabs: IVocabTabItem[];
  words: IVocabWord[];
  allWords: IVocabWord[];
  loading: boolean;
}

// ============================================
// 工具函数
// ============================================

/** 与首页 computeDistribution 保持一致的掌握分类逻辑 */
function classifyWord(wp: IWordProgress): VocabTab {
  if (wp.stage === 'done') return 'mastered';
  if (wp.resetCount >= 3) return 'difficult';
  if (wp.wrongCount >= 2) return 'unclear';
  if (typeof wp.stage === 'number' && wp.stage >= 3) return 'familiar';
  return 'unclear';
}

// ============================================
// Page 实例
// ============================================

Page<IVocabularyData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeTab: 'difficult',
    tabs: [
      { key: 'difficult', label: '困难', count: 0 },
      { key: 'unclear', label: '模糊', count: 0 },
      { key: 'familiar', label: '熟悉', count: 0 },
      { key: 'mastered', label: '掌握', count: 0 },
    ],
    words: [],
    allWords: [],
    loading: true,
  },

  onLoad(options: Record<string, string | undefined>): void {
    // 支持从首页分布标签传入初始 tab
    const initTab = options.tab as VocabTab | undefined;
    if (initTab && ['difficult', 'unclear', 'familiar', 'mastered'].includes(initTab)) {
      this.setData({ activeTab: initTab });
    }
    this.loadData();
  },

  // ==========================================
  // 数据加载
  // ==========================================

  async loadData(): Promise<void> {
    this.setData({ loading: true });

    try {
      const books = await fetchWordBooks();
      const initializedBooks = books.filter((b) => b.initialized !== false);

      // 并行拉取每本已初始化词书的进度和详情
      const results = await Promise.all(
        initializedBooks.map(async (book) => {
          try {
            const [progress, detail] = await Promise.all([
              fetchProgress(book.id),
              fetchWordBookDetail(book.id),
            ]);
            return { book, progress, detail } as const;
          } catch {
            return null;
          }
        }),
      );

      // 汇总所有词汇并分类
      const allVocabWords: IVocabWord[] = [];

      for (const result of results) {
        if (!result) continue;
        const { book, progress, detail } = result;

        // 建立 entryId → IWordEntry 索引
        const wordMap = new Map(detail.wordEntries.map((w) => [w.id, w]));

        for (const [entryId, wp] of Object.entries(progress.wordProgresses)) {
          const word = wordMap.get(entryId);
          if (!word) continue;

          const classification = classifyWord(wp);
          allVocabWords.push({
            entryId,
            character: word.character,
            pinyin: word.pinyin,
            firstMeaning: word.keyWordRefs[0]?.definition || '',
            wordBookName: book.name,
            wordBookId: book.id,
            classification,
          });
        }
      }

      // 更新各 tab 的计数
      const counts: Record<VocabTab, number> = {
        difficult: 0,
        unclear: 0,
        familiar: 0,
        mastered: 0,
      };
      allVocabWords.forEach((w) => counts[w.classification]++);

      const tabs = this.data.tabs.map((t) => ({ ...t, count: counts[t.key] }));

      this.setData({
        allWords: allVocabWords,
        words: allVocabWords.filter((w) => w.classification === this.data.activeTab),
        tabs,
        loading: false,
      });
    } catch (err) {
      console.error('加载生词本失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // ==========================================
  // 事件处理
  // ==========================================

  /** 切换 Tab */
  onTapTab(e: WechatMiniprogram.BaseEvent): void {
    const tab = e.currentTarget.dataset.tab as VocabTab;
    if (tab === this.data.activeTab) return;
    this.setData({
      activeTab: tab,
      words: this.data.allWords.filter((w) => w.classification === tab),
    });
  },

  /** 点击词条 → 字总结页 */
  onTapWord(e: WechatMiniprogram.BaseEvent): void {
    const entryId = e.currentTarget.dataset.entryId as string;
    if (!entryId) return;
    wx.navigateTo({ url: `/pages/word-summary/index?entryId=${entryId}` });
  },
});
