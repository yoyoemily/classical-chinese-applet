# 文言雀

## 错误手动修复

### 字词打卡选项优化（正确义项有误）
1. 知识库词书搜索例句~/knowledge_library/文言文/词书/wb_*.json
2. quizItems[]项的definition就是正确答案，distractors是干扰项，记录kidRef
3. 确认正确释义是否在标准义项表~/knowledge_library/文言文/词书/definition_standard.json
4. 正确义项不在标准义项表，则扩充标准义项表
5. 根据kidRef搜索到选篇articles_*.json里，修改definition为正确义项
6. 回到词书JSON，把quizItems项目的definition一并改成正确义项。干扰项视情况可调整/不调整
7. 导入选篇sh import_article.sh、导入词书sh import_wordbook.sh
8. 前端验证
> 为什么必须双改：quizItem.definition 是词书导入时从 article_keyword
  拷贝的独立副本。只改词书不改选篇，下次有人重导词书时，会从选篇的旧值重新拷贝，你的修正被覆盖。所以权威源和副本两边都要改

### 字词打卡选项优化（干扰项优化）
1. 知识库词书搜索例句~/knowledge_library/文言文/词书/wb_*.json
2. 在词书 JSON 里找到该 quizItem：definition=正确答案，distractors=干扰项；
3. 改词书 quizItem：
   - distractors，优先用标准义项表 definition_standard.json 义项作为干扰项
4. 导入词书 sh import_wordbook.sh
5. 前端验证

### 字词打卡例句译文有误
1. 知识库词书搜索例句~/knowledge_library/文言文/词书/wb_*.json
2. quizItems[]项的sentenceTranslation就是译文，记录kidRef
5. 根据kidRef搜索到选篇articles_*.json里，上一级对象的translation，找到对应小句的那一截译文，只改那一截
  - 别增删译文里的断句标点（。！？；）——译文与原文分句数必须对齐，否则选篇的分句匹配会乱
  - 同一句可能被多本词书收录，每本都要改（本例只有中考实词一本）
6. 回到词书JSON，把quizItems项目的sentenceTranslation 改成一致译文
7. 导入选篇sh import_article.sh、导入词书sh import_wordbook.sh
8. 前端验证：答题界面该题译文正确；顺带看选篇阅读器里这句话的译文也变了

### 字词打卡例句出处有误
 ▎ 词书 JSON 里 quizItem 的 sentenceSource 应当等于 kidRef 指向文章 title 的《篇名》形式。

  拿本例验证：s_c_0005 的 kidRef → kw_art_001_s01_备_0 → art_001 → title「岳阳楼记」→ 应然值《岳阳楼记》，词书里写的也是《岳阳楼记》，一致 ✅。

  诊断：对比「应然值」和「实际值」

  1. 词书 JSON 里看 quizItem 的 sentenceSource（实际值）
  2. 按完整 kid 搜选篇，看所在文章的 title/author/dynasty（应然值）
  3. 对照，落进三种情形之一：

  情形 1：kidRef 指错了文章（走 C 类）

  例句真实出自 A 文，但 kidRef 指向 B 文的 keyWord。判定信号：按 kidRef 定位到的句子，根本不含这句话。

  - 在 A 文里找该字有没有已标注的 keyWord 且义项匹配：
    - 有 → 改词书 JSON 的 kidRef 为 A 文 keyWord 的 kid，sentenceSource 同步改为《A 文篇名》
    - 没有 → 先在 A 文新增 keyWord（kid 按 kw_{articleId}_s{xx}_{字}_{序号} 生成、wordBookId 必填、definition 原文复制自标准表），再改词书 kidRef + sentenceSource
  - 导入：先导选篇（改了/新增了 keyWord），后导词书

  情形 2：文章元数据本身错了（走 D 类）

  kidRef 没指错、句子就在这篇文章里，但文章的 title/author/dynasty 在 articles JSON 里写错了（比如篇名写错字、作者朝代标错）。

  - 改 articles JSON 里该文章的元数据字段
  - 改词书 JSON 里相关 quizItem 的 sentenceSource（若有该文其他例句，全查一遍：grep 篇名或按文章 id 过滤）
  - 导入：先导选篇（./import_article.sh art_xxx），后导词书
  - 附带影响：选篇板块的列表标题/作者也一起变了，验证时顺带看一眼

  情形 3：只有词书的 sentenceSource 手误（只改词书）

  articles 侧全对、kidRef 也对，唯独词书 JSON 里 sentenceSource 抄错了字。

  - 只改词书 JSON 那一处 → 校验 → ./import_wordbook.sh wb_xxx
  - 不用动选篇、不用导选篇