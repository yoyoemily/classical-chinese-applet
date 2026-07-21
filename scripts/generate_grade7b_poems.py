#!/usr/bin/env python3
"""为七下 12 首新增诗词创建典故注释文件并导入数据库。"""

import json, os, sys, subprocess, glob

GLOSSARY_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/典故注释")
BASE_URL = "http://localhost:8080"

GLOSSARIES = {
    "art_097": {
        "articleId": "art_097", "title": "竹里馆",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "幽篁", "definition": "幽深的竹林。“篁”（huáng），竹林。屈原《九歌·山鬼》“余处幽篁兮终不见天”是最早用“幽篁”写竹林的经典用例"},
                {"word": "长啸", "definition": "撮口发出悠长清越的声音，类似今日的口哨。魏晋名士常以“啸”抒怀，阮籍曾在苏门山对隐士孙登长啸。王维此处的“长啸”不同于阮籍的愤懑，而更多地体现为闲适自得的隐逸情怀"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "深林", "definition": "与首句“幽篁”相呼应，指辋川别墅中的竹林。王维晚年隐居终南山辋川，在《山中与裴秀才迪书》中详细描写过这片“深林”"},
                {"word": "明月来相照", "definition": "明月是中国古典诗歌中最常见的意象之一。王维此处的明月不是远在天边的冷月，而是“来相照”——主动来照耀诗人。“相”字用得极妙：表面是“互相”，实则是“偏指一方”——明月照我、而非我照明月"}
            ]}
        ]
    },
    "art_098": {
        "articleId": "art_098", "title": "春夜洛城闻笛",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "洛城", "definition": "即洛阳，唐代的东都。洛阳与长安并列为唐代两大都市，武则天时期曾改洛阳为“神都”。李白一生多次旅居洛阳，与杜甫的第一次见面也在此地"},
                {"word": "玉笛", "definition": "精美的笛子。“玉”字形容笛子的精美华贵，未必真为玉制。唐诗中“玉笛”往往与春夜、明月相伴——“暗”字暗示笛声来自暗处，更增添了夜色中缥缈虚幻的美感"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "折柳", "definition": "即《折杨柳》，汉乐府横吹曲名，内容多表达离愁别绪。古人送别时有折柳相赠的习俗——“柳”谐“留”音，折柳赠别意为“留下”"},
                {"word": "故园", "definition": "故乡，家园。李白出生于碎叶（今吉尔吉斯斯坦境内），五岁时随父迁居四川江油。此处“故园”当指蜀中故乡或客居的洛阳，与“何人不起”的普遍性感慨相呼应——思乡是人类共通的情感"}
            ]}
        ]
    },
    "art_099": {
        "articleId": "art_099", "title": "逢入京使",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "故园", "definition": "指长安。岑参祖籍南阳，但家在长安（今陕西西安）。唐代“故园”常指诗人在长安的家，因为长安是当时大多数文人的生活与政治中心"},
                {"word": "龙钟", "definition": "沾湿的样子，此处形容泪水涟涟以致双袖尽湿。注意：“龙钟”在此处不是“老态龙钟”（衰老）的意思，而是形容被泪水沾湿——这是“龙钟”在唐诗中的常见用法，与王勃《滕王阁序》中“龙钟”的衰老含义不同"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "马上相逢", "definition": "骑马赶路时相遇。岑参当时正骑马西行赴安西上任，途中偶遇东归长安的使者。“马上”二字不仅点出行程的匆忙，也暗示了边塞旅途的艰险——在荒凉的大漠中偶遇故人，是唐代边塞诗中常见的叙事场景"},
                {"word": "凭君传语报平安", "definition": "“凭”即托、请；“传语”即捎口信。此句写仓促相逢、无纸无笔，只能以口相传——越是简单朴素的语言，越能写出边塞将士对故乡最深沉的思念。"}
            ]}
        ]
    },
    "art_100": {
        "articleId": "art_100", "title": "晚春",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "芳菲", "definition": "花草的芳香，也指花草本身。“百般红紫斗芳菲”——花草们用各种红紫之色来竞相展现自己的美丽，一个“斗”字赋予草木以人的竞争意识，是韩愈拟人手法的精妙运用"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "杨花", "definition": "即柳絮。柳树种子上的白色绒毛，春末夏初随风飘飞如雪。古诗文中“杨花”常与“漂泊”“无定”的意象相连——苏轼《水龙吟》“似花还似非花，也无人惜从教坠”是写杨花最著名的词作"},
                {"word": "榆荚", "definition": "榆树的果实，形状似铜钱，故又称“榆钱”。暮春时榆荚成熟变白，飘落如雪花。韩愈以“无才思”形容杨花榆荚——它们不像桃李那样有红有紫、争奇斗艳——但这并非贬低，而是写它们以自己的方式参与春天"},
                {"word": "才思", "definition": "才华与情思。此处一语双关：既指杨花榆荚不像百花那样有“才华”来展示美艳，也暗含诗人自嘲——自己并非才华横溢之人——但即便没有天资，也要像杨花榆荚一样“漫天作雪飞”"}
            ]}
        ]
    },
    "art_101": {
        "articleId": "art_101", "title": "登幽州台歌",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "幽州台", "definition": "即蓟北楼，又称黄金台，故址在今北京市西南。相传战国时燕昭王为招揽天下贤士，在易水之滨筑高台、置千金于台上，以示礼贤下士之诚。后世以“黄金台”喻君王求贤若渴"},
                {"word": "古人", "definition": "指燕昭王、燕太子丹等礼贤下士的古代贤君，也泛指一切能识才用才的古代圣明之主。陈子昂登上燕昭王筑的黄金台，自然首先想到的就是“古人”"},
                {"word": "来者", "definition": "指后世能像燕昭王那样重用贤才的英明君主。陈子昂面对“前不见古人，后不见来者”的时间鸿沟，感到了一种彻底的孤独——这不是一时一地的孤独，而是有才之士面对历史长河的永恒孤独"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "悠悠", "definition": "形容天地广阔无边、时间绵延无尽。“悠悠”二字将空间之广阔与时间之久远融为一体——天地的无限与人生的有限形成了巨大的落差，这也是诗人“独怆然而涕下”的根源"},
                {"word": "怆然", "definition": "悲伤的样子。“怆”（chuàng），凄怆、悲伤。“独怆然而涕下”——一个“独”字至关重要：不是为个人得失而哭，而是在天地悠悠之间为千载以来怀才不遇之士而哭。明人评此诗“胸中自有万古，眼底更无一人”"}
            ]}
        ]
    },
    "art_102": {
        "articleId": "art_102", "title": "登飞来峰",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "飞来峰", "definition": "在杭州灵隐寺前。东晋咸和年间，印度僧人慧理来杭州，见此山曰“此乃天竺国灵鹫山之一小岭，不知何年飞来”，故名“飞来峰”。一说在浙江绍兴城外的宝林山"},
                {"word": "千寻", "definition": "极言塔高。古代八尺为一寻，“千寻”是夸张的说法。唐人写登高望远时偏爱数字夸张——王之涣“欲穷千里目”、李白“飞流直下三千尺”，皆以数字宏大衬意境壮阔"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "浮云", "definition": "以浮云比喻前进道路上的障碍和阻碍变法的保守势力。李白《登金陵凤凰台》“总为浮云能蔽日，长安不见使人愁”中“浮云”指奸佞小人遮蔽君王——王安石反用此典：我不怕浮云遮眼，因为身在最高层"},
                {"word": "最高层", "definition": "字面指飞来峰塔顶最高一层，实则以登高隐喻思想境界之高——唯有站得高、看得远，才能不被各种“浮云”所遮蔽。此时王安石仅三十岁，但“身在最高层”的自信已经预示了他日后变法革新的魄力与决心"}
            ]}
        ]
    },
    "art_103": {
        "articleId": "art_103", "title": "游山西村",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "腊酒", "definition": "腊月（农历十二月）酿的酒。农家自酿的腊酒大多浑浊，不如官府的清酒精致——但陆游说“莫笑”，因为这是农家最真诚的待客之物"},
                {"word": "鸡豚", "definition": "鸡和猪。“豚”（tún）指小猪。“丰年留客足鸡豚”——丰收之年，农家以鸡和猪肉待客，“足”字既写出了丰年的富足，也写出了农家的好客"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "柳暗花明又一村", "definition": "此句历经千年已成为中国人最熟悉的名句之一。“柳暗”指柳色深绿，“花明”指花色明艳——绿柳与红花的色彩对比，写出了春末夏初江南山村的田园风光。但真正让此句不朽的是其哲理内涵：困境中坚持，终见转机"}
            ]},
            {"sentenceIndex": 2, "glossary": [
                {"word": "春社", "definition": "古代祭祀土地神以祈求丰年的节日，一般在立春后第五个戊日。春社是古代农村最热闹的节日之一，人们吹箫击鼓、走村串巷——“箫鼓追随”以声写热闹，暗示社日就在眼前"},
                {"word": "衣冠简朴", "definition": "穿戴简单朴素。陆游以此赞美农村的淳朴民风——穿得简单但古风犹存。这与官场的虚伪华丽形成对比，暗含诗人对故乡田园生活的向往"}
            ]},
            {"sentenceIndex": 3, "glossary": [
                {"word": "闲乘月", "definition": "趁着月色闲游。“乘”在此处是“趁着”之意。月下闲游是古代文人向往的隐逸生活——苏轼《记承天寺夜游》“何夜无月？何处无竹柏？但少闲人如吾两人者耳”与此异曲同工"},
                {"word": "拄杖无时夜叩门", "definition": "“拄杖”即拄着拐杖，“无时”即随时。陆游说以后还要趁着月色、拄着拐杖随时来敲门——这是对主人的最高赞美：这样的村庄、这样的友谊，值得一次次拜访"}
            ]}
        ]
    },
    "art_104": {
        "articleId": "art_104", "title": "己亥杂诗（其五）",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "己亥", "definition": "清道光十九年（1839年）。中国传统以天干地支纪年，“己”为天干第六位，“亥”为地支第十二位，己亥年六十年一遇。龚自珍在这一年辞官南归，写下三百一十五首七绝，总题《己亥杂诗》"},
                {"word": "浩荡离愁", "definition": "“浩荡”原形容水势盛大，此处形容离愁的广大无尽。龚自珍在京做官二十年，辞官离京时满怀离愁——不仅是与京城的离别，更是与自己抱负的诀别"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "落红", "definition": "落花。“红”代指花——以颜色代指事物，是古诗中常见的借代手法。龚自珍以“落红”自喻：自己虽然离开了朝廷（像花离开枝头），但并非无情的凋谢"},
                {"word": "化作春泥更护花", "definition": "落花化作春天的泥土，更能滋养培育新的花朵。这是龚自珍最著名的诗句——诗人虽然离开了官场，但愿意像落花一样化为春泥，守护下一代。“春泥”与“护花”的意象贯穿了奉献、牺牲与希望的三重意蕴"}
            ]}
        ]
    },
    "art_105": {
        "articleId": "art_105", "title": "泊秦淮",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "秦淮", "definition": "秦淮河，长江下游支流，流经南京城中。自六朝以来，秦淮河两岸歌楼酒馆林立，是达官贵人寻欢作乐之地。杜牧以“烟笼寒水月笼沙”七个字写尽了秦淮夜色朦胧的美感"},
                {"word": "烟笼寒水月笼沙", "definition": "两个“笼”字是全句的关锁——烟笼罩着寒冷的水面，月光笼罩着沙滩。烟雾与月色交织，寒水与沙岸相映，营造出迷离朦胧的意境。这种“双重笼”的修辞手法为后文的讽刺铺垫了足够的氛围"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "商女", "definition": "以歌唱为生的女子，即歌妓。商女只是唱曲之人——曲是由客人点的——“不知亡国恨”的不是商女，而是那些点曲听歌的达官贵人。杜牧以“不知”二字将讽刺暗藏于表面平静的叙述之中"},
                {"word": "后庭花", "definition": "即《玉树后庭花》，南朝陈后主陈叔宝所作。陈后主沉湎酒色、不理朝政，隋军攻入建康（今南京）时他仍在后宫听曲，最终亡国被俘。《玉树后庭花》因此被视为“亡国之音”。杜牧听到的歌女唱的正是此曲——近三百年后，晚唐的秦淮河上仍然回荡着亡国之音"}
            ]}
        ]
    },
    "art_106": {
        "articleId": "art_106", "title": "贾生",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "宣室", "definition": "汉代未央宫前殿正室，是皇帝处理政务和接见大臣的重要场所。据《史记·屈原贾生列传》记载，汉文帝在宣室接见贾谊，问以鬼神之事——“宣室”二字本身即含隆重之意，在如此庄严的场所谈论鬼神，讽刺意味更浓"},
                {"word": "贾生", "definition": "贾谊（前200—前168），洛阳人，西汉著名政论家、文学家。十八岁以诗文闻名郡中，汉文帝召为博士。他多次上书提出治国方略，力主削弱诸侯、巩固中央集权，却遭权贵排挤，被贬为长沙王太傅。他的《过秦论》《治安策》是汉代政论文的巅峰之作"},
                {"word": "逐臣", "definition": "被贬谪的臣子。贾谊因权贵排挤被贬长沙——长沙在汉代属于南方湿热之地，北人视为畏途。汉文帝“求贤访逐臣”——“求贤”与“逐臣”形成强烈反差：既然是“逐臣”，为何又要以“求贤”之礼来访问？"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "前席", "definition": "古人在席上跪坐，向前移动膝盖以靠近对方，表示专注和尊重。汉文帝与贾谊谈到深夜，不自觉地前移身体——这一细节极其传神地写出了文帝对贾谊的欣赏。但“可怜”（可惜）一词让“前席”变得讽刺：这样隆重的礼遇，问的竟是鬼神之事"},
                {"word": "不问苍生问鬼神", "definition": "“苍生”即百姓、天下苍生。汉文帝放着贾谊这样的治国之才不问民生疾苦，却问鬼神之本源——“不问……问……”的对比句式道尽了李商隐的讽刺与惋惜。李商隐表面在写贾谊与汉文帝，实则批判晚唐皇帝沉迷神仙方术、不关心天下百姓的现实"}
            ]}
        ]
    },
    "art_107": {
        "articleId": "art_107", "title": "过松源晨炊漆公店",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "松源", "definition": "地名，在今安徽省南部山区。杨万里曾任江东转运副使，治所在建康（今南京），管辖范围包括今皖南及江西东北一带"},
                {"word": "漆公店", "definition": "松源途中的一处小地名，“晨炊”即在漆公店做早饭。诗题完整解释：杨万里途经松源地区，清晨在漆公店做早饭时写下此诗"},
                {"word": "赚得", "definition": "骗得。“赚”在此处是“诳骗”之意，与现代汉语中“赚钱”的“赚”含义完全不同。行人以为下了山便一马平川，其实只是自己骗自己"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "一山放出一山拦", "definition": "此句是全诗的画龙点睛之笔，以极其口语化、拟人化的手法写出山行的体悟——“放出”是将山拟人化为放行者，“拦住”则是拦路者。一座山刚放你过去，另一座山又拦住了你。杨万里以最简单的语言写出了最深刻的人生哲理——人生从来都是“一山放出一山拦”，困难一个接一个，没有一劳永逸的坦途"}
            ]}
        ]
    },
    "art_108": {
        "articleId": "art_108", "title": "约客",
        "sentences": [
            {"sentenceIndex": 0, "glossary": [
                {"word": "黄梅时节", "definition": "江南农历四五月梅子黄熟之时，正值阴雨连绵，故称“黄梅天”或“梅雨季节”。贺铸《青玉案》“一川烟草，满城风絮，梅子黄时雨”是写黄梅雨最著名的词句。赵师秀写“家家雨”——不是凄风苦雨，而是江南特有的绵密雨丝，衬托出夜晚的静谧"},
                {"word": "处处蛙", "definition": "到处是青蛙的叫声。黄梅雨夜，青草丛生的池塘边蛙声一片。“家家雨”与“处处蛙”对仗工整，以声写静——蛙声越是热闹，越显得等人的夜晚漫长而寂静"}
            ]},
            {"sentenceIndex": 1, "glossary": [
                {"word": "灯花", "definition": "古代油灯或蜡烛的灯芯燃烧后结成的花状灰烬。古人认为灯花爆是喜事的预兆——但赵师秀的灯花是被棋子震落的，不是自然爆开，暗示了等人的焦灼与失约的怅惘"},
                {"word": "闲敲棋子", "definition": "“闲”字是全诗最精妙之处——夜已过半而客人未至，诗人“无聊地”敲着棋子。一个“敲”字，将等待时的百无聊赖、急躁中带着克制、失望中含着期待的心理状态写得丝丝入扣。明人评此诗“无一字写等、无一字不等”"}
            ]}
        ]
    }
}


