import type { IArticle, ArticleCategory } from '../../typings/index.d';
import { fetchArticles } from '../../api/index';
import { ARTICLE_CATEGORIES, TEXTBOOK_GRADES } from '../../constants/config';

interface IArticleDisplay extends IArticle {
  progress: number;
  keywordCount: number;
  gradeLabel: string;
}

interface IArticleListData {
  activeCategory: string;
  activeTextbook: string;
  gradeLabel: string;
  articles: IArticleDisplay[];
  categories: readonly { key: string; label: string }[];
  allGrades: readonly { key: string; label: string }[];
  showGradeDropdown: boolean;
  loading: boolean;
}

Page<IArticleListData, WechatMiniprogram.Page.CustomOption>({
  _loading: false,

  data: {
    activeCategory: 'all',
    activeTextbook: 'all',
    gradeLabel: '年级',
    articles: [],
    categories: ARTICLE_CATEGORIES,
    allGrades: TEXTBOOK_GRADES,
    showGradeDropdown: false,
    loading: false,
  },

  onLoad(): void {
    this.loadArticles();
  },

  onShow(): void {
    this.loadArticles();
  },

  onReady(): void {},

  onHide(): void {},

  onUnload(): void {},

  /** 根据 activeTextbook 获取标签文案 */
  computeGradeLabel(textbook: string): string {
    if (textbook === 'all') return '年级';
    const grade = TEXTBOOK_GRADES.find(g => g.key === textbook);
    return grade ? grade.label : '年级';
  },

  async loadArticles(category?: string): Promise<void> {
    if (this._loading) return;
    const cat = category ?? this.data.activeCategory;
    const textbook = this.data.activeTextbook;
    this._loading = true;
    this.setData({ loading: true });

    try {
      const articles: IArticle[] = await fetchArticles(
        cat === 'all' ? undefined : cat,
        textbook === 'all' ? undefined : textbook,
      );

      const displayArticles: IArticleDisplay[] = articles.map((article) => ({
        ...article,
        progress: 0,
        keywordCount: article.keywordCount ?? 0,
        gradeLabel: article.textbook
          ? (TEXTBOOK_GRADES.find(g => g.key === article.textbook)?.label || '')
          : '',
      }));

      this.setData({
        articles: displayArticles,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      this._loading = false;
    }
  },

  onTapCategory(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeCategory) return;

    this.setData({ activeCategory: key });
    this.loadArticles(key);
  },

  /** 切换年级下拉面板 */
  onToggleGradeDropdown(): void {
    this.setData({ showGradeDropdown: !this.data.showGradeDropdown });
  },

  /** 选择年级 */
  onSelectGrade(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeTextbook) {
      this.setData({ showGradeDropdown: false });
      return;
    }

    this.setData({
      activeTextbook: key,
      gradeLabel: this.computeGradeLabel(key),
      showGradeDropdown: false,
    });
    this.loadArticles();
  },

  /** 关闭年级下拉面板 */
  onCloseGradeDropdown(): void {
    this.setData({ showGradeDropdown: false });
  },

  onTapArticle(e: WechatMiniprogram.TouchEvent): void {
    const { id } = e.currentTarget.dataset as { id: string };
    wx.navigateTo({
      url: `/pages/article-reader/index?id=${id}`,
    });
  },
});
