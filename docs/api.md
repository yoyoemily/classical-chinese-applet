# 文言雀 API 文档

> 文言雀——文言文学习小程序后端 REST API，提供词书、学习、名篇、进度、生词本、打卡、勋章、用户等模块的数据服务。

## General API Information

| Item | Value |
|------|-------|
| Base Endpoint | `https://api.example.com`（开发时替换为正式地址） |
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
| 10003 | 资源不存在 | 请求的词书/名篇/字词等不存在 |
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
| `data[].studyMode` | String | 学习模式：`standard`（直接选题）或 `identify_first`（先识别目标字再选题） |
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
| `data.studyMode` | String | 学习模式：`standard` 或 `identify_first` |
| `data.identifyPrompt` | String? | 前置步骤提示文案 |
| `data.examLevel` | String | 考试级别：`zhongkao` 或 `gaokao` |
| `data.initialized` | Boolean | 词书是否已完成数据初始化 |
| `data.totalWords` | Integer | 字词总数 |
| `data.words` | Array\<Word\> | 字词列表 |

**Word 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | 字词 ID |
| `character` | String | 汉字 |
| `pinyin` | String | 拼音 |
| `characterType` | String | 字型：象形字/指事字/会意字/形声字 (Optional) |
| `explanation` | String | 字形解释 (Optional) |
| `oracleForm` | String | 甲骨文图片 URL (Optional) |
| `examFrequency` | String | 考试频次，如"5年3考" (Optional) |
| `meanings` | Array\<Meaning\> | 义项列表 |
| `sentences` | Array\<Sentence\> | 考题句子列表 |
| `similarHomophones` | Array\<String\> | 同音易混字 |
| `similarShapes` | Array\<String\> | 形近字 |
| `mnemonic` | String | 记忆口诀 (Optional) |
| `wordType` | String | 字词类型：`实词` / `虚词` / `通假字` (Optional) |

**Meaning 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `definition` | String | 释义说明 |
| `pinyin` | String | 该义项的读音，多音字时区分 (Optional) |
| `example` | String | 例句原文 |
| `translation` | String | 例句翻译 (Optional) |
| `source` | String | 例句出处，如"《论语·为政》" (Optional) |

**Sentence 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | 句子 ID |
| `text` | String | 句子原文 |
| `source` | String | 句子出处 |
| `translation` | String | 整句翻译 |
| `targetWord` | String | 考查的目标字 |
| `correctMeaningIndex` | Integer | 正确答案在 `distractors[]` 中的序号（0-based） |
| `difficulty` | String | 难度：`basic` / `medium` / `hard` |
| `distractors` | Array\<String\> | 干扰项列表 |
| `fullText` | String | 该句所在段落的全文 (Optional) |
| `articleId` | String | 关联的名篇 ID (Optional) |
| `audioUrl` | String | 预录音频 URL (Optional) |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "id": "wb_zhongkao_001",
        "name": "字海拾贝·中考篇",
        "description": "涵盖中考大纲全部核心文言字词，包含实词、虚词、通假字三大类，覆盖七至九年级统编版教材全部重点字词。",
        "category": "middle_school",
        "coverColor": "#4a6a5e",
        "totalWords": 75,
        "words": [
            {
                "id": "wb_mid_001_01",
                "character": "而",
                "pinyin": "ér",
                "characterType": "象形字",
                "explanation": "甲骨文像面颊胡须之形，本义为胡须。后假借为连词。",
                "examFrequency": "5年4考",
                "meanings": [
                    {
                        "definition": "表示并列关系，可译为\"和\"\"又\"\"并且\"",
                        "pinyin": "ér",
                        "example": "敏而好学，不耻下问。",
                        "translation": "聪敏并且爱好学习，不以向不如自己的人请教为耻。",
                        "source": "《论语·公冶长》"
                    }
                ],
                "sentences": [
                    {
                        "id": "s_001_01_1",
                        "text": "学而不思则罔，思而不学则殆。",
                        "source": "《论语·为政》",
                        "translation": "只学习而不思考就会迷惑。",
                        "targetWord": "而",
                        "correctMeaningIndex": 1,
                        "difficulty": "basic",
                        "distractors": ["和，又，并且", "地，着", "就，然后"],
                        "fullText": "子曰：\"学而不思则罔，思而不学则殆。\"",
                        "articleId": "art_002"
                    }
                ],
                "similarHomophones": ["尔", "耳", "儿"],
                "similarShapes": ["面", "耐", "耍"],
                "mnemonic": "而字本义是胡须，后借用为连词。记住四个主要用法：并列又，转折却，承接就，修饰着。",
                "wordType": "虚词"
            }
        ]
    }
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

