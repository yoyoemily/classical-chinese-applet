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
  { id: 1,  name: '论语',       era: '春秋',   icon: '📖', description: '孔子及其弟子的言行录，儒家核心经典，以"仁"为本，以"礼"为纲，二十篇记录先贤智慧。', category: '经', loadMode: 'chunked', navMode: 'accordion' },
  { id: 2,  name: '孟子',       era: '战国',   icon: '📜', description: '孟子与其弟子所著，主张"性善论"，倡导"仁政""王道"，雄辩滔滔，气势磅礴。', category: '经', loadMode: 'chunked', navMode: 'accordion' },
  { id: 3,  name: '大学',       era: '春秋',   icon: '📘', description: '原为《礼记》篇目，讲修身、齐家、治国、平天下之道，三纲领八条目，为学次第分明。', category: '经', loadMode: 'full', navMode: 'strip' },
  { id: 4,  name: '中庸',       era: '春秋',   icon: '📙', description: '原为《礼记》篇目，论"中不偏，庸不易"的中庸之道，儒家哲学体系中至为精微的一篇。', category: '经', loadMode: 'full', navMode: 'list' },
  { id: 5,  name: '周易',       era: '商周',   icon: '☯️', description: '"群经之首"，以六十四卦推演天地消长、人事吉凶，中国哲学的源头活水。', category: '经', loadMode: 'chunked', navMode: 'list' },
  { id: 6,  name: '诗经',       era: '周',     icon: '🎵', description: '中国最早的诗歌总集，风、雅、颂、赋、比、兴，三百零五篇歌咏先民的悲欢与礼乐。', category: '经', loadMode: 'chunked', navMode: 'accordion' },

  { id: 8,  name: '礼记',       era: '战国至汉', icon: '📃', description: '先秦礼制的系统记录，涵盖制度、义理、通论，是理解古代社会与儒家思想的重要门径。', category: '经', loadMode: 'chunked', navMode: 'list' },
  { id: 9,  name: '左传',       era: '春秋',   icon: '📜', description: '左丘明著，与《春秋》互为表里的叙事经典，大量成语典故的源头，中考常考选文出处。', category: '经', loadMode: 'chunked', navMode: 'accordion' },
  { id: 38, name: '孝经',       era: '春秋',   icon: '📕', description: '十三经之一，专论孝道，仅十八章约一千八百字。"夫孝，德之本也"，儒家伦理的基石，与中学生德育高度契合。', category: '经', loadMode: 'full', navMode: 'strip' },
  { id: 43, name: '三字经',     era: '南宋',   icon: '📗', description: '传统蒙学第一书，三字一句、朗朗上口。"人之初，性本善"，中国学生人人会背的启蒙经典。', category: '经', loadMode: 'full', navMode: 'strip' },
  { id: 44, name: '千字文',     era: '南朝梁', icon: '📘', description: '一千个不重复的汉字编成二百五十句四言韵文，涵盖天文地理历史伦理，构思之精巧古今无双。', category: '经', loadMode: 'full', navMode: 'strip' },


  { id: 11, name: '战国策',     era: '西汉',   icon: '🗂️', description: '刘向编订，战国策士游说之辞与历史故事宝库，画蛇添足、狐假虎威等成语皆出其中。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 12, name: '史记',       era: '西汉',   icon: '🏛️', description: '司马迁著，中国第一部纪传体通史，上起黄帝、下至汉武。鲁迅称"史家之绝唱，无韵之离骚"。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 13, name: '三国志',     era: '西晋',   icon: '⚔️', description: '陈寿著，纪传体断代史，分魏、蜀、吴三书，三国历史最权威的原始记载。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 14, name: '汉书',       era: '东汉',   icon: '📚', description: '班固著，中国第一部纪传体断代史，记西汉一朝二百三十年，开正史断代体例之先河。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 15, name: '后汉书',     era: '南朝宋', icon: '📑', description: '范晔著，记东汉近二百年。与《史记》《汉书》《三国志》合称"前四史"。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 16, name: '资治通鉴',   era: '北宋',   icon: '🪞', description: '司马光主编，二百九十四卷编年体通史，"鉴前世之兴衰，考当今之得失"。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 39, name: '国语',       era: '春秋',   icon: '📖', description: '中国最早的国别史，与《左传》并称"左国"。召公谏厉王弭谤、叔向贺贫等名篇密集，叙事生动。', category: '史', loadMode: 'chunked', navMode: 'accordion' },
  { id: 53, name: '水经注',     era: '北魏',   icon: '🌊', description: '郦道元注《水经》，地理与文学交融的双经典。三峡等名篇已入教材，山水描写堪称古文典范。', category: '史', loadMode: 'chunked', navMode: 'list' },
  { id: 54, name: '徐霞客游记', era: '明',     icon: '🏔️', description: '明代旅行文学巅峰，徐霞客三十四年足迹遍神州的考察实录。语言鲜活，比正史更贴近生活。', category: '史', loadMode: 'chunked', navMode: 'list' },
  { id: 17, name: '荀子',       era: '战国',   icon: '📚', description: '儒家重要一脉，主张"性恶论"与"化性起伪"，《劝学篇》为教材必背篇目，地位不亚于孟子。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 18, name: '老子',       era: '春秋',   icon: '🌿', description: '道家根本经典，道法自然、无为而治，五千余言说尽天地玄机与人生智慧。', category: '子', loadMode: 'full', navMode: 'list' },
  { id: 19, name: '庄子',       era: '战国',   icon: '🦋', description: '道家瑰宝，逍遥游、齐物论、养生主……汪洋恣肆的文字下，是对精神自由的极致追求。', category: '子', loadMode: 'chunked', navMode: 'accordion' },
  { id: 20, name: '韩非子',     era: '战国',   icon: '⚖️', description: '法家集大成者，以法治国、法术势结合，犀利冷峻的笔锋直指人性和权力的本质。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 21, name: '墨子',       era: '战国',   icon: '🛡️', description: '墨家经典，兼爱、非攻、尚贤、尚同，先秦最富实践精神的思想体系。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 22, name: '孙子兵法',   era: '春秋',   icon: '🗡️', description: '孙武著，兵家圣典，"不战而屈人之兵，善之善者也"，十三篇影响遍及军事与商界。', category: '子', loadMode: 'full', navMode: 'strip' },
  { id: 23, name: '吕氏春秋',   era: '秦',     icon: '📙', description: '吕不韦门客合著，杂家经典，一字千金典故出处。每篇短文独立，政论养生无所不包，碎片阅读友好。', category: '子', loadMode: 'chunked', navMode: 'accordion' },
  { id: 24, name: '鬼谷子',     era: '战国',   icon: '🎭', description: '纵横家经典，捭阖、反应、揣摩、权谋之术的源头。社交识人、谈判沟通——社会人士的职场智慧宝典。', category: '子', loadMode: 'full', navMode: 'strip' },


  { id: 26, name: '黄帝内经',   era: '战国至汉', icon: '🌱', description: '中医理论奠基之作，阴阳五行、脏腑经络、养生诊治，天人合一的东方医学哲学。', category: '子', loadMode: 'chunked', navMode: 'accordion' },
  { id: 37, name: '列子',       era: '战国',   icon: '🦅', description: '道家三经之一，名篇密度极高：愚公移山、杞人忧天、朝三暮四、夸父逐日——全是课本常客。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 40, name: '颜氏家训',   era: '北齐',   icon: '📝', description: '中国第一部系统家训，颜之推著。论学论教论处世，与"帮助中学生掌握文言文"的定位天然吻合。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 45, name: '淮南子',     era: '西汉',   icon: '🌌', description: '西汉道家集大成，刘安编著。女娲补天、后羿射日、共工怒触不周山——神话寓言的宝库。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 46, name: '晏子春秋',   era: '春秋',   icon: '💡', description: '晏婴故事集，"橘逾淮为枳""二桃杀三士"等名篇，篇幅短小、机智幽默，适合中学生阅读。', category: '子', loadMode: 'chunked', navMode: 'accordion' },
  { id: 47, name: '菜根谭',     era: '明',     icon: '🥬', description: '洪应明著格言体小品，一句话一条，极短极精。"咬得菜根，百事可做"，适合碎片化阅读。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 58, name: '围炉夜话',   era: '清',     icon: '🔥', description: '与《菜根谭》并称"处世奇书"，王永彬著。184则冬夜围炉闲聊式的短论，每则两三句话，温润如老友对谈。', category: '子', loadMode: 'chunked', navMode: 'list' },
  { id: 27, name: '楚辞',       era: '战国至汉', icon: '🌊', description: '屈原、宋玉等楚地诗人的辞赋总集，"路漫漫其修远兮"开创了中国浪漫主义文学的先河。', category: '集', loadMode: 'full', navMode: 'strip' },
  { id: 28, name: '唐诗三百首', era: '清',     icon: '🏔️', description: '蘅塘退士编选，收录唐代七十七家三百一十一首诗，"熟读唐诗三百首，不会作诗也会吟"。', category: '集', loadMode: 'chunked', navMode: 'author' },
  { id: 29, name: '宋词三百首', era: '清',     icon: '🌸', description: '朱祖谋编选，荟萃两宋词人精华，苏轼、辛弃疾、李清照、柳永，宋词之美尽在其中。', category: '集', loadMode: 'chunked', navMode: 'author' },
  { id: 30, name: '乐府诗集',   era: '北宋',   icon: '🎶', description: '郭茂倩编，收录汉魏至五代乐府歌辞百卷，民间声诗与文人拟作交相辉映。', category: '集', loadMode: 'chunked', navMode: 'accordion' },

  { id: 32, name: '古文观止',   era: '清',     icon: '📖', description: '吴楚材、吴调侯编选，收录先秦至明末散文精华二百二十二篇，是古文入门的绝佳读本。', category: '集', loadMode: 'chunked', navMode: 'author' },
  { id: 33, name: '世说新语',   era: '南朝宋', icon: '💬', description: '刘义庆编，魏晋名士的言行轶事集，一部"名士教科书"，风度与智慧，跃然纸上。', category: '集', loadMode: 'chunked', navMode: 'accordion' },

  { id: 35, name: '聊斋志异',   era: '清',     icon: '👻', description: '蒲松龄著，"刺贪刺虐入木三分"，花妖狐媚、鬼怪神异，文言短篇小说的巅峰。', category: '集', loadMode: 'chunked', navMode: 'list' },
  { id: 36, name: '山海经',     era: '战国至汉', icon: '🐉', description: '上古奇书，山川地理与神话传说交织，夸父逐日、精卫填海、大禹治水……想象力无远弗届。', category: '集', loadMode: 'chunked', navMode: 'accordion' },
  { id: 34, name: '梦溪笔谈',   era: '北宋',   icon: '🔬', description: '沈括著，中国科学精神的巅峰。石油、活字印刷、指南针偏角——北宋已有人类最早的科技笔记。', category: '集', loadMode: 'chunked', navMode: 'accordion' },
  { id: 41, name: '文选',       era: '南朝梁', icon: '📚', description: '中国现存最早的诗文总集，萧统编。收录一百三十位作家七百余篇，"文选烂，秀才半"，文学价值无可替代。', category: '集', loadMode: 'chunked', navMode: 'author' },
  { id: 42, name: '元曲三百首', era: '清',     icon: '🎭', description: '补全"唐诗→宋词→元曲"诗歌演进链。关汉卿、马致远、白朴、郑光祖，散曲与杂剧精华尽收。', category: '集', loadMode: 'chunked', navMode: 'author' },
  { id: 48, name: '西厢记',     era: '元',     icon: '💕', description: '王实甫著，元杂剧巅峰。张生与崔莺莺的爱情故事，"愿天下有情人终成眷属"，句句锦绣。', category: '集', loadMode: 'chunked', navMode: 'accordion' },
  { id: 49, name: '牡丹亭',     era: '明',     icon: '🪷', description: '汤显祖著，明传奇最高成就。杜丽娘因情而死、因情而生，"情不知所起，一往而深"。', category: '集', loadMode: 'chunked', navMode: 'accordion' },

  { id: 55, name: '浮生六记',   era: '清',     icon: '🌸', description: '沈复自传体散文，记闺房之乐、闲情之趣、坎坷之愁、浪游之快。语言洗练真挚，古文过渡阅读的绝佳之选。', category: '集', loadMode: 'chunked', navMode: 'list' },
  { id: 56, name: '曾国藩家书', era: '清',     icon: '✉️', description: '曾国藩写给家人的二百余封书信，谈做人做事治学养生。切口极小格局极大——清代最成功的普通人逆袭指南。', category: '集', loadMode: 'chunked', navMode: 'list' },
  { id: 57, name: '陶渊明集',   era: '东晋',   icon: '🌾', description: '"归去来兮，田园将芜胡不归"——中国隐逸诗人之宗。读陶渊明，读的是每个人心中"我想回去"的最早版本。', category: '集', loadMode: 'chunked', navMode: 'list' },
  { id: 59, name: '韩愈文集',   era: '唐',     icon: '✍️', description: '古文运动旗帜。《师说》《马说》《进学解》——"世有伯乐，然后有千里马"，社会人士读来感触截然不同。', category: '集', loadMode: 'chunked', navMode: 'list' },
];

const CATEGORY_TABS: { key: ClassicCategory; label: string; count: number }[] = [
  { key: '经', label: '经部', count: 11 },
  { key: '史', label: '史部', count: 9 },
  { key: '子', label: '子部', count: 15 },
  { key: '集', label: '集部', count: 17 },
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

  /** 点击经典卡片——已有 loadMode 的表示已开放，否则提示整理中 */
  onTapClassic(e: WechatMiniprogram.BaseEvent): void {
    const id = Number(e.currentTarget.dataset.id);
    const loadMode = e.currentTarget.dataset.loadMode as string | undefined;
    if (!id) return;
    if (loadMode) {
      wx.navigateTo({ url: `/pages/classic-reader/index?id=${id}` });
    } else {
      wx.showToast({ title: '该经典正在整理中，敬请期待', icon: 'none', duration: 2000 });
    }
  },

  /** 点击左上角提示图标 */
  onTapTip(): void {
    wx.showModal({
      title: '经典阅读',
      content: '五十二部传世典籍，按经、史、子、集四部分类，上起商周、下至明清。每部经典附原文、译文、典故注释与生僻字拼音旁注，支持语音播报，助你无障碍通读原典。',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  showLockTip(): void {
    wx.showToast({
      title: '该经典正在整理中，敬请期待',
      icon: 'none',
      duration: 2000,
    });
  },
});
