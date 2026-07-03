// ============================================
// 名篇 Mock 数据
// ============================================
import type { IArticle, ArticleCategory, ICharAnnotation } from '../typings/index.d';

/** 文言文常见虚词集合 */
const FUNCTION_WORDS = new Set([
  '之', '乎', '者', '也', '矣', '焉', '哉', '耳', '尔',
  '而', '以', '于', '於', '为', '与', '其', '则', '乃',
  '所', '且', '因', '若', '虽', '然', '夫', '盖', '斯',
  '或', '非', '是', '故', '何', '安', '孰',
]);

/** 中文标点 */
const PUNCT_SET = new Set(['，', '。', '！', '？', '；', '：', '"', '"', '（', '）', '、', '…']);

/**
 * 根据文本和释义映射构建逐字标注数组
 * @param text 原文
 * @param defMap 词语→释义 映射（会自动按最长匹配优先切词），如 { '庆历': '年号', '谪': '贬官降职' }
 */
function buildCharAnnotations(text: string, defMap: Record<string, string>): ICharAnnotation[] {
  const result: ICharAnnotation[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // 标点
    if (PUNCT_SET.has(ch)) {
      result.push({ char: ch, role: 'punct' });
      i++; continue;
    }
    // 尝试最长匹配 key
    let matched = false;
    for (let len = Math.min(4, text.length - i); len >= 1; len--) {
      const token = text.slice(i, i + len);
      if (defMap[token] !== undefined) {
        const definition = defMap[token];
        // 单字且在虚词集合中 → 标记为虚词，否则为实词
        if (len === 1 && FUNCTION_WORDS.has(token)) {
          result.push({ char: token, role: 'function', definition });
        } else {
          result.push({ char: token, role: 'content', definition });
        }
        i += len; matched = true; break;
      }
    }
    // 无匹配：单字推断
    if (!matched) {
      if (FUNCTION_WORDS.has(ch)) {
        result.push({ char: ch, role: 'function' });
      } else {
        result.push({ char: ch, role: 'content' });
      }
      i++;
    }
  }
  return result;
}

