# 文言雀 API 文档

> 文言雀——文言文学习小程序后端 REST API，提供词书、学习、名篇、进度、生词本、打卡、勋章、用户等模块的数据服务。

## General API Information

| Item | Value |
|------|-------|
| Base Endpoint | `https://wyq.yinqueai.com` |
| Content-Type | `application/json` |
| Authentication | Bearer Token（Header: `Authorization: Bearer <token>`） |
| Server Time | UTC (ISO 8601) |
| Timestamp Format | Unix timestamp in milliseconds |
| Request Encoding | UTF-8 |

## Response Format

### Success Response

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": { }
}
```

### Error Response

```json
HTTP/1.1 400 Bad Request
{
    "code": 10001,
    "message": "参数错误",
    "data": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | Integer | 状态码。`0` = 成功，其他 = 业务错误 |
| `message` | String | 可读的错误描述 |
| `data` | Object \| Array \| Null | 响应数据载荷，错误时为 `null` |

### Pagination Response

分页接口统一使用 `IPaginationResult<T>` 结构：

| Field | Type | Description |
|-------|------|-------------|
| `list` | Array\<T\> | 当前页数据列表 |
| `total` | Integer | 总记录数 |
| `page` | Integer | 当前页码 |
| `pageSize` | Integer | 每页条数 |
| `hasMore` | Boolean | 是否还有更多数据 |

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 0 | ok | 请求成功 |
| 10001 | 参数错误 | 请求参数缺失或格式不正确 |
| 10002 | 未授权 | Token 无效或已过期，需重新登录 |
| 10401 | 登录已过期 | JWT Token 无效或已过期，需重新 login |
| 10003 | 资源不存在 | 请求的词书/名篇/字词/用户等不存在 |
| 10004 | 今日任务已生成 | 今日学习任务已存在，无需重复请求 |
| 10005 | 今日学习已完成 | 所有学习任务均已打勾，可调用 complete 收尾 |
| 10006 | 操作失败 | 服务端处理异常，可重试 |
| 10007 | 频率限制 | 请求过于频繁，请稍后再试 |

---

## 认证

### 微信登录

小程序端调用 `wx.login()` 获取临时 code，后端换取 openId 并签发 JWT。

**Endpoint:** `POST /api/auth/login`

> ⚠️ 此接口不需要 Authorization header。

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `code` | String (Required) | `wx.login()` 返回的临时 code |
| `scene` | String (Optional) | 小程序码 scene 值（格式 `i_{userId}`），扫码进入时携带 |
| `inviterId` | Long (Optional) | 分享卡片 inviter 参数，通过 `onShareAppMessage` 路径传入 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.token` | String | JWT Token，后续请求放入 `Authorization: Bearer <token>` |
| `data.userId` | Long | 用户 ID |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiJ9...",
        "userId": 1
    }
}
```

#### Example: Error

```json
HTTP/1.1 401 Unauthorized
{
    "code": 10401,
    "message": "微信登录失败，请稍后重试",
    "data": null
}
```

#### Authentication

所有 `/api/auth/**` 以外的接口需要在请求头中携带 JWT：

```
Authorization: Bearer <token>
```

- Token 由 `/api/auth/login` 签发，有效期 7 天
- 401 时客户端自动调用 `wx.login()` 刷新 token
- 新用户首次登录自动创建账号（无需注册）

---

## 词书

### 获取词书列表

返回所有可用词书的摘要信息（不含字词详情）。

**Endpoint:** `GET /api/wordbooks`

#### Request Parameters

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | String | 词书唯一标识，如 `wb_zhongkao_001` |
| `data[].name` | String | 词书名称，如"字海拾贝·中考篇" |
| `data[].description` | String | 词书简介 |
| `data[].category` | String | 分类：`middle_school` / `high_school` / `function` / `tongjia` / `ancient_modern` / `flexible_usage` |
| `data[].coverColor` | String | 封面主题色，如 `#4a6a5e` |
| `data[].studyMode` | String | 学习模式：`standard`（直接选题）、`identify_first`（先识别目标字再选题）、`readonly`（纯阅读浏览） |
| `data[].identifyPrompt` | String? | 前置步骤提示文案，仅 `identify_first` 模式有效 |
| `data[].examLevel` | String | 考试级别：`zhongkao`（中考）或 `gaokao`（高考） |
| `data[].initialized` | Boolean | 词书是否已完成数据初始化，`false` 时不可选择 |
| `data[].totalWords` | Integer | 收录字词总数 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        {
            "id": "wb_zhongkao_001",
            "name": "字海拾贝·中考篇",
            "description": "涵盖中考大纲全部核心文言字词，包含实词、虚词、通假字三大类，覆盖七至九年级统编版教材全部重点字词。",
            "category": "middle_school",
            "studyMode": "standard",
            "coverColor": "#4a6a5e",
            "examLevel": "zhongkao",
            "initialized": true,
            "totalWords": 168
        }
    ]
}
```

---

### 获取词书详情

返回指定词书的完整信息，包含所有字词及每个字的释义、例句、干扰项等。

**Endpoint:** `GET /api/wordbooks/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Required) | 词书 ID，如 `wb_zhongkao_001` |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | String | 词书 ID |
| `data.name` | String | 词书名称 |
| `data.description` | String | 词书简介 |
| `data.category` | String | 词书分类 |
| `data.coverColor` | String | 封面主题色 |
| `data.studyMode` | String | 学习模式：`standard` / `identify_first` / `readonly` |
| `data.identifyPrompt` | String? | 前置步骤提示文案 |
| `data.examLevel` | String | 考试级别：`zhongkao` 或 `gaokao` |
| `data.initialized` | Boolean | 词书是否已完成数据初始化 |
| `data.totalWords` | Integer | 字词总数 |
| `data.wordEntries` | Array\<IWordEntry\> | 字词列表 |

