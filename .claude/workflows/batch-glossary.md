export const meta = {
  name: 'batch-glossary-annotation',
  description: 'Generate glossary annotations for 32 remaining articles (art_006–art_037) in parallel',
  phases: [
    { title: 'Generate', detail: 'AI generates glossary per article from source.json' },
    { title: 'Import', detail: 'Write JSON, validate, copy to backend, import via API' },
  ],
}

const REMAINING = [
  'art_006', 'art_007', 'art_008', 'art_009', 'art_010',
  'art_011', 'art_012', 'art_013', 'art_014', 'art_015',
  'art_016', 'art_017', 'art_018', 'art_019', 'art_020',
  'art_021', 'art_022', 'art_023', 'art_024', 'art_025',
  'art_026', 'art_027', 'art_028', 'art_029', 'art_030',
  'art_031', 'art_032', 'art_033', 'art_034', 'art_035',
  'art_036', 'art_037',
]

const SOURCE_PATH = '/Users/zhutx/IdeaProjects/classical-chinese/src/main/resources/source.json'
const FRONTEND_DIR = '/Users/zhutx/weixin_applet_space/classical-chinese-applet/data/glossary'
const BACKEND_DIR = '/Users/zhutx/IdeaProjects/classical-chinese/data/glossary'

const GLOSSARY_SCHEMA = {
  type: 'object',
  properties: {
    articleId: { type: 'string' },
    title: { type: 'string' },
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sentenceIndex: { type: 'integer' },
          glossary: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                definition: { type: 'string' },
              },
              required: ['word', 'definition'],
            },
          },
        },
        required: ['sentenceIndex', 'glossary'],
      },
    },
  },
  required: ['articleId', 'title', 'sentences'],
}

const ANNOTATION_STANDARDS = `
## 典故注释标注标准

### 标注 ✅
- 地名（巴陵、洞庭、潇湘、太行、王屋…）
- 人名（滕子京、唐贤、智仙…）
- 年号（庆历、太元…）
- 器物/草木/动物（樯、楫、芷、锦鳞、箧、衾…）
- 官职/制度（太守、加冠…）
- 文化隐喻/典故（庙堂、江湖、去国、醉翁之意不在酒…）
- 名句/哲理表达（先天下之忧而忧…）
- 成语源头（豁然开朗、水落石出、鸡犬相闻…）
- 古今异义词（汤=热水、臭=气味…）
- 文言特殊句式/倒装（甚矣汝之不惠、弗之怠…）

### 不标 ✗
- 虚词（之、于、以、则、乃、而、焉…）——词书已覆盖
- 词书中已有的实词（谪、守、观、修、临、名、得、归、从…）——这些 keyWords 已覆盖
- 常见名词（春、年、山、日、人…）——现代汉语常用
- 动词/形容词（旧、贤、胜、远…）——词书已覆盖

### 铁律
1. 每条 definition 50-120 字，有文化深度
2. 禁用中文双引号"，用「」替代
3. sentenceIndex 从0开始，与 source.json 完全对应
4. 每句都要有 sentenceIndex，即使 glossary 为空数组
5. 优先标注：地名/人名/年号 > 器物/制度 > 成语源头 > 古今异义 > 文化典故

### 判断口诀
1. 学生不看解释就知道 → 不标
2. 有文化背景可讲 → 标
3. 词书 keyWords 已覆盖 → 不标
4. 地名、人名、年号、器物、典故、成语源头 → 标
`

phase('Generate')

const results = await pipeline(
  REMAINING,
  // Stage 1: Generate glossary
  (articleId) => agent(
    `你需要为名篇「${articleId}」生成典故注释。

第一步：从 ${SOURCE_PATH} 读取该篇的句子结构和 keyWords（这些 keyWords 是词书已覆盖的词，不要再标注）。

第二步：根据以下标注标准，逐句分析并生成 glossary。

${ANNOTATION_STANDARDS}

第三步：返回完整的 glossary JSON 对象，格式为：
{
  "articleId": "${articleId}",
  "title": "篇目标题",
  "sentences": [
    { "sentenceIndex": 0, "glossary": [{ "word": "...", "definition": "..." }] },
    ...
  ]
}

重要：
- 每条 definition 要提供有价值的文化背景信息，不能只是一句话翻译
- 仔细阅读每句话的全文，理解上下文后再标注
- 如果某句确实没有值得标注的内容，glossary 可以为空数组 []
- 每个 glossary 词条控制在 2-8 条之间
- 优先确保质量而非数量`,
    { phase: 'Generate', schema: GLOSSARY_SCHEMA }
  ),
  // Stage 2: Write file, validate, copy, import
  (glossary, articleId) => {
    if (!glossary) {
      log(`⚠️ ${articleId}: 生成失败，跳过`)
      return null
    }
    return agent(
      `将以下典故注释 JSON 写入文件、校验、复制到后端并导入数据库。

JSON 内容：
\`\`\`json
${JSON.stringify(glossary, null, 2)}
\`\`\`

按顺序执行以下步骤：

1. 写入前端文件：将上述 JSON 写入 ${FRONTEND_DIR}/${articleId}.json

2. 校验 JSON 合法性：
   python3 -c "import json; d=json.load(open('${FRONTEND_DIR}/${articleId}.json')); print(f'OK: {d.get(\"title\",\"\")} sentences={len(d[\"sentences\"])} total_glossary={sum(len(s.get(\"glossary\",[])) for s in d[\"sentences\"])}')"

3. 复制到后端：
   cp ${FRONTEND_DIR}/${articleId}.json ${BACKEND_DIR}/${articleId}.json

4. 导入数据库：
   curl -s -X POST http://localhost:8080/api/admin/import/glossary/${articleId} -H "Content-Type: application/json" -d @${FRONTEND_DIR}/${articleId}.json

5. 报告结果：输出 "${articleId} 完成: X句 Y条 → 导入 {code:0...}"

如果任何步骤失败，报告具体错误信息。`,
      { phase: 'Import' }
    )
  }
)

const succeeded = results.filter(Boolean)
log(`\n===== 批量标注完成 =====`)
log(`成功: ${succeeded.length}/${REMAINING.length}`)
log(`失败: ${REMAINING.length - succeeded.length}`)
return { succeeded: succeeded.length, total: REMAINING.length }