**TodayWord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `wordId` | String | 字词 ID |
| `character` | String | 汉字 |
| `isReview` | Boolean | 是否为复习（true=复习，false=新学） |
| `reviewStage` | Integer \| String | 当前复习阶段：0–6 或 `"done"` (Optional) |
| `sentences` | Array\<Sentence\> | 该字的考题句子 |

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
                "wordId": "wb_mid_001_01",
                "character": "而",
                "isReview": true,
                "reviewStage": 3,
                "sentences": [
                    {
                        "id": "s_001_01_1",
                        "text": "学而不思则罔，思而不学则殆。",
                        "source": "《论语·为政》",
                        "translation": "只学习而不思考就会迷惑。",
                        "targetWord": "而",
                        "correctMeaningIndex": 1,
                        "difficulty": "basic",
                        "distractors": ["和，又，并且", "地，着", "就，然后"]
                    }
                ]
            }
        ],
        "newWords": [
            {
                "wordId": "wb_mid_001_06",
                "character": "乃",
                "isReview": false,
                "sentences": [
                    {
                        "id": "s_001_06_1",
                        "text": "乃悟前狼假寐，盖以诱敌。",
                        "source": "《狼》",
                        "translation": "这才明白前面那只狼假装睡觉。",
                        "targetWord": "乃",
                        "correctMeaningIndex": 0,
                        "difficulty": "basic",
                        "distractors": ["竟然，却", "是，就是", "你"]
                    }
                ]
            }
        ],
        "totalWords": 7,
        "estimatedMinutes": 10
    }
}
```

---

### 提交答题结果

记录用户对某个句子的一次答题结果，服务端据此更新该字的艾宾浩斯进度。

**Endpoint:** `POST /api/study/answer`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `wordBookId` | String (Required) | 当前词书 ID |
| `wordId` | String (Required) | 考查的字词 ID |
| `sentenceId` | String (Required) | 考题句子 ID |
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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "updatedProgress": {
            "stage": 4,
            "nextReviewDate": "2026-07-10",
            "correctCount": 5,
            "wrongCount": 1
        }
    }
}
```

> **关于 `correctAnswer` / `wrongAnswer`**：前端 shuffle 后选项顺序不确定，后端无法通过 `selectedOption` 序号还原答案文本。因此由前端在 `submitAnswer` 时直接传入正确答案和用户答案的文本，后端直接写入错题本。两个字段均为可选，不传时后端从数据库兜底取值（可能不准确）。

#### Example: Error
用