const art_001_sentences = [
  {
    text: '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴，乃重修岳阳楼，增其旧制，刻唐贤今人诗赋于其上，属予作文以记之。',
    translation: '庆历四年的春天，滕子京被贬官到巴陵郡做太守。到了第二年，政事顺利，百姓和乐，各种荒废的事业都兴办起来了，于是重新修建岳阳楼，扩大它原有的规模，在上面镌刻唐代名家和当代文人的诗赋，嘱托我写一篇文章来记述这件事。',
    keyWords: [
      { word: '谪', definition: '贬官降职，被流放或降职外调', wordBookId: 'wb_mid_001_01' },
      { word: '属', definition: '通"嘱"，嘱托、嘱咐', wordBookId: 'wb_tjia_002_05' },
    ],
    charAnnotations: buildCharAnnotations(
      '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴，乃重修岳阳楼，增其旧制，刻唐贤今人诗赋于其上，属予作文以记之。',
      {
        '庆历': '宋仁宗年号（1041-1048）',
        '滕子京': '人名，即滕宗谅，范仲淹好友',
        '谪': '贬官降职，被流放或降职外调',
        '守': '做郡守，任地方长官',
        '巴陵郡': '今湖南岳阳一带，古郡名',
        '越': '到了，经过',
        '明年': '第二年',
        '政': '政事，政务',
        '通': '顺利，畅通',
        '人': '百姓',
        '和': '和乐，和睦',
        '百废': '各种荒废了的事业',
        '具': '同"俱"，全、都',
        '兴': '兴办，恢复',
        '乃': '于是，就',
        '重修': '重新修建',
        '岳阳楼': '岳阳城西门楼，江南名楼',
        '增': '扩大，扩建',
        '旧制': '原有的规模形制',
        '刻': '镌刻，雕刻',
        '唐贤': '唐代有名望的人士',
        '今人': '当代的文人墨客',
        '诗赋': '诗歌和辞赋',
        '于': '在，在……之上',
        '其上': '它的上面（指岳阳楼）',
        '属': '通"嘱"，嘱托，嘱咐',
        '予': '我',
        '作文': '写一篇文章',
        '以': '来（表目的）',
        '记': '记述，记载',
        '之': '代词，指重修岳阳楼这件事',
      },
    ),
  },
  {
    text: '予观夫巴陵胜状，在洞庭一湖。衔远山，吞长江，浩浩汤汤，横无际涯，朝晖夕阴，气象万千，此则岳阳楼之大观也，前人之述备矣。',
    translation: '我看那巴陵郡的壮丽景色，全集中在洞庭湖上。它衔接着远方的群山，吞吐着长江的水流，浩浩荡荡，宽广得没有边际，清晨阳光明媚、傍晚天色阴暗，景象变化万千，这就是岳阳楼的雄伟景象啊，前人的记述已经很详尽了。',
    keyWords: [
      { word: '胜状', definition: '胜景，美景，壮丽的景色' },
      { word: '汤汤', definition: '（shāng shāng）水势浩大壮阔的样子' },
      { word: '则', definition: '就，便（表示承接）', wordBookId: 'wb_mid_001_09' },
    ],
    charAnnotations: buildCharAnnotations(
      '予观夫巴陵胜状，在洞庭一湖。衔远山，吞长江，浩浩汤汤，横无际涯，朝晖夕阴，气象万千，此则岳阳楼之大观也，前人之述备矣。',
      {
        '予': '我',
        '观': '看，观赏',
        '夫': '那（发语词，引出议论）',
        '巴陵': '即巴陵郡，今湖南岳阳',
        '胜状': '壮丽景色，美好景致',
        '在': '在于，集中在',
        '洞庭': '洞庭湖，中国第二大淡水湖',
        '一湖': '整个湖面',
        '衔': '衔接，含接',
        '远山': '远处的群山',
        '吞': '吞吐，吞纳',
        '长江': '长江，中国第一大河',
        '浩浩': '水势浩大壮阔的样子',
        '汤汤': '（shāng）水流大而急的样子',
        '横': '宽广，横贯',
        '无际涯': '没有边际，看不到尽头',
        '朝晖': '清晨的阳光',
        '夕阴': '傍晚的昏暗天色',
        '气象': '景象，景色',
        '万千': '千变万化，变化多端',
        '此': '这，指洞庭湖的景色',
        '则': '就，便是（表判断）',
        '岳阳楼': '岳阳城西门名楼',
        '大观': '雄伟壮丽的景象',
        '也': '句末语气词，表判断',
        '前人': '前代的文人',
        '述': '记述，描述',
        '备': '详尽，完备',
        '矣': '了（句末语气词）',
      },
    ),
  },
  {
    text: '若夫淫雨霏霏，连月不开，阴风怒号，浊浪排空，日星隐曜，山岳潜形，商旅不行，樯倾楫摧，薄暮冥冥，虎啸猿啼。登斯楼也，则有去国怀乡，忧谗畏讥，满目萧然，感极而悲者矣。',
    translation: '至于那阴雨连绵不断的日子，接连几个月不放晴，阴冷的风怒号着，浑浊的浪涛冲向天空，太阳和星星隐藏了光辉，山岳也隐没了形体，商人和旅客无法通行，桅杆倒下、船桨折断。这时登上这座楼，就会产生离开国都、怀念家乡，担忧被谗言诽谤、害怕被人讥讽的心情，满眼都是萧条冷落的景象，感慨到了极点而悲伤起来了。',
    keyWords: [
      { word: '薄暮', definition: '傍晚，天色将黑的时候。"薄"意为迫近' },
      { word: '去国', definition: '离开国都，指被贬官外放' },
    ],
  },
  {
    text: '至若春和景明，波澜不惊，上下天光，一碧万顷，沙鸥翔集，锦鳞游泳，岸芷汀兰，郁郁青青。而或长烟一空，皓月千里，浮光跃金，静影沉璧，渔歌互答，此乐何极！登斯楼也，则有心旷神怡，宠辱偕忘，把酒临风，其喜洋洋者矣。',
    translation: '至于春风和煦、日光明媚的时候，湖面波澜平静，上下天光湖色交相辉映，一片碧绿、广阔无垠，沙洲上的白鸥时而飞翔、时而停歇，美丽的鱼儿游来游去。而有时大片的烟雾完全消散，皎洁的月光一泻千里，浮动的月光如跳跃的金子，静静的月影像沉入水中的璧玉，渔夫的歌声互相应答，这种乐趣哪有穷尽！这时登上这座楼，就会感到心胸开阔、精神愉悦，端着酒迎着清风畅饮，那真是喜气洋洋啊。',
    keyWords: [
      { word: '景明', definition: '日光明媚。"景"指日光' },
      { word: '锦鳞', definition: '美丽的鱼。"鳞"借指鱼，以部分代整体' },
      { word: '心旷神怡', definition: '心胸开阔，精神愉悦' },
    ],
  },
  {
    text: '嗟夫！予尝求古仁人之心，或异二者之为，何哉？不以物喜，不以己悲，居庙堂之高则忧其民，处江湖之远则忧其君。是进亦忧，退亦忧。然则何时而乐耶？其必曰"先天下之忧而忧，后天下之乐而乐"乎！噫！微斯人，吾谁与归？',
    translation: '唉！我曾经探求古代品德高尚的人的心思，或许与上面两种表现不同，为什么呢？他们不因外物好坏和自己得失而或喜或悲，在朝廷做官就为百姓担忧，处在偏远的江湖就为君主担忧。这样看来，做官也担忧，退隐也担忧。既然这样，那么什么时候才快乐呢？他们一定会说"在天下人忧愁之前就忧愁，在天下人快乐之后才快乐"吧！唉！如果没有这种人，我同谁一道呢？',
    keyWords: [
      { word: '以', definition: '因为', wordBookId: 'wb_mid_001_03' },
      { word: '庙堂', definition: '指朝廷，帝王处理政事的地方' },
      { word: '则', definition: '就，便（承接）', wordBookId: 'wb_mid_001_09' },
      { word: '微', definition: '如果没有，用于假设否定' },
    ],
  },
];