**IWordEntry 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | 字词 ID |
| `character` | String | 汉字 |
| `pinyin` | String | 拼音 |
| `wordType` | String | 字词类型：`shi`(实词) / `xu`(虚词) / `tongjia`(通假字) / `gujinyi`(古今异义) / `huoyong`(词类活用) (Optional) |
| `characterType` | String | 字型：象形字/指事字/会意字/形声字 (Optional) |
| `explanation` | String | 字形解释 (Optional) |
| `oracleForm` | String | 甲骨文图片 URL (Optional) |
| `examFrequency` | String | 考试频次，如"5年3考" (Optional) |
| `keyWordRefs` | Array\<IKeyWordRef\> | 义项引用列表（从名篇 keyWord 语料池关联） |
| `quizItems` | Array\<IQuizItem\> | 答题项列表（从名篇句子自动生成） |
| `usages` | Array\<IWordUsage\> | 虚词用法列表（readonly 词书专用） (Optional) |
| `similarHomophones` | Array\<String\> | 同音易混字 |
| `similarShapes` | Array\<String\> | 形近字 |
| `mnemonic` | String | 记忆口诀 (Optional) |

**IKeyWordRef 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `kid` | String | 引用唯一标识 |
| `word` | String | 从 article_keyword 解析的 word_text (Optional) |
| `definition` | String | 从 article_keyword 解析的 definition (Optional) |
| `sentenceText` | String | 所在句子原文 (Optional) |
| `sentenceTranslation` | String | 所在句子译文 (Optional) |
| `articleId` | String | 所在文章 ID (Optional) |
| `articleTitle` | String | 所在文章标题 (Optional) |

**IQuizItem 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | 答题项 ID |
| `kidRef` | String | 关联的 keyWordRef.kid |
| `targetWord` | String | 考查的目标字 |
| `definition` | String | 正确答案释义 = article_keyword.definition |
| `difficulty` | String | 难度：`basic` / `medium` / `hard` |
| `distractors` | Array\<String\> | 干扰项列表 |
| `sentenceText` | String | 句子原文 (Optional) |
| `sentenceTranslation` | String | 句子译文 (Optional) |
| `sentenceSource` | String | 句子出处（文章标题） (Optional) |
| `articleId` | String | 关联的名篇 ID (Optional) |
| `audioUrl` | String | 预录音频 URL (Optional) |

**IWordUsage 对象（readonly 词书）：**

| Field | Type | Description |
|-------|------|-------------|
| `usageType` | String | 用法类别 |
| `definition` | String | 用法释义 |
| `exampleSentence` | String | 例句原文 |
| `exampleTranslation` | String | 例句翻译 |
| `exampleSource` | String | 例句出处 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "id": "wb_zhongkao_001",
        "name": "字海拾贝·中考篇",
        "description": "涵盖中考大纲全部核心文言字词...",
        "category": "middle_school",
        "coverColor": "#4a6a5e",
        "totalWords": 75,
        "wordEntries": [
            {
                "id": "wb_mid_001_01",
                "character": "而",
                "pinyin": "ér",
                "wordType": "xu",
                "characterType": "象形字",
                "explanation": "甲骨文像面颊胡须之形，本义为胡须。后假借为连词。",
                "examFrequency": "5年4考",
                "keyWordRefs": [
                    {
                        "kid": "kid_001_01_1",
                        "word": "而",
                        "definition": "表示并列关系，可译为\"和\"\"又\"\"并且\"",
                        "sentenceText": "敏而好学，不耻下问。",
                        "sentenceTranslation": "聪敏并且爱好学习，不以向不如自己的人请教为耻。",
                        "articleId": "art_001",
                        "articleTitle": "论语·公冶长"
                    }
                ],
                "quizItems": [
                    {
                        "id": "s_001_01_1",
                        "kidRef": "kid_001_01_1",
                        "targetWord": "而",
                        "definition": "表示并列关系，可译为\"和\"\"又\"\"并且\"",
                        "difficulty": "basic",
                        "distractors": ["地，着", "就，然后", "因为"],
                        "sentenceText": "学而不思则罔，思而不学则殆。",
                        "sentenceSource": "《论语·为政》",
                        "articleId": "art_002"
                    }
                ],
                "similarHomophones": ["尔", "耳", "儿"],
                "similarShapes": ["面", "耐", "耍"],
                "mnemonic": "而字本义是胡须，后借用为连词。记住四个主要用法：并列又，转折却，承接就，修饰着。"
            }
        ]
    }
}
```

---

### 获取词书快捷选字列表

返回指定词书下所有字词的精简列表（仅 id、character、pinyin），按字数→拼音排序，供学习页"任意选字"功能使用。

**Endpoint:** `GET /api/wordbooks/:id/quick-words`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Required) | 词书 ID |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].entryId` | String | 字词 ID |
| `data[].character` | String | 汉字 |
| `data[].pinyin` | String | 拼音 |

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        { "entryId": "wb_mid_001_01", "character": "而", "pinyin": "ér" },
        { "entryId": "wb_mid_001_02", "character": "之", "pinyin": "zhī" }
    ]
}
```

---

## 学习

### 获取今日任务

根据词书 ID 和用户当前学习进度，生成今日需完成的复习+新学任务。

**Endpoint:** `GET /api/study/today`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前选中的词书 ID |
| `dailyNew` | Integer (Optional) | 每日新学数量上限，不传则由后端使用默认值 |
| `dailyReview` | Integer (Optional) | 每日复习数量上限，不传则由后端使用默认值 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.date` | String | 日期，格式 `YYYY-MM-DD` |
| `data.wordBookId` | String | 词书 ID |
| `data.wordBookName` | String | 词书名称 |
| `data.reviewWords` | Array\<TodayWord\> | 待复习的字词列表 |
| `data.newWords` | Array\<TodayWord\> | 待新学的字词列表 |
| `data.totalWords` | Integer | 今日总词数 |
| `data.estimatedMinutes` | Integer | 预估用时（分钟） |
| `data.dailyNewLimitReached` | Boolean | 今日跨词书新学词数是否已达上限 (Optional) |