```json
HTTP/1.1 400 Bad Request
{
    "code": 10001,
    "message": "sentenceId 不存在",
    "data": null
}
```

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "newBadges": [
            {
                "id": "badge_streak_7",
                "name": "日积月累",
                "description": "累计学习 7 天",
                "icon": "🥈",
                "category": "streak",
                "condition": { "type": "streak", "value": 7 }
            }
        ],
        "xpGained": 50
    }
}
```

---

---

## 错题本

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
| `data[].wordId` | String | 字词 ID |
| `data[].character` | String | 汉字 |
| `data[].pinyin` | String | 拼音 |
| `data[].totalErrors` | Integer | 所有句子的错误次数之和（冗余字段，避免前端遍历计算） |
| `data[].lastErrorTime` | String | 最近一次答错时间，格式 `YYYY-MM-DD` |
| `data[].sentences` | Array\<MistakeSentence\> | 该字的答错句子明细 |

**MistakeSentence 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `sentenceId` | String | 句子 ID |
| `sentenceText` | String | 答错时的原句 |
| `wrongAnswer` | String | 用户选择的错误答案 |
| `correctAnswer` | String | 正确答案 |
| `errorCount` | Integer | 该句子的累计错误次数 |
| `consecutiveCorrect` | Integer | 该句子的连续答对次数 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        {
            "wordId": "wb_c_001",
            "character": "安",
            "pinyin": "ān",
            "totalErrors": 4,
            "lastErrorTime": "2026-07-07",
            "sentences": [
                {
                    "sentenceId": "s_c_0001",
                    "sentenceText": "燕雀安知鸿鹄之志哉？",
                    "wrongAnswer": "安定，安稳",
                    "correctAnswer": "怎么，哪里（表示反问）",
                    "errorCount": 3,
                    "consecutiveCorrect": 0
                },
                {
                    "sentenceId": "s_c_0004",
                    "sentenceText": "衣食所安，弗敢专也。",
                    "wrongAnswer": "怎么，哪里",
                    "correctAnswer": "养，使……安定",
                    "errorCount": 1,
                    "consecutiveCorrect": 0
                }
            ]
        }
    ]
}
```

---

### 移除错题

手动移除指定字词的全部错题记录（含所有句子明细）。

**Endpoint:** `DELETE /api/study/mistakes/:wordId`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wordId` | String (Required) | 要移除的字词 ID |

#### Response

无 data 内容。

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": null
}
```

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
| `data.currentStreak` | Integer | 当前连续学习天数 |
| `data.longestStreak` | Integer | 历史最长连续学习天数 |
| `data.totalXP` | Integer | 累计经验值 |
| `data.wordProgresses` | Object | 字词进度映射，key 为 wordId |
| `data.articleProgresses` | Object | 名篇进度映射，key 为 articleId |

**wordProgresses[wordId] 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `wordId` | String | 字词 ID |
| `stage` | Integer \| String | 复习阶段：0–6 或 `"done"` |
| `nextReviewDate` | String | 下次复习日期，格式 `YYYY-MM-DD` |
| `correctCount` | Integer | 累计答对次数 |
| `wrongCount` | Integer | 累计答错次数 |
| `resetCount` | Integer | 重置次数（遗忘后重新开始） |
| `history` | Array\<AnswerRecord\> | 答题历史记录 |

**AnswerRecord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `sentenceId` | String | 句子 ID |
| `selectedOption` | Integer | 选择的选项序号 |
| `correct` | Boolean | 是否答对 |
| `timestamp` | Long | 答题时间戳（ms） |

**articleProgresses[articleId] 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `articleId` | String | 名篇 ID |
| `readProgress` | Integer | 已点击阅读的句子数 |
| `mastery` | String | 掌握程度：`none` / `read` / `understood` / `memorized` |
| `lastReadDate` | String | 最后阅读日期 (Optional) |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "wordBookId": "wb_zhongkao_001",
        "wordsLearned": 8,
        "wordsMastered": 3,
        "checkinDates": ["2026-07-01", "2026-07-02", "2026-07-03"],
        "currentStreak": 3,
        "longestStreak": 5,
        "totalXP": 320,
        "wordProgresses": {
            "wb_mid_001_01": {
                "stage": 4,
                "nextReviewDate": "2026-07-10",
                "correctCount": 4,
                "wrongCount": 1,
                "resetCount": 0,
                "history": [
                    {
                        "sentenceId": "s_001_01_1",
                        "selectedOption": 1,
                        "correct": true,
                        "timestamp": 1720000000000
                    }
                ]
            }
        },
        "articleProgresses": {
            "art_001": {
                "articleId": "art_001",
                "readProgress": 3,
                "mastery": "read",
                "lastReadDate": "2026-07-02"
            }
        }
    }
}
```

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "list": [
            {
                "wordId": "wb_mid_001_01",
                "character": "而",
                "pinyin": "ér",
                "masteryLevel": "familiar",
                "progress": 67,
                "stage": 4
            },
            {
                "wordId": "wb_mid_001_03",
                "character": "以",
                "pinyin": "yǐ",
                "masteryLevel": "difficult",
                "progress": 17,
                "stage": 1
            }
        ],
        "total": 2,
        "page": 1,
        "pageSize": 20,
        "hasMore": false
    }
}
```

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        "2026-07-01",
        "2026-07-02",
        "2026-07-03"
    ]
}
```

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "badges": [
            {
                "id": "badge_streak_3",
                "name": "初识文言",
                "description": "累计学习 3 天",
                "icon": "🥉",
                "category": "streak",
                "condition": { "type": "streak", "value": 3 }
            },
            {
                "id": "badge_streak_7",
                "name": "日积月累",
                "description": "累计学习 7 天",
                "icon": "🥈",
                "category": "streak",
                "condition": { "type": "streak", "value": 7 }
            }
        ],
        "userBadges": [
            {
                "badgeId": "badge_streak_3",
                "earnedDate": "2026-07-03",
                "notified": true
            }
        ]
    }
}
```

