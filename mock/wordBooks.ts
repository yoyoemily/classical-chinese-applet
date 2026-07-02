// ============================================
// 词书 Mock 数据 — 中考实词精选 & 通假字集训
// ============================================
import type { IWordBook } from '../typings/index.d';

export const mockWordBooks: IWordBook[] = [
  {
    id: 'wb_middle_001',
    name: '中考实词精选',
    description: '收录中考必考高频文言实词，涵盖一词多义核心考点，每个词配有真实典籍例句与实战题目。',
    category: 'middle_school',
    coverColor: '#4a6a5e',
    totalWords: 10,
    words: [
      {
        id: 'wb_mid_001_01',
        character: '而',
        pinyin: 'ér',
        radical: '而',
        strokes: 6,
        structure: '独体',
        meanings: [
          { partOfSpeech: '连词', definition: '表示并列关系，可译为"和""又""并且"', example: '敏而好学，不耻下问。——《论语·公冶长》' },
          { partOfSpeech: '连词', definition: '表示转折关系，可译为"却""但是""然而"', example: '学而不思则罔，思而不学则殆。——《论语·为政》' },
          { partOfSpeech: '连词', definition: '表示承接关系，可译为"就""然后""接着"', example: '温故而知新，可以为师矣。——《论语·为政》' },
          { partOfSpeech: '连词', definition: '表示修饰关系，连接状语和中心语，可译为"地""着"或不译', example: '河曲智叟笑而止之曰。——《愚公移山》' },
        ],
        sentences: [
          { id: 's_001_01_1', text: '学而不思则罔，思而不学则殆。', source: '《论语·为政》', translation: '只学习而不思考就会迷惑，只思考而不学习就会疑惑。', targetWord: '而', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['和，又，并且', '地，着', '就，然后'], fullText: '子曰："学而不思则罔，思而不学则殆。"' },
          { id: 's_001_01_2', text: '温故而知新，可以为师矣。', source: '《论语·为政》', translation: '温习旧的知识，进而能有新的体会，就可以做老师了。', targetWord: '而', correctMeaningIndex: 2, difficulty: 'basic', distractors: ['却，但是', '和，又', '地，着'], fullText: '子曰："温故而知新，可以为师矣。"' },
          { id: 's_001_01_3', text: '河曲智叟笑而止之曰："甚矣，汝之不惠！"', source: '《愚公移山》', translation: '河曲智叟笑着阻止他说："你也太不聪明了！"', targetWord: '而', correctMeaningIndex: 3, difficulty: 'medium', distractors: ['却，但是', '就，然后', '和，又'], fullText: '河曲智叟笑而止之曰："甚矣，汝之不惠！以残年余力，曾不能毁山之一毛，其如土石何？"' },
        ],
        similarHomophones: ['尔', '耳', '儿'],
        similarShapes: ['面', '耐', '耍'],
        mnemonic: '而字本义是胡须，后借用为连词。记住四个主要用法：并列又，转折却，承接就，修饰着。',
      },
      {
        id: 'wb_mid_001_02',
        character: '之',
        pinyin: 'zhī',
        radical: '丶',
        strokes: 3,
        structure: '独体',
        meanings: [
          { partOfSpeech: '代词', definition: '作第三人称代词，可译为"他/她/它"或"他们"', example: '学而时习之，不亦说乎？——《论语·学而》' },
          { partOfSpeech: '助词', definition: '结构助词，用在定语和中心语之间，相当于"的"', example: '此诚危急存亡之秋也。——《出师表》' },
          { partOfSpeech: '助词', definition: '用在主谓之间，取消句子独立性，不译', example: '予独爱莲之出淤泥而不染。——《爱莲说》' },
          { partOfSpeech: '动词', definition: '到，往，去', example: '辍耕之垄上。——《陈涉世家》' },
        ],
        sentences: [
          { id: 's_001_02_1', text: '学而时习之，不亦说乎？', source: '《论语·学而》', translation: '学习了然后按时温习它，不也很愉快吗？', targetWord: '之', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['的', '去，往', '无实义，取消句子独立性'], fullText: '子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"' },
          { id: 's_001_02_2', text: '予独爱莲之出淤泥而不染。', source: '《爱莲说》', translation: '我唯独喜爱莲花从淤泥中长出却不被污染。', targetWord: '之', correctMeaningIndex: 2, difficulty: 'medium', distractors: ['他/她/它', '的', '去，往'], fullText: '予独爱莲之出淤泥而不染，濯清涟而不妖，中通外直，不蔓不枝，香远益清，亭亭净植，可远观而不可亵玩焉。' },
          { id: 's_001_02_3', text: '辍耕之垄上。', source: '《陈涉世家》', translation: '停止耕作走到田垄上。', targetWord: '之', correctMeaningIndex: 3, difficulty: 'medium', distractors: ['他/她/它', '的', '无实义，取消句子独立性'], fullText: '陈涉少时，尝与人佣耕，辍耕之垄上，怅恨久之，曰："苟富贵，无相忘。"' },
        ],
        similarHomophones: ['知', '枝', '芝', '支'],
        similarShapes: ['乏', '辶'],
        mnemonic: '之字像一个脚印，本义是"往、去"。记住：动词"去"，代词"它"，助词"的"或"取消独立性"。',
      },
      {
        id: 'wb_mid_001_03',
        character: '以',
        pinyin: 'yǐ',
        radical: '人',
        strokes: 4,
        structure: '左右',
        meanings: [
          { partOfSpeech: '介词', definition: '用，拿，把，凭借', example: '以刀劈狼首。——《狼》' },
          { partOfSpeech: '介词', definition: '因为，由于', example: '不以物喜，不以己悲。——《岳阳楼记》' },
          { partOfSpeech: '连词', definition: '表示目的，可译为"来""用来""以便"', example: '属予作文以记之。——《岳阳楼记》' },
          { partOfSpeech: '动词', definition: '认为，以为', example: '皆以美于徐公。——《邹忌讽齐王纳谏》' },
        ],
        sentences: [
          { id: 's_001_03_1', text: '以刀劈狼首。', source: '《狼》', translation: '用刀劈砍狼的头。', targetWord: '以', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['因为', '来，用来', '认为'], fullText: '屠暴起，以刀劈狼首，又数刀毙之。方欲行，转视积薪后，一狼洞其中，意将隧入以攻其后也。' },
          { id: 's_001_03_2', text: '不以物喜，不以己悲。', source: '《岳阳楼记》', translation: '不因为外物的好坏而高兴，不因为自己的得失而悲伤。', targetWord: '以', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['用，凭借', '来，用来', '认为'], fullText: '嗟夫！予尝求古仁人之心，或异二者之为，何哉？不以物喜，不以己悲，居庙堂之高则忧其民，处江湖之远则忧其君。' },
          { id: 's_001_03_3', text: '皆以美于徐公。', source: '《邹忌讽齐王纳谏》', translation: '都认为比徐公美。', targetWord: '以', correctMeaningIndex: 3, difficulty: 'medium', distractors: ['用，凭借', '因为', '来，用来'], fullText: '明日，徐公来，孰视之，自以为不如；窥镜而自视，又弗如远甚。暮寝而思之，曰："吾妻之美我者，私我也；妾之美我者，畏我也；客之美我者，欲有求于我也。"' },
        ],
        similarHomophones: ['已', '矣', '乙'],
        similarShapes: ['似', '拟', '从'],
      },
      {
        id: 'wb_mid_001_04',
        character: '于',
        pinyin: 'yú',
        radical: '一',
        strokes: 3,
        structure: '独体',
        meanings: [
          { partOfSpeech: '介词', definition: '在，到，从，对，向（引出时间、地点、对象）', example: '战于长勺。——《曹刿论战》' },
          { partOfSpeech: '介词', definition: '表示比较，相当于"比"', example: '皆以美于徐公。——《邹忌讽齐王纳谏》' },
          { partOfSpeech: '介词', definition: '表示被动，相当于"被"', example: '吾长见笑于大方之家。——《庄子·秋水》' },
        ],
        sentences: [
          { id: 's_001_04_1', text: '战于长勺。', source: '《曹刿论战》', translation: '在长勺作战。', targetWord: '于', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['比', '被', '到，去'], fullText: '十年春，齐师伐我。公将战，曹刿请见。其乡人曰："肉食者谋之，又何间焉？"刿曰："肉食者鄙，未能远谋。"乃入见。问："何以战？"公曰："衣食所安，弗敢专也，必以分人。"对曰："小惠未徧，民弗从也。"' },
          { id: 's_001_04_2', text: '皆以美于徐公。', source: '《邹忌讽齐王纳谏》', translation: '都认为比徐公美。', targetWord: '于', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['在', '被', '对于'], fullText: '明日，徐公来，孰视之，自以为不如；窥镜而自视，又弗如远甚。暮寝而思之，曰："吾妻之美我者，私我也；妾之美我者，畏我也；客之美我者，欲有求于我也。"' },
        ],
        similarHomophones: ['余', '鱼', '渔', '俞'],
        similarShapes: ['干', '千', '十'],
      },
      {
        id: 'wb_mid_001_05',
        character: '为',
        pinyin: 'wéi',
        radical: '丶',
        strokes: 4,
        structure: '独体',
        meanings: [
          { partOfSpeech: '动词', definition: '做，干，成为，当作（读wéi）', example: '温故而知新，可以为师矣。——《论语·为政》' },
          { partOfSpeech: '介词', definition: '替，给，为了（读wèi）', example: '为人谋而不忠乎？——《论语·学而》' },
          { partOfSpeech: '介词', definition: '被（读wéi）', example: '茅屋为秋风所破歌。——杜甫' },
        ],
        sentences: [
          { id: 's_001_05_1', text: '温故而知新，可以为师矣。', source: '《论语·为政》', translation: '温习旧知识进而能有新体会，就可以做老师了。', targetWord: '为', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['替，给，为了', '被', '是'], fullText: '子曰："温故而知新，可以为师矣。"' },
          { id: 's_001_05_2', text: '为人谋而不忠乎？', source: '《论语·学而》', translation: '替别人办事是不是尽心竭力了呢？', targetWord: '为', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['做，成为', '被', '是'], fullText: '曾子曰："吾日三省吾身：为人谋而不忠乎？与朋友交而不信乎？传不习乎？"' },
        ],
        similarHomophones: ['唯', '维', '围'],
        similarShapes: ['办', '力', '加'],
      },
      {
        id: 'wb_mid_001_06', character: '乃', pinyin: 'nǎi', radical: '丿', strokes: 2, structure: '独体',
        meanings: [
          { partOfSpeech: '副词', definition: '于是，就，这才', example: '乃悟前狼假寐。——《狼》' },
          { partOfSpeech: '副词', definition: '竟然，却（表示出乎意料）', example: '问今是何世，乃不知有汉。——《桃花源记》' },
        ],
        sentences: [
          { id: 's_001_06_1', text: '乃悟前狼假寐，盖以诱敌。', source: '《狼》', translation: '这才明白前面那只狼假装睡觉，原来是为了引诱敌人。', targetWord: '乃', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['竟然，却', '是，就是', '你'], fullText: '少时，一狼径去，其一犬坐于前。久之，目似瞑，意暇甚。屠暴起，以刀劈狼首，又数刀毙之。方欲行，转视积薪后，一狼洞其中。乃悟前狼假寐，盖以诱敌。' },
          { id: 's_001_06_2', text: '问今是何世，乃不知有汉，无论魏晋。', source: '《桃花源记》', translation: '问现在是什么朝代，竟然不知道有汉朝，更不用说魏晋了。', targetWord: '乃', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['于是，就', '是，就是', '你'], fullText: '自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间隔。问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。' },
        ],
        similarHomophones: ['奶', '奈'], similarShapes: ['及', '仍'],
      },
      {
        id: 'wb_mid_001_07', character: '故', pinyin: 'gù', radical: '攵', strokes: 9, structure: '左右',
        meanings: [
          { partOfSpeech: '连词', definition: '所以，因此', example: '故天将降大任于是人也。——《生于忧患，死于安乐》' },
          { partOfSpeech: '名词', definition: '原因，缘故', example: '公问其故。——《曹刿论战》' },
          { partOfSpeech: '形容词', definition: '旧的，原来的，从前的', example: '温故而知新。——《论语·为政》' },
        ],
        sentences: [
          { id: 's_001_07_1', text: '故天将降大任于是人也，必先苦其心志。', source: '《生于忧患，死于安乐》', translation: '所以上天将要下达重大使命给这个人。', targetWord: '故', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['原因，缘故', '旧的，原来的', '故意'], fullText: '故天将降大任于是人也，必先苦其心志，劳其筋骨，饿其体肤，空乏其身，行拂乱其所为，所以动心忍性，曾益其所不能。' },
          { id: 's_001_07_2', text: '温故而知新。', source: '《论语·为政》', translation: '温习旧的知识，进而能有新的体会。', targetWord: '故', correctMeaningIndex: 2, difficulty: 'basic', distractors: ['所以，因此', '原因，缘故', '故意'], fullText: '子曰："温故而知新，可以为师矣。"' },
        ],
        similarHomophones: ['顾', '固'], similarShapes: ['做', '敌'],
      },
      {
        id: 'wb_mid_001_08', character: '且', pinyin: 'qiě', radical: '一', strokes: 5, structure: '独体',
        meanings: [
          { partOfSpeech: '副词', definition: '将要，将近', example: '年且九十。——《愚公移山》' },
          { partOfSpeech: '连词', definition: '并且，而且，况且（表示递进）', example: '且焉置土石？——《愚公移山》' },
        ],
        sentences: [
          { id: 's_001_08_1', text: '北山愚公者，年且九十。', source: '《愚公移山》', translation: '北山有个叫愚公的人，年纪将近九十岁了。', targetWord: '且', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['暂且', '而且，况且', '一边……一边……'], fullText: '太行、王屋二山，方七百里，高万仞。本在冀州之南，河阳之北。北山愚公者，年且九十，面山而居。' },
          { id: 's_001_08_2', text: '且焉置土石？', source: '《愚公移山》', translation: '况且把土石放到哪里去呢？', targetWord: '且', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['将要，将近', '暂且', '况且'], fullText: '以君之力，曾不能损魁父之丘，如太行、王屋何？且焉置土石？' },
        ],
        similarHomophones: ['切', '窃'], similarShapes: ['目', '旦', '具'],
      },
      {
        id: 'wb_mid_001_09', character: '则', pinyin: 'zé', radical: '刂', strokes: 6, structure: '左右',
        meanings: [
          { partOfSpeech: '连词', definition: '就，便（表示承接）', example: '学而不思则罔。——《论语·为政》' },
          { partOfSpeech: '连词', definition: '如果（表示假设）', example: '入则无法家拂士，出则无敌国外患者，国恒亡。——《生于忧患，死于安乐》' },
        ],
        sentences: [
          { id: 's_001_09_1', text: '学而不思则罔，思而不学则殆。', source: '《论语·为政》', translation: '只学习而不思考就会迷惑，只思考而不学习就会疑惑。', targetWord: '则', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['如果', '却', '就是'], fullText: '子曰："学而不思则罔，思而不学则殆。"' },
          { id: 's_001_09_2', text: '入则无法家拂士，出则无敌国外患者，国恒亡。', source: '《生于忧患，死于安乐》', translation: '如果在国内没有守法度的大臣，在国外没有敌对的国家，国家常常会灭亡。', targetWord: '则', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['就，便', '却', '准则，法则'], fullText: '入则无法家拂士，出则无敌国外患者，国恒亡。然后知生于忧患，而死于安乐也。' },
        ],
        similarHomophones: ['责', '泽', '择'], similarShapes: ['侧', '测', '厕'],
      },
      {
        id: 'wb_mid_001_10', character: '虽', pinyin: 'suī', radical: '虫', strokes: 9, structure: '上下',
        meanings: [
          { partOfSpeech: '连词', definition: '即使，纵使（表示假设让步）', example: '虽我之死，有子存焉。——《愚公移山》' },
          { partOfSpeech: '连词', definition: '虽然（表示转折）', example: '故余虽愚，卒获有所闻。——《送东阳马生序》' },
        ],
        sentences: [
          { id: 's_001_10_1', text: '虽我之死，有子存焉。', source: '《愚公移山》', translation: '即使我死了，还有儿子在呀。', targetWord: '虽', correctMeaningIndex: 0, difficulty: 'basic', distractors: ['虽然', '即使这样', '跟随'], fullText: '虽我之死，有子存焉；子又生孙，孙又生子；子又有子，子又有孙；子子孙孙无穷匮也，而山不加增，何苦而不平？' },
          { id: 's_001_10_2', text: '故余虽愚，卒获有所闻。', source: '《送东阳马生序》', translation: '所以我虽然愚笨，但最终还是获得了一些学识。', targetWord: '虽', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['即使，纵使', '跟随', '纵然'], fullText: '故余虽愚，卒获有所闻。当余之从师也，负箧曳屣，行深山巨谷中，穷冬烈风，大雪深数尺，足肤皲裂而不知。' },
        ],
        similarHomophones: ['随', '隋'], similarShapes: ['强', '虫'],
      },
    ],
  },
  {
    id: 'wb_tongjia_002',
    name: '通假字集训',
    description: '收录中高考必考的高频通假字，每个字包含本义与通假义，配备真实古籍例句，助你一举攻克通假字难题。',
    category: 'tongjia',
    coverColor: '#c9a96e',
    totalWords: 6,
    words: [
      {
        id: 'wb_tjia_002_01', character: '说', pinyin: 'shuō', radical: '讠', strokes: 9, structure: '左右',
        meanings: [
          { partOfSpeech: '动词', definition: '说话，讲述，说明', example: '及郡下，诣太守，说如此。——《桃花源记》' },
          { partOfSpeech: '通假字', definition: '通"悦"，高兴，愉快（读yuè）', example: '学而时习之，不亦说乎？——《论语·学而》' },
        ],
        sentences: [
          { id: 's_002_01_1', text: '学而时习之，不亦说乎？', source: '《论语·学而》', translation: '学习了然后按时温习它，不也很愉快吗？', targetWord: '说', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['说话，讲述', '说服，劝说', '高兴地说话'], fullText: '子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"' },
          { id: 's_002_01_2', text: '秦王不说。', source: '《唐雎不辱使命》', translation: '秦王不高兴。', targetWord: '说', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['说话', '怒骂', '说服'], fullText: '秦王不说。安陵君因使唐雎使于秦。秦王谓唐雎曰："寡人以五百里之地易安陵，安陵君不听寡人，何也？"' },
        ],
        similarHomophones: ['悦', '阅', '越'], similarShapes: ['悦', '脱', '税'],
        mnemonic: '说字通"悦"时读yuè，表示心中高兴——心里高兴自然喜悦。',
      },
      {
        id: 'wb_tjia_002_02', character: '反', pinyin: 'fǎn', radical: '又', strokes: 4, structure: '半包围',
        meanings: [
          { partOfSpeech: '形容词', definition: '相反的，对立的', example: '知其一，不知其反。' },
          { partOfSpeech: '通假字', definition: '通"返"，返回，归来', example: '寒暑易节，始一反焉。——《愚公移山》' },
        ],
        sentences: [
          { id: 's_002_02_1', text: '寒暑易节，始一反焉。', source: '《愚公移山》', translation: '冬夏换季的时候，才回家一次。', targetWord: '反', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['相反的，对立的', '反对，反抗', '相反的方向回家'], fullText: '寒暑易节，始一反焉。河曲智叟笑而止之曰："甚矣，汝之不惠！以残年余力，曾不能毁山之一毛，其如土石何？"' },
          { id: 's_002_02_2', text: '经纶世务者，窥谷忘反。', source: '《与朱元思书》', translation: '治理政务的人，看到这些山谷就流连忘返。', targetWord: '反', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['反对', '相反', '反而'], fullText: '鸢飞戾天者，望峰息心；经纶世务者，窥谷忘反。横柯上蔽，在昼犹昏；疏条交映，有时见日。' },
        ],
        similarHomophones: ['返', '范'], similarShapes: ['友', '发', '及'],
      },
      {
        id: 'wb_tjia_002_03', character: '见', pinyin: 'jiàn', radical: '见', strokes: 4, structure: '上下',
        meanings: [
          { partOfSpeech: '动词', definition: '看见，看到', example: '见渔人，乃大惊。——《桃花源记》' },
          { partOfSpeech: '通假字', definition: '通"现"，显现，出现，表现（读xiàn）', example: '风吹草低见牛羊。——《敕勒歌》' },
        ],
        sentences: [
          { id: 's_002_03_1', text: '风吹草低见牛羊。', source: '《敕勒歌》', translation: '风吹过，草低下去，显露出牛羊来。', targetWord: '见', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['看见，看到', '发现', '看见了牛羊'], fullText: '敕勒川，阴山下。天似穹庐，笼盖四野。天苍苍，野茫茫，风吹草低见牛羊。' },
          { id: 's_002_03_2', text: '何时眼前突兀见此屋，吾庐独破受冻死亦足！', source: '《茅屋为秋风所破歌》', translation: '什么时候眼前能出现这样的房子！', targetWord: '见', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['看见', '见到', '让我看见'], fullText: '安得广厦千万间，大庇天下寒士俱欢颜！风雨不动安如山。呜呼！何时眼前突兀见此屋，吾庐独破受冻死亦足！' },
        ],
        similarHomophones: ['现', '件', '建'], similarShapes: ['贝', '兄', '视'],
        mnemonic: '见通"现"，读xiàn。最经典的"风吹草低见牛羊"——草低头，牛羊显现出来。',
      },
      {
        id: 'wb_tjia_002_04', character: '被', pinyin: 'bèi', radical: '衤', strokes: 10, structure: '左右',
        meanings: [
          { partOfSpeech: '介词', definition: '表示被动', example: '信而见疑，忠而被谤。——《史记·屈原列传》' },
          { partOfSpeech: '通假字', definition: '通"披"，穿，披着（读pī）', example: '将军身被坚执锐。——《陈涉世家》' },
        ],
        sentences: [
          { id: 's_002_04_1', text: '将军身被坚执锐，伐无道，诛暴秦。', source: '《陈涉世家》', translation: '将军亲自穿着坚固的盔甲，拿着锐利的武器。', targetWord: '被', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['表示被动', '被子', '穿着被子'], fullText: '将军身被坚执锐，伐无道，诛暴秦，复立楚国之社稷，功宜为王。' },
          { id: 's_002_04_2', text: '同舍生皆被绮绣。', source: '《送东阳马生序》', translation: '同宿舍的同学都穿着华丽的丝绸衣服。', targetWord: '被', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['被动', '被子', '被绣花'], fullText: '同舍生皆被绮绣，戴朱缨宝饰之帽，腰白玉之环，左佩刀，右备容臭，烨然若神人。' },
        ],
        similarHomophones: ['披', '备', '背'], similarShapes: ['披', '彼', '波'],
      },
      {
        id: 'wb_tjia_002_05', character: '属', pinyin: 'shǔ', radical: '尸', strokes: 12, structure: '半包围',
        meanings: [
          { partOfSpeech: '动词', definition: '隶属，归属，属于', example: '有良田美池桑竹之属。——《桃花源记》' },
          { partOfSpeech: '通假字', definition: '通"嘱"，嘱托，托付（读zhǔ）', example: '属予作文以记之。——《岳阳楼记》' },
        ],
        sentences: [
          { id: 's_002_05_1', text: '属予作文以记之。', source: '《岳阳楼记》', translation: '嘱托我写一篇文章来记述这件事。', targetWord: '属', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['隶属，属于', '亲属', '属于我的'], fullText: '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴，乃重修岳阳楼，增其旧制，刻唐贤今人诗赋于其上，属予作文以记之。' },
          { id: 's_002_05_2', text: '有良田美池桑竹之属。', source: '《桃花源记》', translation: '有肥沃的田地、美丽的池塘以及桑树竹子之类。', targetWord: '属', correctMeaningIndex: 0, difficulty: 'medium', distractors: ['通"嘱"，嘱托', '委托', '嘱托之类'], fullText: '土地平旷，屋舍俨然，有良田美池桑竹之属。阡陌交通，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫，并怡然自乐。' },
        ],
        similarHomophones: ['嘱', '主'], similarShapes: ['嘱', '屡', '屠'],
      },
      {
        id: 'wb_tjia_002_06', character: '曾', pinyin: 'céng', radical: '曰', strokes: 12, structure: '上中下',
        meanings: [
          { partOfSpeech: '副词', definition: '曾经', example: '曾是以为孝乎？——《论语·为政》' },
          { partOfSpeech: '通假字', definition: '通"层"，重叠', example: '荡胸生曾云。——杜甫《望岳》' },
        ],
        sentences: [
          { id: 's_002_06_1', text: '荡胸生曾云，决眦入归鸟。', source: '杜甫《望岳》', translation: '层层云气在胸中激荡，睁大眼睛目送归鸟入山。', targetWord: '曾', correctMeaningIndex: 1, difficulty: 'basic', distractors: ['曾经', '姓曾', '曾经有云'], fullText: '岱宗夫如何？齐鲁青未了。造化钟神秀，阴阳割昏晓。荡胸生曾云，决眦入归鸟。会当凌绝顶，一览众山小。' },
          { id: 's_002_06_2', text: '曾益其所不能。', source: '《生于忧患，死于安乐》', translation: '增加他所不具备的能力。', targetWord: '曾', correctMeaningIndex: 1, difficulty: 'medium', distractors: ['曾经', '姓曾', '不曾'], fullText: '故天将降大任于是人也，必先苦其心志，劳其筋骨，饿其体肤，空乏其身，行拂乱其所为，所以动心忍性，曾益其所不能。' },
        ],
        similarHomophones: ['层'], similarShapes: ['增', '憎', '赠'],
      },
    ],
  },
];
