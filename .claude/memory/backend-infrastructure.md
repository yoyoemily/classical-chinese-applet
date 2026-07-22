---
name: backend-infrastructure
description: Spring Boot 3.2 后端微服务，位于 /Users/zhutx/IdeaProjects/classical-chinese/，完整对接小程序 15 个 API
metadata:
  type: project
  node_type: memory
---

## 后端工程

后端已独立为 Spring Boot 微服务工程，位于 `/Users/zhutx/IdeaProjects/classical-chinese/`，与小程序前端项目分离。

### 技术摘要

| 项 | 说明 |
|----|------|
| 框架 | Spring Boot 3.2.1 + Java 17 |
| ORM | MyBatis-Plus 3.5.5（BaseMapper，零 SQL） |
| 数据库 | MySQL 8.0，库名 `classical_chinese`，24 张表 |
| `word_book` 表新增 | `exam_level` VARCHAR(10) DEFAULT 'zhongkao'（考试级别）、`initialized` TINYINT(1) DEFAULT 0（数据是否已初始化） |
| 端口 | `8080` |
| 基包 | `com.bogutongjin` |
| 工具 | Hutool 5.8、JWT 0.12、Lombok、pinyin4j 2.5.1 |

### 工程结构（85+ 源文件）

```
src/main/java/com/bogutongjin/
├── ClassicalChineseApplication.java  # 启动入口
├── common/      # Result<T> 统一响应、GlobalExceptionHandler（含 401 处理）、业务异常、AuthException
├── annotation/  # @CurrentUser（注入当前用户 ID 的 Controller 参数注解）
├── util/        # JwtUtil（JWT 签发/解析/校验）、PinyinUtils（生僻字拼音，pinyin4j）
├── config/      # MyBatis-Plus 分页、跨域、LoginInterceptor、CurrentUserResolver、WebMvcConfig
├── entity/      # 23 个实体
├── mapper/      # 23 个 Mapper
├── dto/         # SourceData + LoginRequest + SubmitAnswerRequest 等请求 DTO（5 个）
├── service/     # 12 个 Service：Auth（微信登录+JWT）、WordBook、Study、Progress、Vocabulary、Checkin、Badge、User、Article、Classic、Content、Feedback、DataImport
└── controller/  # 13 个 Controller：Auth + 12 业务 + 管理导入，完整覆盖前端 16 个 API + 登录 + 导入
```

### API 对照（13 个 Controller → 17 个 HTTP 端点）

| Controller | 端点 |
|------------|------|
| AuthController | `POST /api/auth/login`（微信 code → JWT） |
| WordBookController | `GET /api/wordbooks`、`GET /api/wordbooks/:id` |
| StudyController | `GET /api/study/today`、`POST /api/study/answer`、`POST /api/study/complete` |
| ProgressController | `GET /api/progress` |
| VocabularyController | `GET /api/vocabulary` |
| CheckinController | `GET /api/checkin` |
| BadgeController | `GET /api/badges` |
| UserController | `GET /api/user/profile`、`GET /api/user/info`、`PUT /api/user/info` |
| ArticleController | `GET /api/articles`、`GET /api/articles/:id` |
| ClassicController | `GET /api/classics?category=` |
| ContentController | `GET /api/words/:id`、`GET /api/full-text/:sentenceId` |
| FeedbackController | `POST /api/feedback` |
| ImportController | `POST /api/admin/import`、`POST /api/admin/import/articles`、`POST /api/admin/import/wordbook`、`POST /api/admin/import/glossary/{articleId}`、`POST /api/admin/clear-data?scope=`（管理后台） |

响应格式统一为 `{code: 0, message: "ok", data: ...}`。

### 认证机制

**后端核心文件**：`util/JwtUtil.java`（签发/解析/校验）、`annotation/CurrentUser.java`、`config/LoginInterceptor.java`、`config/CurrentUserResolver.java`、`config/WebMvcConfig.java`、`controller/AuthController.java`、`service/AuthService.java`

**认证流程**：
```
小程序 wx.login() → code
    ↓ POST /api/auth/login { code }
AuthService.code2session(code) → 微信 API → openId
    ↓ UserMapper 查找 openId → 不存在则 INSERT 创建新用户
JwtUtil.generate(userId) → 签发 JWT（有效期 7 天）
    ↓ 返回 { token, userId } → 小程序存储
后续请求: request.ts 自动带 Authorization: Bearer <token>
    ↓ LoginInterceptor 解析 JWT → request.setAttribute("userId")
    ↓ CurrentUserResolver → @CurrentUser Long userId → Controller
401 → request.ts 自动 reLogin()（防并发）→ 重试原请求
```

**关键设计决策**：
- JWT 仅含 `sub`（userId），无其他敏感信息
- 新用户自动创建：首次 `wx.login()` 自动在 `user` 表创建记录，无需注册流程
- 防并发登录：`request.ts` 中 `isLoggingIn` + `loginPromise` 复用
- 放行路径：`/api/auth/login`、`/api/admin/import`
- Controller 层改造（`@RequestParam` → `@CurrentUser`），Service 层无感

**生产环境**：`WECHAT_APP_SECRET` 已配置真实值，微信登录正常对接。

**前端侧**：`app.ts` onLaunch 调用 `reLogin()`（从 `request.ts` 导入）；`request.ts` 自动带 token + 401 re-login；`constants/config.ts` 中 `STORAGE_KEYS.TOKEN = 'authToken'`。