---

## 用户

### 获取用户等级信息

返回用户的等级、称号、经验值和连续学习天数。

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "level": 4,
        "title": "举人",
        "totalXP": 320,
        "currentStreak": 3
    }
}
```

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
| `data.grade` | String | 年级，如 `grade7a` 或空字符串 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "avatarUrl": "https://example.com/avatars/123.png",
        "nickName": "小明",
        "grade": "grade8a"
    }
}
```

---

### 保存个人信息

更新用户的个人资料。

**Endpoint:** `PUT /api/user/info`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `avatarUrl` | String (Required) | 头像 URL |
| `nickName` | String (Required) | 昵称 |
| `grade` | String (Required) | 年级，如 `grade8a`，可为空字符串 |

#### Response

无 data 内容。

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": null
}
```

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
| `data[].fullTextAudioUrl` | String | 全文音频 URL (Optional) |
| `data[].sentences` | Array\<ArticleSentence\> | 句子列表 |
| `data[].relatedWordIds` | Array\<String\> | 关联的字词 ID |

**ArticleSentence 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `text` | String | 句子原文 |
| `translation` | String | 句子翻译 |
| `keyWords` | Array\<KeyWord\> | 内联生词列表 |
| `audioUrl` | String | 句子音频 URL (Optional) |
| `charAnnotations` | Array\<CharAnnotation\> | 逐字标注数据 (已废弃，保留兼容) (Optional) |
| `glossary` | Array\<GlossaryItem\> | 典故注释数据 (Optional) |

**KeyWord 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `word` | String | 生词文本 |
| `definition` | String | 释义 |
| `wordBookId` | String | 所属词书 ID (Optional) |
| `masteryLevel` | String | 用户对该词的掌握程度 (Optional) |

**CharAnnotation 对象（已废弃）：**

| Field | Type | Description |
|-------|------|-------------|
| `char` | String | 单个汉字或标点 |
| `role` | String | 角色：`content`(实词) / `function`(虚词) / `punct`(标点) |
| `definition` | String | 释义，实词必填，虚词可选，标点无 (Optional) |

**GlossaryItem 对象：**

| Field | Type | Description |
|-------|------|-------------|
| `word` | String | 被标注的词或短语 |
| `definition` | String | 文化背景释义 |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        {
            "id": "art_001",
            "title": "岳阳楼记",
            "author": "范仲淹",
            "dynasty": "北宋",
            "category": "prose",
            "textbook": "grade9a",
            "sentences": [
                {
                    "text": "庆历四年春，滕子京谪守巴陵郡。",
                    "translation": "庆历四年的春天，滕子京被贬官到巴陵郡做太守。",
                    "keyWords": [
                        { "word": "谪", "definition": "贬官降职", "wordBookId": "wb_mid_001_01" }
                    ],
                    "glossary": [
                        { "word": "庆历", "definition": "宋仁宗赵祯的年号（1041-1048年）" },
                        { "word": "滕子京", "definition": "名宗谅，字子京，与范仲淹同为祥符八年进士" }
                    ]
                }
            ],
            "relatedWordIds": ["wb_mid_001_01", "wb_mid_001_03"]
        }
    ]
}
```

---

### 获取名篇详情

返回指定名篇的完整内容。