**TodayWord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `entryId` | String | 字词 ID |
| `character` | String | 汉字 |
| `isReview` | Boolean | 是否为复习（true=复习，false=新学） |
| `reviewStage` | Integer \| String | 当前复习阶段：0–6 或 `"done"` (Optional) |
| `quizItems` | Array\<IQuizItem\> | 该字的答题项列表 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "date": "2026-07-03",
        "wordBookId": "wb_zhongkao_001",
        "wordBookName": "字海拾贝·中考篇",
        "reviewWords": [
            {
                "entryId": "wb_mid_001_01",
                "character": "而",
                "isReview": true,
                "reviewStage": 3,
                "quizItems": [
                    {
                        "id": "s_001_01_1",
                        "kidRef": "kid_001_01_1",
                        "targetWord": "而",
                        "definition": "表示并列关系，可译为\"和\"\"又\"\"并且\"",
                        "difficulty": "basic",
                        "distractors": ["地，着", "就，然后", "因为"],
                        "sentenceText": "学而不思则罔，思而不学则殆。",
                        "sentenceSource": "《论语·为政》"
                    }
                ]
            }
        ],
        "newWords": [
            {
                "entryId": "wb_mid_001_06",
                "character": "乃",
                "isReview": false,
                "quizItems": [
                    {
                        "id": "s_001_06_1",
                        "kidRef": "kid_001_06_1",
                        "targetWord": "乃",
                        "definition": "竟然，却",
                        "difficulty": "basic",
                        "distractors": ["是，就是", "你"],
                        "sentenceText": "乃悟前狼假寐，盖以诱敌。",
                        "sentenceSource": "《狼》"
                    }
                ]
            }
        ],
        "totalWords": 7,
        "estimatedMinutes": 10,
        "dailyNewLimitReached": false
    }
}
```

---

### 获取今日学习摘要

轻量接口，仅返回数字和词进度，不含题目数据。用于首页快速展示。

**Endpoint:** `GET /api/study/today-summary`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前选中的词书 ID |
| `dailyNew` | Integer (Optional) | 每日新学数量上限 |
| `dailyReview` | Integer (Optional) | 每日复习数量上限 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.newWords` | Integer | 今日新学词数 |
| `data.reviewWords` | Integer | 今日复习词数 |
| `data.totalWords` | Integer | 今日总词数 |
| `data.estimatedMinutes` | Integer | 预估用时（分钟） |
| `data.dailyNewLimitReached` | Boolean | 今日新学词数是否已达上限 |
| `data.wordsLearned` | Integer | 累计已学词数 |
| `data.wordsMastered` | Integer | 累计已掌握词数 |
| `data.wordProgresses` | Object | 字词进度映射，key 为 entryId |

---

### 提交答题结果

记录用户对某个答题项（句子）的一次答题结果，服务端据此更新该字的艾宾浩斯进度。

