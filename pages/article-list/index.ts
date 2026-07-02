import type { IArticle, ArticleCategory } from '../../typings/index.d';
import { fetchArticles } from '../../api/index';
import { ARTICLE_CATEGORIES, TEXTBOOK_GRADES } from '../../constants/config';

interface IArticleDisplay extends IArticle {
  progress: number;
  keywordCount: number;
}

interface IArticleListData {
  activeCategory: string;
  activeTextbook: string;
  articles: IArticleDisplay[];
  categories: readonly { key: string; label: string }[];
  textbooks: readonly { key: string; label: string }[];
  loading: boolean;
}

Page<IArticleListData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeCategory: 'all',
    activeTextbook: 'all',
    articles: [],
    categories: ARTICLE_CATEGORIES,
    textbooks: TEXTBOOK_GRADES,
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

  async loadArticles(category?: string): Promise<void> {
    const cat = category ?? this.data.activeCategory;
    const textbook = this.data.activeTextbook;
    this.setData({ loading: true });

    try {
      const articles: IArticle[] = await fetchArticles(
        cat === 'all' ? undefined : cat,
        textbook === 'all' ? undefined : textbook,
      );

      const displayArticles: IArticleDisplay[] = articles.map((article) => {
        return {
          ...article,
          progress: 0,
          keywordCount: article.relatedWordIds?.length ?? 0,
        };
      });

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

  onTapTextbook(e: WechatMiniprogram.TouchEvent): void {
    const { key } = e.currentTarget.dataset as { key: string };
    if (key === this.data.activeTextbook) return;

    this.setData({ activeTextbook: key });
    this.loadArticles();
  },

  onTapArticle(e: WechatMiniprogram.TouchEvent): void {
    const { id } = e.currentTarget.dataset as { id: string };
    wx.navigateTo({
      url: `/pages/article-reader/index?id=${id}`,
    });
  },
});