**Endpoint:** `GET /api/articles/:id`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (Required) | 名篇 ID，如 `art_001` |

#### Response Fields

与名篇列表中单个元素一致（`IArticle` 结构），含全部句子。

#### Example: Error

```json
HTTP/1.1 404 Not Found
{
    "code": 10003,
    "message": "名篇不存在",
    "data": null
}
```

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

返回 `Word` 对象（结构与词书详情中的 words 元素一致），`null` 表示未找到。

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "id": "wb_mid_001_01",
        "character": "而",
        "pinyin": "ér",
        "characterType": "象形字",
        "explanation": "甲骨文像面颊胡须之形，本义为胡须。后假借为连词。",
        "examFrequency": "5年4考",
        "meanings": [
            {
                "definition": "表示并列关系，可译为\"和\"\"又\"\"并且\"",
                "example": "敏而好学，不耻下问。",
                "source": "《论语·公冶长》"
            }
        ],
        "sentences": [],
        "similarHomophones": ["尔", "耳", "儿"],
        "similarShapes": ["面", "耐", "耍"],
        "mnemonic": "而字本义是胡须，后借用为连词。"
    }
}
```

---

### 获取全文

根据句子 ID 查找其所在篇目的完整全文内容。

**Endpoint:** `GET /api/full-text/:sentenceId`

#### Path Parameters

| Field | Type | Description |
|-------|------|-------------|
| `sentenceId` | String (Required) | 句子 ID，如 `s_001_01_1` |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.title` | String | 文章标题 |
| `data.author` | String | 作者 |
| `data.content` | String | 全文内容 |

`null` 表示未找到关联全文。

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "title": "《论语·为政》",
        "author": "",
        "content": "子曰：\"学而不思则罔，思而不学则殆。\""
    }
}
```

---

## 反馈

### 提交错误反馈

用户在学习或阅读过程中提交内容错误反馈。

**Endpoint:** `POST /api/feedback`

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `category` | String (Required) | 错误类别：`sentence_text` / `translation` / `definition` / `source` / `annotation` / `article_info` / `other` |
| `source` | String (Required) | 反馈来源：`learning`(学习答题) / `word_summary`(字总结) / `article_reader`(名篇阅读) |
| `description` | String (Required) | 用户补充描述 |
| `context.sentenceId` | String | 关联的句子 ID (Optional) |
| `context.wordId` | String | 关联的字词 ID (Optional) |
| `context.articleId` | String | 关联的名篇 ID (Optional) |
| `context.readingMode` | String | 名篇阅读模式 (Optional) |

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data.id` | String | 反馈 ID |

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": {
        "id": "fb_1720000000001"
    }
}
```

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

#### Example: Success

```json
HTTP/1.1 200 OK
{
    "code": 0,
    "message": "ok",
    "data": [
        {
            "id": 1,
            "name": "论语",
            "era": "春秋",
            "icon": "📖",
            "description": "孔子及其弟子的言行录，儒家核心经典...",
            "category": "经"
        },
        {
            "id": 2,
            "name": "孟子",
            "era": "战国",
            "icon": "📜",
            "description": "孟子与其弟子所著...",
            "category": "经"
        }
    ]
}
```

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

#### ExamLevel — 考试级别

| 值 | 含义 |
|----|------|
| `zhongkao` | 中考 |
| `gaokao` | 高考 |

#### WordType — 字词类型

| 值 | 含义 |
|----|------|
| `实词` | 实词 |
| `虚词` | 虚词 |
| `通假字` | 通假字 |

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
| `grade12a` | 高三上 |
| `grade12b` | 高三下 |

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

#### ClassicCategory — 四部分类

| 值 | 含义 |
|----|------|
| `经` | 经部 — 儒家经典十三经及其注疏 |
| `史` | 史部 — 正史、编年、纪事本末等史学著作 |
| `子` | 子部 — 诸子百家及释道宗教之作 |
| `集` | 集部 — 诗文词曲等文学总集与别集 |

#### FeedbackSource — 反馈来源

| 值 | 含义 |
|----|------|
| `learning` | 学习答题 |
| `word_summary` | 字总结 |
| `article_reader` | 名篇阅读 |