**Endpoint:** `POST /api/study/answer`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前词书 ID |
| `entryId` | String (Required) | 考查的字词 ID |
| `quizItemId` | String (Required) | 答题项 ID |
| `selectedOption` | Integer (Required) | 用户选择的选项序号（0-based） |
| `correct` | Boolean (Required) | 是否答对 |
| `correctAnswer` | String | 正确答案文本（前端传入，用于错题本记录，避免后端因 shuffle 无法还原） (Optional) |
| `wrongAnswer` | String | 用户选择的答案文本（前端传入） (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.updatedProgress.stage` | Integer \| String | 更新后的复习阶段（0–6 或 `"done"`） |
| `data.updatedProgress.nextReviewDate` | String | 下次复习日期，格式 `YYYY-MM-DD` |
| `data.updatedProgress.correctCount` | Integer | 累计答对次数 |
| `data.updatedProgress.wrongCount` | Integer | 累计答错次数 |

> **关于 `correctAnswer` / `wrongAnswer`**：前端 shuffle 后选项顺序不确定，后端无法通过 `selectedOption` 序号还原答案文本。因此由前端在 `submitAnswer` 时直接传入正确答案和用户答案的文本，后端直接写入错题本。两个字段均为可选，不传时后端从数据库兜底取值（可能不准确）。

---

### 完成单个字词学习

所有句子答完后、进入字总结页时调用。仅新学词返回 xpGained=10，复习词返回 0。

**Endpoint:** `POST /api/study/word-complete`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前词书 ID |
| `entryId` | String (Required) | 字词 ID |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.xpGained` | Integer | 本次获得的经验值（新学词 10，复习词 0） |

---

### 音频完整播放完成

选篇/经典听读完成后调用，记录 XP。后端根据 contentId 查询原文汉字数计算 XP，前端不可作弊。同一内容去重，只给一次 XP。

**Endpoint:** `POST /api/study/audio-complete`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `contentType` | String (Required) | 内容类型：`article` 或 `classic_chapter` |
| `contentId` | String (Required) | 内容 ID（articleId 或 `classicId:nodeId`） |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.xpGained` | Integer | 本次获得的经验值 |

---

### 完成今日学习

全部答题结束后调用，记录打卡、计算经验、检查新勋章。

**Endpoint:** `POST /api/study/complete`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前词书 ID |
| `correctCount` | Integer (Required) | 本次答对题数 |
| `wrongCount` | Integer (Required) | 本次答错题数 |
| `xpGained` | Integer | 本次获得经验值（仅新学词答对才计入，由前端逐词累加后传入） (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.newBadges` | Array\<Badge\> | 本次新获得的勋章列表 |
| `data.xpGained` | Integer | 本次获得的经验值 |

**Badge 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | 勋章 ID，如 `badge_streak_7` |
| `name` | String | 勋章名称，如"日积月累" |
| `description` | String | 勋章描述 |
| `icon` | String | 勋章图标（emoji） |
| `category` | String | 类别：`streak` / `achievement` / `milestone` |
| `condition.type` | String | 获得条件类型，如 `streak` |
| `condition.value` | Integer | 获得条件阈值 |

---

## 错题本

### 获取错题数量

仅返回错题数量，供首页等只需 count 的场景。

**Endpoint:** `GET /api/study/mistakes/count`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String | 词书 ID，不传则返回所有词书的错题数 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.count` | Integer | 错题数量 |

---

### 获取错题列表

返回当前用户的错题记录，每条记录对应一个字，内含多个答错的句子明细。

**Endpoint:** `GET /api/study/mistakes`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String | 词书 ID，不传则返回所有词书的错题 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].entryId` | String | 字词 ID |
| `data[].character` | String | 汉字 |
| `data[].pinyin` | String | 拼音 |
| `data[].wordBookName` | String | 所属词书名称 |
| `data[].totalErrors` | Integer | 所有句子的错误次数之和 |
| `data[].lastErrorTime` | String | 最近一次答错时间，格式 `YYYY-MM-DD` |
| `data[].sentences` | Array\<MistakeSentence\> | 该字的答错句子明细 |

**MistakeSentence 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `quizItemId` | String | 答题项 ID |
| `sentenceText` | String | 答错时的原句 |
| `wrongAnswer` | String | 用户选择的错误答案 |
| `correctAnswer` | String | 正确答案 |
| `errorCount` | Integer | 该句子的累计错误次数 |
| `consecutiveCorrect` | Integer | 该句子的连续答对次数 |

---

### 移除错题

手动移除指定字词的全部错题记录（含所有句子明细）。

**Endpoint:** `DELETE /api/study/mistakes/:entryId`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `entryId` | String (Required) | 要移除的字词 ID |

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前词书 ID |

#### Response

无 data 内容。

---

## 进度

### 获取学习进度

返回用户在指定词书上的完整学习进度数据。

**Endpoint:** `GET /api/progress`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 词书 ID |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.wordBookId` | String | 词书 ID |
| `data.wordsLearned` | Integer | 已学字数 |
| `data.wordsMastered` | Integer | 已掌握字数 |
| `data.checkinDates` | Array\<String\> | 打卡日期列表，格式 `YYYY-MM-DD` |
| `data.checkinDays` | Integer | 累计打卡天数 |
| `data.currentStreak` | Integer | 当前连续学习天数 |
| `data.longestStreak` | Integer | 历史最长连续学习天数 |
| `data.totalXP` | Integer | 累计经验值 |
| `data.wordProgresses` | Object | 字词进度映射，key 为 entryId |

**wordProgresses[entryId] 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `entryId` | String | 字词 ID |
| `stage` | Integer \| String | 复习阶段：0–6 或 `"done"` |
| `nextReviewDate` | String | 下次复习日期，格式 `YYYY-MM-DD` |
| `correctCount` | Integer | 累计答对次数 |
| `wrongCount` | Integer | 累计答错次数 |
| `resetCount` | Integer | 重置次数（遗忘后重新开始） |
| `history` | Array\<AnswerRecord\> | 答题历史记录 |

**AnswerRecord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `quizItemId` | String | 答题项 ID |
| `selectedOption` | Integer | 选择的选项序号 |
| `correct` | Boolean | 是否答对 |
| `timestamp` | Long | 答题时间戳（ms） |

---

## 生词本

### 获取生词本

返回用户在指定词书中的字词掌握情况列表，支持按掌握程度筛选。

**Endpoint:** `GET /api/vocabulary`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 词书 ID |
| `tab` | String (Required) | 筛选标签：`all` / `difficult` / `unclear` / `familiar` / `mastered` |

#### Response Fields

分页结构，`data.list` 中各元素：

| Field | Type | Description |
|-------|------|-------------|
| `wordId` | String | 字词 ID |
| `character` | String | 汉字 |
| `pinyin` | String | 拼音 |
| `masteryLevel` | String | 掌握程度：`new` / `difficult` / `unclear` / `familiar` / `mastered` |
| `progress` | Integer | 学习进度百分比 (0–100) |
| `stage` | Integer \| String | 复习阶段：0–6 或 `"done"` |

---

## 打卡

### 获取打卡记录

返回指定月份的打卡日期列表。

**Endpoint:** `GET /api/checkin`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `year` | Integer (Required) | 年份，如 `2026` |
| `month` | Integer (Required) | 月份，1–12 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | Array\<String\> | 打卡日期列表，格式 `YYYY-MM-DD` |

---

## 勋章

### 获取勋章列表

返回全部勋章定义及用户已获得的勋章。

**Endpoint:** `GET /api/badges`

#### Request Parameters

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.badges` | Array\<Badge\> | 全部勋章定义 |
| `data.userBadges` | Array\<UserBadge\> | 用户已获得的勋章 |

**UserBadge 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `badgeId` | String | 勋章 ID |
| `earnedDate` | String | 获得日期，格式 `YYYY-MM-DD` |
| `notified` | Boolean | 是否已通知用户 |

---

## 用户

### 获取用户等级信息

返回用户的等级、称号、经验值和学习统计数据。

**Endpoint:** `GET /api/user/profile`

#### Request Parameters

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.level` | Integer | 当前等级 |
| `data.title` | String | 等级称号，如"秀才"、"举人" |
| `data.totalXP` | Integer | 累计经验值 |
| `data.currentStreak` | Integer | 当前连续学习天数 |
| `data.longestStreak` | Integer | 历史最长连续学习天数 |
| `data.checkinDays` | Integer | 累计打卡天数 |
| `data.memberLevel` | Integer | 契约会员级别：0=未签约，1=已签约 |
| `data.nickName` | String | 昵称 |
| `data.avatarUrl` | String | 头像 URL |
| `data.recoveryDeadline` | String | 数据恢复截止时间（格式 `yyyy-MM-dd HH:mm:ss`），仅清除数据后 24h 内有值 (Optional) |
| `data.codeStatus` | Integer | 学习码验证状态 (Optional) |

---

### 获取个人信息

返回用户的个人资料（头像、昵称、年级）。

**Endpoint:** `GET /api/user/info`

#### Request Parameters

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.avatarUrl` | String | 头像 URL |
| `data.nickName` | String | 昵称 |
| `data.grade` | String | 年级，如 `grade8a` 或空字符串 |
| `data.memberLevel` | Integer | 契约会员级别 (Optional) |
| `data.recoveryDeadline` | String | 数据恢复截止时间 (Optional) |

---

### 保存个人信息

更新用户的个人资料。**字段均为选填，传哪个改哪个。**

**Endpoint:** `PUT /api/user/info`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `avatarUrl` | String (Optional) | 头像 URL |
| `nickName` | String (Optional) | 昵称 |
| `grade` | String (Optional) | 年级，如 `grade8a`，可为空字符串 |

#### Response

无 data 内容。

---

### 上传头像

上传用户头像图片，返回可访问的 URL。

**Endpoint:** `POST /api/upload/avatar`

#### Request

Content-Type: `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File (Required) | 头像图片文件，支持 jpg/png/gif/webp/bmp，不超过 2MB |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.avatarUrl` | String | 头像访问 URL |

---

### 签订金石契约

**Endpoint:** `POST /api/user/pact`

#### Request Body

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.memberLevel` | Integer | 固定返回 1 |

---

### 验证学习码

仅校验学习码有效性，不修改 memberLevel。

**Endpoint:** `POST /api/user/verify-code`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `code` | String (Required) | 学习码 |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.valid` | Boolean | 学习码是否有效 |
| `data.memberLevel` | Integer | 当前会员级别 |

---

### 查询会员状态

含 30 天过期判断和学习码验证状态。

**Endpoint:** `GET /api/user/member-status`

#### Request Parameters

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.memberLevel` | Integer | 契约会员级别：0=未签约，1=已签约 |
| `data.codeStatus` | Integer | 学习码验证状态 |
| `data.lastActiveAt` | String | 最后活跃时间 (Optional) |

---

### 清除学习数据

软删除当前用户 + 克隆新用户，24 小时内可恢复。

**Endpoint:** `POST /api/user/clear-data`

#### Request Body

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.token` | String | 新用户的 JWT Token |
| `data.userId` | Long | 新用户 ID |
| `data.recoveryDeadline` | String | 数据恢复截止时间，格式 `yyyy-MM-dd HH:mm:ss` |

---

### 恢复学习数据

恢复之前清除的学习数据（新旧数据 deleted 互换）。

**Endpoint:** `POST /api/user/recover-data`

#### Request Body

无。

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.token` | String | 恢复后的 JWT Token |
| `data.userId` | Long | 恢复后的用户 ID |

---

## 邀请

### 获取邀请海报

返回用户专属动态海报（含小程序码），PNG 格式图片。

> ⚠️ 此接口不走 Authorization header。由于 `wx.downloadFile` 无法携带自定义 header，token 以 query param 传入。

**Endpoint:** `GET /api/invite/poster?token={token}`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `token` | String (Required) | JWT Token，因 `wx.downloadFile` 无法带 Authorization header 而通过 query param 传入 |

#### Response

PNG 图片二进制流，`Content-Type: image/png`。

---

### 获取邀请统计

**Endpoint:** `GET /api/invite/stats`

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.totalInvited` | Integer | 已邀请用户数 |
| `data.memberThreshold` | Integer | 升级为契约会员所需的推广人数阈值 |

---

## 名篇

### 获取名篇列表

返回名篇列表，支持按分类和教材年级筛选。

**Endpoint:** `GET /api/articles`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `category` | String | 分类筛选：`all` / `prose`(散文) / `argument`(论说) / `poem`(诗词) / `verse`(骈赋)。传入 `all` 或不传则不筛选 (Optional) |
| `textbook` | String | 教材年级筛选：`all` / `grade7a`~`grade9b`(初中) / `grade10a`~`grade12b`(高中)。传入 `all` 或不传则不筛选 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | String | 名篇 ID |
| `data[].title` | String | 标题 |
| `data[].author` | String | 作者 |
| `data[].dynasty` | String | 朝代 |
| `data[].category` | String | 文体分类 |
| `data[].textbook` | String | 教材年级 (Optional) |
| `data[].background` | String | 创作背景 (Optional) |
| `data[].fullTextAudioUrl` | String | 全文音频 URL (Optional) |
| `data[].keywordCount` | Integer | 关联的字词总数 |
| `data[].listened` | Boolean | 当前用户是否已听读（来自 user_audio_listen_log） |
| `data[].sentences` | Array\<ArticleSentence\> | 句子列表 |

**ArticleSentence 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `text` | String | 句子原文 |
| `translation` | String | 句子翻译 |
| `keyWords` | Array\<KeyWord\> | 内联生词列表 |
| `audioUrl` | String | 句子音频 URL (Optional) |
| `glossary` | Array\<GlossaryItem\> | 典故注释数据 (Optional) |
| `rareCharPinyin` | Record\<String, String\> | 生僻字拼音映射，如 `{ "愆": "qiān" }` (Optional) |

**KeyWord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `word` | String | 生词文本 |
| `definition` | String | 释义 |
| `matchWord` | String | 消歧片段：多字上下文，用于定位句中具体出现位置 (Optional) |
| `wordType` | String | 生词类型：`shi` / `xu` / `tongjia` / `gujinyi` / `huoyong` (Optional) |
| `kid` | String | 全局唯一标识（词书架构 v2） (Optional) |
| `masteryLevel` | String | 用户对该词的掌握程度 (Optional) |

**GlossaryItem 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `word` | String | 被标注的词或短语 |
| `definition` | String | 文化背景释义 |

---

### 获取名篇详情

返回指定名篇的完整内容。

**Endpoint:** `GET /api/articles/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Required) | 名篇 ID，如 `art_001` |

#### Response Fields

与名篇列表中单个元素一致，含全部句子。

---

## 内容

### 获取字词详情

根据字词 ID 返回完整的字词信息（含释义、例句、形近字等）。

**Endpoint:** `GET /api/words/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Required) | 字词 ID，如 `wb_mid_001_01` |

