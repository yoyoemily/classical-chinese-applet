// ============================================
// 经典著作列表页
// ============================================
import type { IClassicItem } from '../../typings/index.d';
import { fetchClassics } from '../../api/index';

type ClassicCategory = '经' | '史' | '子' | '集';

interface IClassicGroup {
  category: ClassicCategory;
  items: IClassicItem[];
}

interface IClassicData {
  activeTab: ClassicCategory;
  groups: IClassicGroup[];
  displayItems: IClassicItem[];
  loading: boolean;
}

/** 硬编码数据作为离线兜底（与后端 source.json 中的 classics 数组保持同步） */
const FALLBACK_CLASSICS: IClassicItem[] = [
  { id: 1,  name: '论语',       era: '春秋',   icon: '📖', description: '孔子及其弟子的言行录，儒家核心经典，以"仁"为本，以"礼"为纲，二十篇记录先贤智慧。', category: '经' },
  { id: 2,  name: '孟子',       era: '战国',   icon: '📜', description: '孟子与其弟子所著，主张"性善论"，倡导"仁政""王道"，雄辩滔滔，气势磅礴。', category: '经' },
  { id: 3,  name: '大学',       era: '春秋',   icon: '📘', description: '原为《礼记》篇目，讲修身、齐家、治国、平天下之道，三纲领八条目，为学次第分明。', category: '经' },
  { id: 4,  name: '中庸',       era: '春秋',   icon: '📙', description: '原为《礼记》篇目，论"中不偏，庸不易"的中庸之道，儒家哲学体系中至为精微的一篇。', category: '经' },
  { id: 5,  name: '周易',       era: '商周',   icon: '☯️', description: '"群经之首"，以六十四卦推演天地消长、人事吉凶，中国哲学的源头活水。', category: '经' },
  { id: 6,  name: '诗经',       era: '周',     icon: '🎵', description: '中国最早的诗歌总集，风、雅、颂、赋、比、兴，三百零五篇歌咏先民的悲欢与礼乐。', category: '经' },
  { id: 7,  name: '尚书',       era: '商周',   icon: '📄', description: '上古历史文献汇编，记言体史书之祖，典、谟、训、诰、誓、命，文辞古奥。', category: '经' },
  { id: 8,  name: '礼记',       era: '战国至汉', icon: '📃', description: '先秦礼制的系统记录，涵盖制度、义理、通论，是理解古代社会与儒家思想的重要门径。', category: '经' },
  { id: 9,  name: '左传',       era: '春秋',   icon: '📜', description: '左丘明著，与《春秋》互为表里的叙事经典，大量成语典故的源头，中考常考选文出处。', category: '经' },
  { id: 10, name: '春秋',       era: '春秋',   icon: '📋', description: '鲁国编年史，孔子笔削，微言大义。左氏、公羊、穀梁三传各阐幽微，影响深远。', category: '经' },
  { id: 11, name: '战国策',     era: '西汉',   icon: '🗂️', description: '刘向编订，战国策士游说之辞与历史故事宝库，画蛇添足、狐假虎威等成语皆出其中。', category: '史' },
  { id: 12, name: '史记',       era: '西汉',   icon: '🏛️', description: '司马迁著，中国第一部纪传体通史，上起黄帝、下至汉武。鲁迅称"史家之绝唱，无韵之离骚"。', category: '史' },
  { id: 13, name: '三国志',     era: '西晋',   icon: '⚔️', description: '陈寿著，纪传体断代史，分魏、蜀、吴三书，三国历史最权威的原始记载。', category: '史' },
  { id: 14, name: '汉书',       era: '东汉',   icon: '📚', description: '班固著，中国第一部纪传体断代史，记西汉一朝二百三十年，开正史断代体例之先河。', category: '史' },
  { id: 15, name: '后汉书',     era: '南朝宋', icon: '📑', description: '范晔著，记东汉近二百年。与《史记》《汉书》《三国志》合称"前四史"。', category: '史' },
  { id: 16, name: '资治通鉴',   era: '北宋',   icon: '🪞', description: '司马光主编，二百九十四卷编年体通史，"鉴前世之兴衰，考当今之得失"。', category: '史' },
  { id: 17, name: '荀子',       era: '战国',   icon: '📚', description: '儒家重要一脉，主张"性恶论"与"化性起伪"，《劝学篇》为教材必背篇目，地位不亚于孟子。', category: '子' },
  { id: 18, name: '老子',       era: '春秋',   icon: '🌿', description: '道家根本经典，道法自然、无为而治，五千余言说尽天地玄机与人生智慧。', category: '子' },
  { id: 19, name: '庄子',       era: '战国',   icon: '🦋', description: '道家瑰宝，逍遥游、齐物论、养生主……汪洋恣肆的文字下，是对精神自由的极致追求。', category: '子' },
  { id: 20, name: '韩非子',     era: '战国',   icon: '⚖️', description: '法家集大成者，以法治国、法术势结合，犀利冷峻的笔锋直指人性和权力的本质。', category: '子' },
  { id: 21, name: '墨子',       era: '战国',   icon: '🛡️', description: '墨家经典，兼爱、非攻、尚贤、尚同，先秦最富实践精神的思想体系。', category: '子' },
  { id: 22, name: '孙子兵法',   era: '春秋',   icon: '🗡️', description: '孙武著，兵家圣典，"不战而屈人之兵，善之善者也"，十三篇影响遍及军事与商界。', category: '子' },
  { id: 23, name: '吕氏春秋',   era: '秦',     icon: '📙', description: '吕不韦门客合著，杂家经典，一字千金典故出处，融汇诸子百家，先秦思想的集大成之作。', category: '子' },
  { id: 24, name: '鬼谷子',     era: '战国',   icon: '🎭', description: '纵横家经典，捭阖、反应、揣摩、权谋之术的源头，战国游说策士的理论利器。', category: '子' },
  { id: 25, name: '说文解字',   era: '东汉',   icon: '🔤', description: '许慎著，中国第一部系统分析汉字字形与来源的文字学巨著，学古文必备的工具书之祖。', category: '子' },
  { id: 26, name: '黄帝内经',   era: '战国至汉', icon: '🌱', description: '中医理论奠基之作，阴阳五行、脏腑经络、养生诊治，天人合一的东方医学哲学。', category: '子' },
  { id: 27, name: '楚辞',       era: '战国至汉', icon: '🌊', description: '屈原、宋玉等楚地诗人的辞赋总集，"路漫漫其修远兮"开创了中国浪漫主义文学的先河。', category: '集' },
  { id: 28, name: '唐诗三百首', era: '清',     icon: '🏔️', description: '蘅塘退士编选，收录唐代七十七家三百一十一首诗，"熟读唐诗三百首，不会作诗也会吟"。', category: '集' },
  { id: 29, name: '宋词三百首', era: '清',     icon: '🌸', description: '朱祖谋编选，荟萃两宋词人精华，苏轼、辛弃疾、李清照、柳永，宋词之美尽在其中。', category: '集' },
  { id: 30, name: '乐府诗集',   era: '北宋',   icon: '🎶', description: '郭茂倩编，收录汉魏至五代乐府歌辞百卷，民间声诗与文人拟作交相辉映。', category: '集' },
  { id: 31, name: '全唐诗',     era: '唐',     icon: '📚', description: '四万八千余首唐诗总汇，李白、杜甫、王维、白居易……盛唐气象，尽在其中。', category: '集' },
  { id: 32, name: '古文观止',   era: '清',     icon: '📖', description: '吴楚材、吴调侯编选，收录先秦至明末散文精华二百二十二篇，是古文入门的绝佳读本。', category: '集' },
  { id: 33, name: '世说新语',   era: '南朝宋', icon: '💬', description: '刘义庆编，魏晋名士的言行轶事集，一部"名士教科书"，风度与智慧，跃然纸上。', category: '集' },
  { id: 34, name: '梦溪笔谈',   era: '北宋',   icon: '🔬', description: '沈括著，中国古代百科全书式的笔记，涵盖天文地理数学生物，科学精神与人文关怀兼具。', category: '集' },
  { id: 35, name: '聊斋志异',   era: '清',     icon: '👻', description: '蒲松龄著，"刺贪刺虐入木三分"，花妖狐媚、鬼怪神异，文言短篇小说的巅峰。', category: '集' },
  { id: 36, name: '山海经',     era: '战国至汉', icon: '🐉', description: '上古奇书，山川地理与神话传说交织，夸父逐日、精卫填海、大禹治水……想象力无远弗届。', category: '集' },
];