def create_glossary_files():
    """创建 12 个典故注释 JSON 文件并校验。"""
    created = []
    for aid, data in GLOSSARIES.items():
        path = os.path.join(GLOSSARY_DIR, f"{aid}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # JSON 校验
        with open(path, "r", encoding="utf-8") as f:
            json.load(f)
        total = sum(len(s["glossary"]) for s in data["sentences"])
        created.append((aid, data["title"], total))

    print("✅ 典故注释文件已创建：")
    for aid, title, cnt in created:
        print(f"  {aid}.json  {title}: {cnt} 条注释")
    total = sum(c for _, _, c in created)
    print(f"  合计: {len(created)} 篇, {total} 条注释")
    return total


def import_articles():
    """拼接 12 个分文件并全量导入。"""
    print(f"\n📖 导入选篇正文...")
    articles_dir = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")

    files = sorted(glob.glob(os.path.join(articles_dir, "articles_*.json")))
    all_articles = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            all_articles.extend(json.load(f))

    payload = json.dumps(all_articles, ensure_ascii=False)
    grade7b_count = len([a for a in all_articles if a.get("textbook") == "grade7b"])
    print(f"   文件数: {len(files)}, 总篇数: {len(all_articles)}, 七下: {grade7b_count}")

    cmd = [
        "curl", "-s", "-X", "POST",
        f"{BASE_URL}/api/admin/import/articles",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    print(f"   响应: {result.stdout[:500]}")
    if result.returncode != 0:
        print(f"   ❌ 导入失败: {result.stderr}")
    else:
        try:
            resp = json.loads(result.stdout)
            if resp.get("code") == 0:
                print(f"   ✅ 选篇正文导入成功")
            else:
                print(f"   ⚠️ 响应: {resp}")
        except json.JSONDecodeError:
            print(f"   ⚠️ 无法解析响应: {result.stdout[:200]}")


def import_glossaries():
    """逐篇导入典故注释。"""
    print(f"\n📖 导入典故注释...")
    for aid in GLOSSARIES:
        path = os.path.join(GLOSSARY_DIR, f"{aid}.json")
        cmd = [
            "curl", "-s", "-X", "POST",
            f"{BASE_URL}/api/admin/import/glossary/{aid}",
            "-H", "Content-Type: application/json",
            "-d", f"@{path}"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        try:
            resp = json.loads(result.stdout)
            if resp.get("code") == 0:
                item_count = resp.get("data", 0)
                print(f"  ✅ {aid} ({item_count} 条)")
            else:
                print(f"  ⚠️ {aid}: {resp.get('message', result.stdout[:100])}")
        except json.JSONDecodeError:
            print(f"  ❌ {aid}: 无法解析响应 → {result.stdout[:100]}")


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "--import":
            import_articles()
            import_glossaries()
            return
        elif sys.argv[1] == "--articles-only":
            import_articles()
            return
        elif sys.argv[1] == "--glossaries-only":
            import_glossaries()
            return

    # Default: create glossary files only (articles are written separately)
    create_glossary_files()
    print(f"\n💡 下一步:")
    print(f"   python3 scripts/generate_grade7b_poems.py --import    # 导入数据库")


if __name__ == "__main__":
    main()
