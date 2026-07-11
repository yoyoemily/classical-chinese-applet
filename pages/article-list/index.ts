import type { IArticle, ArticleCategory } from '../../typings/index.d';
import { fetchArticles } from '../../api/index';
import { ARTICLE_CATEGORIES, EDUCATION_STAGES, JUNIOR_GRADES, SENIOR_GRADES } from '../../constants/config';

interface IArticleDisplay extends IArticle {
  progress: number;
  keywordCount: number;
}

interface IArticleListData {
  activeCategory: string;
  activeStage: string;
  activeTextbook: string;
  articles: IArticleDisplay[];
  categories: readonly { key: string; label: string }[];
  stages: readonly { key: string; label: string }[];
  gradeList: readonly { key: string; label: string }[];
  showGradePicker: boolean;
  loading: boolean;
}

Page<IArticleListData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeCategory: 'all',
    activeStage: 'all',
    activeTextbook: 'all',
    articles: [],
    categories: ARTICLE_CATEGORIES,
    stages: EDUCATION_STAGES,
    gradeList: [],
    showGradePicker: false,
    loading: false,
  },

  onLoad(): void {
    this.loadArticles();
  },

  onShow(): void {
    this.loadArticles(this.data.activeCategory);
  },

  onReady(): void {},

  onHide(): void {},

  onUnload(): void {},

  /** 根据学段获取年级列表 */
  getGradeOptions(stage: string): readonly { key: string; label: string }[] {
    if (stage === 'junior') return JUNIOR_GRADES;
    if (stage === 'senior') return SENIOR_GRADES;
    return [];
  },

  async loadArticles(category?: string): Promise<void> {
    const cat = category ?? this.data.activeCategory;
    const textbook = this.data.activeTextbook;
    this.setData({ loading: true });

    try {
      const articles: IArticle[] = await fetchArticles(
        cat === 'all' ? undefined : cat,
        textbook === 'all' ? undefined : textbook,
      );

      const displayArticles: IArticleDisplay[] = articles.map((article) => ({
        ...article,
        progress: 0,
        keywordCount: article.relatedWordIds?.length ?? 0,
      }));

      this.setData({
        articles: displayArticles,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onTapCategory(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeCategory) return;

    this.setData({ activeCategory: key });
    this.loadArticles(key);
  },

  onTapStage(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeStage) return;

    if (key === 'all' || key === 'other') {
      // "全部"/"其他"→年级重置，不弹面板
      this.setData({
        activeStage: key,
        activeTextbook: key === 'other' ? 'other' : 'all',
        gradeList: [],
        showGradePicker: false,
      });
      this.loadArticles();
    } else {
      // "初中"/"高中"→展开年级面板，年级重置为"全部"
      this.setData({
        activeStage: key,
        activeTextbook: 'all',
        gradeList: this.getGradeOptions(key),
        showGradePicker: true,
      });
      this.loadArticles();
    }
  },

  onTapGrade(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeTextbook) {
      this.setData({ showGradePicker: false });
      return;
    }

    this.setData({
      activeTextbook: key,
      showGradePicker: false,
    });
    this.loadArticles();
  },

  /** 关闭年级面板 */
  onCloseGradePicker(): void {
    this.setData({ showGradePicker: false });
  },

  onTapArticle(e: WechatMiniprogram.TouchEvent): void {
    const { id } = e.currentTarget.dataset as { id: string };
    wx.navigateTo({
      url: `/pages/article-reader/index?id=${id}`,
    });
  },
});