const art_002_sentences = [
  {
    text: '子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"',
    translation: '孔子说："学习了知识，然后按时温习它，不也是很愉快吗？有志同道合的人从远方来，不也是很快乐吗？别人不了解我，我却不恼怒，不也是有才德的人吗？"',
    keyWords: [
      { word: '而', definition: '连词，表示承接，然后', wordBookId: 'wb_mid_001_01' },
      { word: '之', definition: '代词，它', wordBookId: 'wb_mid_001_02' },
      { word: '说', definition: '通"悦"，愉快', wordBookId: 'wb_tjia_002_01' },
    ],
  },
  {
    text: '子曰："温故而知新，可以为师矣。"',
    translation: '孔子说："温习学过的知识，可以得到新的理解和体会，凭借这一点就可以做老师了。"',
    keyWords: [
      { word: '而', definition: '连词，表示承接', wordBookId: 'wb_mid_001_01' },
      { word: '故', definition: '旧的知识', wordBookId: 'wb_mid_001_07' },
      { word: '为', definition: '做，成为', wordBookId: 'wb_mid_001_05' },
    ],
  },
  {
    text: '子曰："学而不思则罔，思而不学则殆。"',
    translation: '孔子说："只是读书却不思考，就会迷惑而无所得；只是空想却不读书，就会疑惑而无所得。"',
    keyWords: [
      { word: '而', definition: '却（表转折）', wordBookId: 'wb_mid_001_01' },
      { word: '则', definition: '就，便', wordBookId: 'wb_mid_001_09' },
    ],
  },
  {
    text: '子在川上曰："逝者如斯夫，不舍昼夜。"',
    translation: '孔子在河边感叹道："逝去的一切就像这河水一样啊，日夜不停。"',
    keyWords: [
      { word: '逝', definition: '往，离去，消逝' },
      { word: '斯', definition: '这，指河水' },
    ],
  },
];