#### Response Fields

返回 `IWordEntry` 对象（结构与词书详情中的 wordEntries 元素一致），`null` 表示未找到。

---

### 全局搜索

根据关键词搜索字词。支持按汉字搜索，返回匹配字词的基本信息和义项。

**Endpoint:** `GET /api/words/search`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `keyword` | String (Required) | 搜索关键词（按汉字匹配） |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].entryId` | String | 字词 ID |
| `data[].character` | String | 汉字 |
| `data[].pinyin` | String | 拼音 |
| `data[].meanings` | Array | 义项列表（含 definition、example、translation、source） |
| `data[].wordBookName` | String | 所属词书名称 |
| `data[].wordBookId` | String | 所属词书 ID |

---

### 快捷搜索（按词类分组）

返回所有字词按词类（实词/虚词/通假字/古今异义/词类活用）分组，供快捷检索。

**Endpoint:** `GET /api/words/types`

#### Request Parameters

无。

#### Response Fields

返回 `Record<string, IWordQuickItem[]>`，key 为词类分组标识：

| Key | 含义 |
|-----|------|
| `shi` | 实词 |
| `xu` | 虚词 |
| `tongjia` | 通假字 |
| `gujinyi` | 古今异义 |
| `huoyong` | 词类活用 |

**IWordQuickItem 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `entryId` | String | 字词 ID |
| `character` | String | 汉字 |
| `pinyin` | String | 拼音 |

---

## 反馈

### 提交错误反馈

用户在学习或阅读过程中提交内容错误反馈。

**Endpoint:** `POST /api/feedback`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `category` | String (Required) | 错误类别：`sentence_text` / `translation` / `definition` / `source` / `annotation` / `article_info` / `other` |
| `source` | String (Required) | 反馈来源：`learning`(学习答题) / `word_summary`(字总结) / `article_reader`(名篇阅读) / `classic_reader`(经典阅读) |
| `description` | String (Required) | 用户补充描述 |
| `context.sentenceId` | String | 关联的句子 ID (Optional) |
| `context.wordId` | String | 关联的字词 ID (Optional) |
| `context.articleId` | String | 关联的名篇 ID (Optional) |
| `context.readingMode` | String | 名篇阅读模式 (Optional) |
| `context.classicId` | Integer | 关联的经典著作 ID (Optional) |
| `context.nodeId` | String | 关联的目录树节点 ID (Optional) |
| `context.nodeTitle` | String | 节点标题 (Optional) |
| `context.sentenceText` | String | 句子原文（学习板块） (Optional) |
| `context.articleTitle` | String | 文章标题（学习板块的出处 / 选篇板块的文章标题） (Optional) |
| `context.className` | String | 经典名称 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | String | 反馈 ID |

---

### 获取反馈列表

**Endpoint:** `GET /api/feedback`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `page` | Integer | 页码，默认 1 (Optional) |
| `pageSize` | Integer | 每页条数，默认 20 (Optional) |

#### Response Fields

分页结构，`data.list` 中各元素：

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | 反馈 ID |
| `category` | String | 错误类别 |
| `source` | String | 反馈来源 |
| `description` | String | 用户补充说明 |
| `nodeTitle` | String | 节点标题 (Optional) |
| `articleTitle` | String | 文章标题 (Optional) |
| `className` | String | 经典名称 (Optional) |
| `resolved` | Integer | 处理状态：0=未处理，1=已处理 |
| `reply` | String | 后台回复内容 (Optional) |
| `readAt` | String | 用户已读时间 (Optional) |
| `createdAt` | String | 创建时间 |
| `updatedAt` | String | 更新时间 |

---

### 获取反馈详情

**Endpoint:** `GET /api/feedback/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (Required) | 反馈 ID |