const CATEGORY_TABS: { key: ClassicCategory; label: string; count: number }[] = [
  { key: '经', label: '经部', count: 10 },
  { key: '史', label: '史部', count: 6 },
  { key: '子', label: '子部', count: 10 },
  { key: '集', label: '集部', count: 10 },
];

function buildGroups(items: IClassicItem[]): IClassicGroup[] {
  return CATEGORY_TABS.map(tab => ({
    category: tab.key,
    items: items.filter(c => c.category === tab.key),
  }));
}

Page<IClassicData, WechatMiniprogram.Page.CustomOption>({
  data: {
    activeTab: '经',
    groups: buildGroups(FALLBACK_CLASSICS),
    displayItems: FALLBACK_CLASSICS.filter(c => c.category === '经'),
    loading: true,
  },

  onLoad(): void {
    this.initPage();
  },

  async initPage(): Promise<void> {
    try {
      const items = await fetchClassics();
      if (items && items.length > 0) {
        const groups = buildGroups(items);
        this.setData({
          groups,
          displayItems: groups.find(g => g.category === this.data.activeTab)?.items || items,
          loading: false,
        });
        return;
      }
    } catch (_) {
      // API 请求失败，使用硬编码兜底数据
    }
    this.setData({ loading: false });
  },

  /** 切换分类 Tab */
  onTapTab(e: WechatMiniprogram.BaseEvent): void {
    const tab = e.currentTarget.dataset.tab as ClassicCategory;
    if (tab === this.data.activeTab) return;
    const group = this.data.groups.find(g => g.category === tab);
    this.setData({
      activeTab: tab,
      displayItems: group?.items || [],
    });
  },

  /** 点击经典卡片——阅读板块尚未开放 */
  onTapClassic(): void {
    this.showLockTip();
  },

  /** 点击左上角提示图标 */
  onTapTip(): void {
    wx.showModal({
      title: '经典阅读',
      content: '三十六部传世典籍，涵盖经史子集四部，上起商周、下至明清。阅读古籍经典需极强的文言功底，请务必深度学习掌握全部字词后再开始。届时您已深通文言，可畅游古典原典世界。',
      showCancel: false,
      confirmText: '我知道了',
    });
  },


  showLockTip(): void {
    wx.showToast({
      title: '经典阅读尚未开放',
      icon: 'none',
      duration: 2000,
    });
  },
});