### 数据导入

- 源文件：`src/main/resources/source.json`（8 本词书 + 8 勋章 + 36 部经典著作；选篇正文已独立到知识库 `文言文/选篇/正文/articles_*.json`）
- 与知识库 `~/Documents/knowledge_library/文言文/词书/` 下的独立 JSON 文件内容一致
- 每字含 `wordType` 字段（实词/虚词/通假字）
- `word` 表含 `word_type` 列，DataImportService 导入时写入
- `WordBookService.getWordBookDetail()` 和 `ContentService.getWordDetail()` 均返回 `wordType`
- 建表：`data/schema.sql`（24 张表）
- **全量导入**：`POST /api/admin/import` → `DataImportService.importFromJson()` → JDBC Template 批量 INSERT 勋章，不涉及数据清空
- **业务数据清理**：`POST /api/admin/clear-data?scope=` → `DataImportService.clearAll()/clearUserData()/clearWordBookData()/clearArticleData()/clearClassicData()`，5 种 scope，全部 TRUNCATE TABLE，配合 `clear_data.sh` 使用
- **选篇正文导入**：`POST /api/admin/import/articles` → `DataImportService.importArticlesFromJson()`，从知识库 11 个年级分文件 + 1 个壳文章文件合并后导入，幂等（先清空文章相关表后全量重插）
- **单本词书导入**：`POST /api/admin/import/wordbook` → `DataImportService.importWordBook()`，接收 `SourceWordBook` JSON 请求体，幂等（只删该词书关联数据后重插，不影响其他词书/名篇/勋章/经典）
- **典故注释导入**：`POST /api/admin/import/glossary/{articleId}` → `DataImportService.importGlossaryForArticle()`，幂等（先删后插）

### 启动

1. 建库：`mysql -u root -p < data/schema.sql`
2. 配置数据库密码：`application.yml` → `spring.datasource.password`
3. IDEA 打开项目，运行 `ClassicalChineseApplication`
4. 导入数据：`curl -X POST http://localhost:8080/api/admin/import`

### 与前端的对接方式

小程序前端将 `api/index.ts` 中 `USE_MOCK = false`，`utils/request.ts` 中 `BASE_URL = 'http://localhost:8080'` 即可对接。艾宾浩斯引擎仍保留客户端调度，服务端负责记录结果、打卡、勋章。

**Why:** 前端和后端职责分离，前端专注小程序 UI 和艾宾浩斯客户端调度，后端提供 REST API 和持久化。

**How to apply:** 对接时只需关注 `api/index.ts` 中的 `USE_MOCK` 开关和 `utils/request.ts` 中的 `BASE_URL`。所有 API 接口路径无需修改。

### 导入顺序

冷启动完整命令序（每个脚本只管自己的事，互不覆盖）：

```
./clear_data.sh all → import_all.sh → import_articles.sh → import_glossaries.sh
    → import_wordbook.sh --all → import_classic_list.sh → import_classic.sh --all
```

| 顺序 | 脚本 | 数据源 | 内容 |
|:--:|------|------|------|
| 0 | `clear_data.sh` | — | 清理业务数据（all/user/wordbook/article/classic 5 种 scope） |
| 1 | `import_all.sh` | `source.json` | 勋章定义导入 `badge` 表 |
| 2 | `import_articles.sh` | 知识库 `articles_*.json`（11 个年级分文件 + 1 个壳文章文件） | 选篇正文 + keyWord 标注 |
| 3 | `import_glossaries.sh` | 知识库 `art_*.json` | 选篇典故注释 |
| 4 | `import_wordbook.sh --all` | 知识库 `wb_*.json`（9 本） | 词书全量 |
| 5 | `import_classic_list.sh` | 知识库 `classics.json` | 经典元数据（幂等 upsert） |
| 6 | `import_classic.sh --all` | 知识库 各经典子目录 JSON | 经典章节/段落/注释 |

**修订后重导原则**：kid 不变就不需要重导词书。修改已有 keyWord 时 kid 不变，词书自动生效；新增 keyWord 才需词书跟进。

**线上部署**：一律使用 `-d @本地路径` 方式（curl 读取本地文件作为请求体发送），BASE_URL 替换为 `https://wyq.yinqueai.com`，无需上传文件到服务器。

### 数据维护脚本

| 脚本 | 用途 |
|------|------|
| `scripts/split_articles.py` | 拆分工具（articles.json → 11 个年级分文件 + 1 个壳文章文件） |
| `scripts/normalize_articles.py` | articles_*.json 规范化：补 wordType/wordBookId、删脏数据、补壳文章元数据 |
| `scripts/add_missing_keywords.py` | 为已有句子新增缺失 keyWord（读写 articles_*.json） |
| `scripts/backfill_sentences.py` | 从词书 quizItem.sentenceText 回填缺失句子（读写 articles_*.json） |
| `scripts/fill_kidref.py` | 词书 quizItem.kidRef 填充 |
| `scripts/articles_io.py` | 公共 I/O 模块（以上脚本共用） |

- 所有脚本默认 dry-run，必须加 `--apply` 才写入
- 分文件写入前会自动备份（`.bak`），完成后删除
- `article_keyword.kid` 全局唯一，`fill_kidref.py` 最后一步自动检测重复

[[study-section]]
[[articles-section]]
[[classics-section]]