#### Response Fields

含完整 context 字段 + `reply` + `readAt`。

---

### 标记反馈为已读

**Endpoint:** `PUT /api/feedback/:id/read`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer (Required) | 反馈 ID |

#### Response

`data.success` = `true`。

---

### 获取未读反馈数量

获取已处理但用户尚未已读的反馈数量。

**Endpoint:** `GET /api/feedback/unread-count`

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.count` | Integer | 未读数量 |

---

## 意见建议

### 提交意见建议

**Endpoint:** `POST /api/suggestion`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `content` | String (Required) | 意见或建议内容 |
| `contact` | String | 联系方式 (Optional) |
| `category` | String | 分类 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | String | 建议 ID |

---

## 经典著作

### 获取经典著作列表

返回全部或按四部分类筛选的经典著作列表。

**Endpoint:** `GET /api/classics`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `category` | String | 四部分类筛选：`经` / `史` / `子` / `集`。不传则返回全部 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | Long | 经典著作 ID |
| `data[].name` | String | 经典名称，如"论语" |
| `data[].era` | String | 朝代，如"春秋" |
| `data[].icon` | String | emoji 图标 |
| `data[].description` | String | 简介 |
| `data[].category` | String | 四部分类：`经` / `史` / `子` / `集` |
| `data[].loadMode` | String | 加载方式：`full`=全量, `chunked`=按需 |
| `data[].navMode` | String | 导航方式：`strip` / `list` / `accordion` / `author` / `search` |
| `data[].isCompleted` | Integer | 是否已完成（人工维护）：0=未完成，1=已完成 (Optional) |

---

### 获取经典著作基本信息（含目录树）

返回经典著作的基本信息和目录树（轻量，不含全文）。`loadMode=full` 时顺带返回全文 `chapters` 字段。

**Endpoint:** `GET /api/classics/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | 经典著作 ID |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | Long | 经典著作 ID |
| `data.name` | String | 经典名称 |
| `data.author` | String | 作者 |
| `data.era` | String | 朝代 |
| `data.category` | String | 四部分类 |
| `data.description` | String | 简介 |
| `data.structureType` | String | 结构类型：`chapter`=章节型, `anthology`=选集型, `volume`=卷帙型 |
| `data.loadMode` | String | 加载方式：`full` / `chunked` |
| `data.navMode` | String | 导航方式：`strip` / `list` / `accordion` / `author` / `search` |
| `data.toc[]` | Array | 目录树节点列表 |
| `data.toc[].id` | String | 节点唯一标识 |
| `data.toc[].title` | String | 显示标题 |
| `data.toc[].level` | Integer | 层级深度（0/1/2） |
| `data.toc[].isLeaf` | Boolean | 是否叶子节点（可加载内容） |
| `data.toc[].children[]` | Array | 子节点（非叶子节点才有） |
| `data.toc[].author` | String | 篇章作者（选集型才填） (Optional) |
| `data.toc[].era` | String | 篇章朝代（选集型才填） (Optional) |
| `data.chapters[]` | Array | **[仅 loadMode=full 时返回]** 章节/段落/注释嵌套结构 |
| `data.listenedNodeIds[]` | Array\<String\> | 当前用户已听读的叶子节点 ID 列表 (Optional) |