const art_003_sentences = [
  { text: '岱宗夫如何？', translation: '泰山啊，你究竟有多么雄伟壮丽呢？', keyWords: [{ word: '岱宗', definition: '对泰山的尊称' }] },
  { text: '齐鲁青未了。', translation: '走出齐鲁大地，那苍翠的山色依然没有穷尽。', keyWords: [{ word: '青', definition: '指山色苍翠，郁郁葱葱' }] },
  { text: '造化钟神秀，', translation: '大自然把神奇和秀美都聚集在泰山之上。', keyWords: [{ word: '造化', definition: '指大自然，天地' }, { word: '钟', definition: '聚集，汇集' }] },
  { text: '阴阳割昏晓。', translation: '山南山北因高峻而分割出黄昏和拂晓。', keyWords: [{ word: '阴阳', definition: '山北为阴，山南为阳' }, { word: '割', definition: '分割、分开，极写泰山之高峻' }] },
  { text: '荡胸生曾云，', translation: '望见山中层层升腾的云气，令人心胸激荡。', keyWords: [{ word: '曾', definition: '通"层"，层层叠叠', wordBookId: 'wb_tjia_002_06' }] },
  { text: '决眦入归鸟。', translation: '睁大眼睛极目远望，目送归巢的飞鸟没入山林。', keyWords: [{ word: '决眦', definition: '睁裂眼眶，形容极力张大眼睛远望' }] },
  { text: '会当凌绝顶，', translation: '一定要登上泰山的最高峰。', keyWords: [{ word: '会当', definition: '终当，一定要，应当' }, { word: '凌', definition: '登上，升到高处' }] },
  { text: '一览众山小。', translation: '到那时再看，周围的群山都显得那样矮小了。', keyWords: [{ word: '览', definition: '看，观望，俯瞰' }, { word: '小', definition: '以……为小，觉得……渺小' }] },
];

export const mockArticles: IArticle[] = [
  {
    id: 'art_001', title: '岳阳楼记', author: '范仲淹', dynasty: '北宋', category: 'prose', textbook: 'grade9a',
    sentences: art_001_sentences,
    relatedWordIds: ['wb_mid_001_01', 'wb_mid_001_03', 'wb_mid_001_09', 'wb_tjia_002_05'],
  },
  {
    id: 'art_002', title: '论语四则', author: '孔子', dynasty: '春秋', category: 'argument', textbook: 'grade7a',
    sentences: art_002_sentences,
    relatedWordIds: ['wb_mid_001_01', 'wb_mid_001_02', 'wb_mid_001_05', 'wb_mid_001_07', 'wb_mid_001_09', 'wb_tjia_002_01'],
  },
  {
    id: 'art_003', title: '望岳', author: '杜甫', dynasty: '唐代', category: 'poem', textbook: 'grade7b',
    sentences: art_003_sentences,
    relatedWordIds: ['wb_tjia_002_06'],
  },
  {
    id: 'art_004', title: '滕王阁序（节选）', author: '王勃', dynasty: '唐代', category: 'verse', textbook: 'grade8b',
    sentences: [
      {
        text: '云销雨霁，彩彻区明。落霞与孤鹜齐飞，秋水共长天一色。',
        translation: '云气消散、雨过天晴，阳光普照、天空明朗。晚霞与孤独的野鸭一起飞翔，秋天的江水和辽阔的天空浑然一色。',
        keyWords: [{ word: '销', definition: '通"消"，消散，消失' }, { word: '霁', definition: '雨过天晴' }],
      },
      {
        text: '关山难越，谁悲失路之人？萍水相逢，尽是他乡之客。',
        translation: '关山重重难以逾越，有谁同情迷失道路的人呢？如浮萍在水上偶然相逢，大家都是异乡之客。',
        keyWords: [{ word: '失路', definition: '迷失道路，比喻仕途不得志' }, { word: '萍水相逢', definition: '像浮萍随水漂泊，偶然相遇' }],
      },
    ],
    relatedWordIds: [],
  },
];

export function getArticlesByCategory(category: ArticleCategory | 'all'): IArticle[] {
  if (category === 'all') return mockArticles;
  return mockArticles.filter(a => a.category === category);
}

export function getArticleById(id: string): IArticle | undefined {
  return mockArticles.find(a => a.id === id);
}
