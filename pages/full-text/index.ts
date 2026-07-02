import { fetchFullText } from '../../api/index';

interface IFullTextData { title: string; author: string; content: string; loading: boolean; isEmpty: boolean; }

Page<IFullTextData, WechatMiniprogram.Page.CustomOption>({
  data: { title: '', author: '', content: '', loading: true, isEmpty: false },
  onLoad(options: Record<string, string | undefined>): void {
    const sid = options.sentenceId || '';
    if (sid) this.load(sid);
    else this.setData({ loading: false, isEmpty: true, content: '参数错误' });
  },
  async load(sentenceId: string): Promise<void> {
    try {
      const result = await fetchFullText(sentenceId);
      if (result) {
        this.setData({ title: result.title, content: result.content, author: result.author, loading: false });
      } else {
        this.setData({ title: '全文', content: '暂无全文内容', loading: false, isEmpty: true });
      }
    } catch {
      this.setData({ title: '全文', content: '加载失败', loading: false, isEmpty: true });
    }
  },
});