---

### 获取经典著作内容块（按需加载）

按目录树叶子节点 ID 返回单个内容块（原文+译文+典故注释）。

**Endpoint:** `GET /api/classics/:id/content/:nodeId`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long | 经典著作 ID |
| `nodeId` | String | 目录树叶子节点 ID（对应 toc 中的 id） |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | String | 内容块 ID |
| `data.title` | String | 标题 |
| `data.author` | String | 篇章作者（选集型才填） (Optional) |
| `data.era` | String | 篇章朝代（选集型才填） (Optional) |
| `data.background` | String | 篇章创作背景 (Optional) |
| `data.audioUrl` | String | 章节预录音频 URL (Optional) |
| `data.text` | String | 完整原文（选集型/卷帙型用） |
| `data.translation` | String | 完整译文（可选） |
| `data.paragraphs[]` | Array | 段落列表（章节型用） |
| `data.paragraphs[].text` | String | 原文 |
| `data.paragraphs[].translation` | String | 现代文翻译 |
| `data.paragraphs[].glossary[]` | Array | 典故注释词条 |
| `data.paragraphs[].glossary[].word` | String | 标注词 |
| `data.paragraphs[].glossary[].explanation` | String | 文化背景说明 |
| `data.paragraphs[].rareCharPinyin` | Record\<String, String\> | 生僻字拼音映射 (Optional) |

---

## 系统公告

### 获取公告列表

公告列表（不含正文），置顶优先 + 发布时间降序。

**Endpoint:** `GET /api/announcements`

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | Long | 公告 ID |
| `data[].title` | String | 公告标题 |
| `data[].isPinned` | Boolean | 是否置顶 |
| `data[].publishTime` | String | 发布时间，格式 `yyyy-MM-dd HH:mm` |

---

### 获取公告详情

含正文内容。

**Endpoint:** `GET /api/announcements/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | Long (Required) | 公告 ID |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | Long | 公告 ID |
| `data.title` | String | 公告标题 |
| `data.content` | String | 公告正文 |
| `data.publishTime` | String | 发布时间，格式 `yyyy-MM-dd HH:mm` |

---

### 获取未读公告状态

**Endpoint:** `GET /api/announcements/unread`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `lastReadId` | Long | 客户端最后已读公告 ID，默认 0 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.hasUnread` | Boolean | 是否有未读公告 |
| `data.latestId` | Long | 最新公告 ID |
| `data.latestTitle` | String | 最新公告标题（预留） (Optional) |

---

## 管理后台

> ⚠️ 以下接口需要管理员权限，`/api/admin/**` 均不走登录拦截器（已全局放行）。

### 连通性测试

**Endpoint:** `POST /api/admin/ping`

---

### 全量导入

从本地 JSON 文件导入勋章等基础数据。

**Endpoint:** `POST /api/admin/import`

---

### 清除数据

按 scope 清除指定模块数据。

**Endpoint:** `POST /api/admin/clear-data`

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `scope` | String | 清除范围：`all`(全部) / `user` / `wordbook` / `article` / `classic`，默认 `all` (Optional) |

---

### 导入经典元数据

经典元数据全量导入（幂等 upsert）。支持无请求体（服务器本地知识库）或 JSON 请求体。

**Endpoint:** `POST /api/admin/import/classics`

#### Request Body

JSON 字符串（可选，不传则从服务器本地文件读取）。

---

### 导入选篇正文

选篇正文全量导入（幂等：先清空后插入）。

**Endpoint:** `POST /api/admin/import/articles`

#### Request Body

JSON 字符串（可选，不传则从服务器本地文件读取）。

---

### 导入单篇选篇

按 articleId 导入单篇选篇正文（幂等：先删后插）。

**Endpoint:** `POST /api/admin/import/articles/{articleId}`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `articleId` | String (Required) | 名篇 ID |

---

### 导入典故注释

按 articleId 导入单篇典故注释（幂等：先删后插）。

**Endpoint:** `POST /api/admin/import/glossary/{articleId}`

---

### 导入单本词书

单本词书独立导入（幂等：先删后插）。

**Endpoint:** `POST /api/admin/import/wordbook`

---

### 导入经典章节内容

幂等导入一部经典著作的章节、段落及典故注释数据。该经典已有的旧内容会被先删除再插入。

**Endpoint:** `POST /api/admin/import/classic/{classicId}`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `classicId` | Long | 经典著作 ID（classic 表主键） |

#### Request Body

JSON 数组，格式与知识库 `chapters.json` 一致：

| Field | Type | Description |
|-------|------|-------------|
| `[].id` | Integer | 章节原始 ID |
| `[].title` | String | 章目标题 |
| `[].paragraphs[]` | Array | 段落数组 |
| `[].paragraphs[].text` | String | 原文 |
| `[].paragraphs[].translation` | String | 现代文翻译 |
| `[].paragraphs[].glossary[]` | Array | 典故注释（可选） |
| `[].paragraphs[].glossary[].word` | String | 标注词 |
| `[].paragraphs[].glossary[].explanation` | String | 文化背景说明 |

---

### 导入经典典故注释

经典典故注释独立导入（幂等：先删后插，渐进式）。仅在匹配到的段落上更新注释，不修改正文/译文。

**Endpoint:** `POST /api/admin/import/classic/{classicId}/glossary`

---

### 生成学习码

管理员生成学习码（不绑定用户，用户在小程序输入后认领）。

**Endpoint:** `POST /api/admin/generate-code`

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.code` | String | 生成的学习码 |

---

### TTS 合成选篇音频

拼接选篇全部句子，调讯飞长文本 TTS 合成全文音频。

**Endpoint:** `POST /api/admin/tts/article/{articleId}`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `articleId` | String (Required) | 名篇 ID |

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `vcn` | String (Optional) | 讯飞发音人，如 `x4_yezi` |

---

### TTS 合成经典章节音频

拼接经典章节全部段落，调讯飞长文本 TTS 合成音频。

**Endpoint:** `POST /api/admin/tts/classic-chapter/{chapterId}`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `chapterId` | Long (Required) | 章节 ID |

#### Query Parameters

| Field | Type | Description |
|-------|------|-------------|
| `vcn` | String (Optional) | 讯飞发音人，如 `x4_mingge` |

---

## 微信公众号回调

> ⚠️ 以下接口不走登录拦截器（微信服务器无 JWT），用于服务号消息回调。

### 微信服务器 URL 验证 / 消息接收

**Endpoint:** `GET|POST /api/wechat/mp/portal`

微信服务号标准回调接口。GET 用于 URL 有效性验证，POST 用于接收消息/事件推送。

---

## 附录

### 枚举值速查

#### WordBookCategory — 词书分类

| 值 | 含义 |
|----|------|
| `middle_school` | 初中 |
| `high_school` | 高中 |
| `function` | 虚词（当前合并到初中词书） |
| `tongjia` | 通假字（当前合并到初中词书） |
| `ancient_modern` | 古今异义 |
| `flexible_usage` | 词类活用 |

#### StudyMode — 学习模式

| 值 | 含义 |
|----|------|
| `standard` | 直接选题作答 |
| `identify_first` | 先从句子中识别目标字，再作答 |
| `readonly` | 纯阅读浏览（虚词用法等） |

#### ExamLevel — 考试级别

| 值 | 含义 |
|----|------|
| `zhongkao` | 中考 |
| `gaokao` | 高考 |

#### WordType — 字词类型（v2 拼音码）

| 值 | 含义 |
|----|------|
| `shi` | 实词 |
| `xu` | 虚词 |
| `tongjia` | 通假字 |
| `gujinyi` | 古今异义 |
| `huoyong` | 词类活用 |

#### SentenceDifficulty — 句子难度

| 值 | 含义 |
|----|------|
| `basic` | 基础 |
| `medium` | 中等 |
| `hard` | 困难 |

#### ArticleCategory — 名篇分类

| 值 | 含义 |
|----|------|
| `prose` | 散文 |
| `argument` | 论说 |
| `poem` | 诗词 |
| `verse` | 骈赋 |

#### TextbookGrade — 教材年级

| 值 | 含义 |
|----|------|
| `grade7a` | 七年级上 |
| `grade7b` | 七年级下 |
| `grade8a` | 八年级上 |
| `grade8b` | 八年级下 |
| `grade9a` | 九年级上 |
| `grade9b` | 九年级下 |
| `grade10a` | 高一上 |
| `grade10b` | 高一下 |
| `grade11a` | 高二上 |
| `grade11b` | 高二下 |
| `grade12a` | 高三 |

#### MasteryLevel — 掌握程度

| 值 | 含义 |
|----|------|
| `new` | 未学 |
| `difficult` | 困难 |
| `unclear` | 模糊 |
| `familiar` | 熟悉 |
| `mastered` | 已掌握 |

#### ReviewStage — 艾宾浩斯复习阶段

| 值 | 含义 |
|----|------|
| `0` | 新学，当天复习 |
| `1` | 1 天后 |
| `2` | 2 天后 |
| `3` | 4 天后 |
| `4` | 7 天后 |
| `5` | 15 天后 |
| `6` | 30 天后 |
| `"done"` | 已完成全部复习 |

#### FeedbackCategory — 反馈类别

| 值 | 含义 |
|----|------|
| `sentence_text` | 原文有误 |
| `translation` | 译文有误 |
| `definition` | 释义有误 |
| `source` | 出处有误 |
| `annotation` | 标注有误 |
| `article_info` | 文章信息有误 |
| `other` | 其他 |

#### FeedbackSource — 反馈来源

| 值 | 含义 |
|----|------|
| `learning` | 学习答题 |
| `word_summary` | 字总结 |
| `article_reader` | 名篇阅读 |
| `classic_reader` | 经典阅读 |

#### ClassicCategory — 四部分类

| 值 | 含义 |
|----|------|
| `经` | 经部 — 儒家经典十三经及其注疏 |
| `史` | 史部 — 正史、编年、纪事本末等史学著作 |
| `子` | 子部 — 诸子百家及释道宗教之作 |
| `集` | 集部 — 诗文词曲等文学总集与别集 |

#### LoadMode — 加载方式

| 值 | 含义 |
|----|------|
| `full` | 全量加载 — 一次请求返回全部内容（适用于 <100KB 的经典） |
| `chunked` | 按需加载 — 先取目录树，叶子节点内容按需请求（适用于 >100KB 的经典） |

#### NavMode — 导航方式

| 值 | 含义 |
|----|------|
| `strip` | 顶部横向滚动条 — 适用于 ≤20 个平级条目的经典 |
| `list` | 纵向可滚动列表 — 适用于 20–200 个平级条目的经典 |
| `accordion` | 手风琴折叠面板 — 适用于有分组/两级层级结构的经典 |
| `author` | 作者分组导航 — 按作者分组展示 |
| `search` | 搜索 + 分页列表 — 适用于 >200 条目的大体量经典 |

#### StructureType — 经典结构类型

| 值 | 含义 |
|----|------|
| `chapter` | 章节型 — 天然分章，每章内容可独立阅读（如论语、孙子兵法） |
| `anthology` | 选集型 — 多篇/多首独立条目（如诗经、唐诗三百首） |
| `volume` | 卷帙型 — 按卷/编/年份组织，体量较大（如史记、资治通鉴） |
