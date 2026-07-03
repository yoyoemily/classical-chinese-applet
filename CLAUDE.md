# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

博古通今——微信原生小程序，面向中学生帮助掌握文言文实词/虚词/通假字释义，基于艾宾浩斯遗忘曲线安排学习与复习节奏。15 个页面全部搭建完成，核心学习回路（答题→纠错→字总结→完成）已跑通。

## 开发环境

- **IDE**：微信开发者工具（WeChat DevTools），直接用该工具打开项目根目录即可
- **编译**：开发者工具自动完成 TypeScript → JavaScript、SCSS → WXSS 的编译，无需手动执行任何构建命令
- **基础库版本**：`2.25.0`（`project.config.json` → `libVersion`）
- **AppID**：`wxc50759cc61eda134`（`project.config.json` → `appid`）
- **编译插件**：`["typescript", "sass"]`（`project.config.json` → `setting.useCompilerPlugins`）

没有 Lint/Test 等 CLI 命令，一切编译和预览都在微信开发者工具内完成。

## 技术栈与约定

| 项 | 选型 |
|----|------|
| 框架 | 微信原生小程序（WXML + SCSS + TS） |
| 语言 | TypeScript，`strict: true`，所有 TS 严格检查全开 |
| 样式 | SCSS（变量 + mixin），BEM 命名（`block__element--modifier`） |
| 尺寸单位 | `rpx`（1rpx = 屏幕宽度 / 750） |
| UI 组件库 | 无，全部手写 |
| 后端 | 传统 HTTP API（非云开发），基础地址 `http://localhost:8080`，JWT 认证 |
| 数据源 | 词书/名篇/任务/答题/进度/生词本/打卡/勋章/等级/全文/反馈/个人信息 → 全部走 API；仅设置项和学习会话本地缓存 |
| 艾宾浩斯 | 服务端权威调度——服务端 `getTodayTask` 返回任务列表、`submitAnswer` 更新进度；前端保留离线冗余 |
| 状态管理 | 轻量：`app.globalData` + 事件总线 |
| Mock 模式 | `api/index.ts` 中 `USE_MOCK = false`，已对接真实后端；所有依赖静态顶级导入（禁止 `await import()`） |
| 认证 | JWT：`app.ts` onLaunch 调用 `wx.login()` → `/api/auth/login` 获取 token → `request.ts` 自动带 Authorization header，401 时自动 re-login |
| 路径别名 | `@/*` → `./*`（`tsconfig.json` → `paths`），但在小程序中 import 需使用相对路径 |

## API 端点清单（共 15 个）

| 分类 | 接口 | 方法 | 路径 | 认证 |
|------|------|------|------|------|
| 认证 | login | POST | /api/auth/login | — |
| 词书 | fetchWordBooks | GET | /api/wordbooks | Bearer |
| 词书 | fetchWordBookDetail | GET | /api/wordbooks/:id | Bearer |
| 学习 | fetchTodayTask | GET | /api/study/today | Bearer |
| 学习 | submitAnswer | POST | /api/study/answer | Bearer |
| 学习 | completeStudy | POST | /api/study/complete | Bearer |
| 进度 | fetchProgress | GET | /api/progress | Bearer |
| 生词本 | fetchVocabulary | GET | /api/vocabulary | Bearer |
| 打卡 | fetchCheckinRecords | GET | /api/checkin | Bearer |
| 勋章 | fetchBadges | GET | /api/badges | Bearer |
| 用户 | fetchUserProfile | GET | /api/user/profile | Bearer |
| 用户 | fetchUserInfo | GET | /api/user/info | Bearer |
| 用户 | saveUserInfo | PUT | /api/user/info | Bearer |
| 名篇 | fetchArticles | GET | /api/articles | Bearer |
| 名篇 | fetchArticleDetail | GET | /api/articles/:id | Bearer |
| 内容 | fetchWordDetail | GET | /api/words/:id | Bearer |
| 内容 | fetchFullText | GET | /api/full-text/:sentenceId | Bearer |
| 反馈 | submitFeedback | POST | /api/feedback | Bearer |

```
├── app.ts              # 入口：全局错误监听、系统信息初始化
├── app.json            # 全局配置：pages 注册、window、tabBar 等
├── app.scss            # 全局样式：引用 reset + variables
├── sitemap.json        # SEO 站点地图
├── project.config.json # 微信开发者工具配置
├── tsconfig.json       # TS strict 配置
├── pages/              # 页面（每页面 4 文件：ts/wxml/scss/json）
├── components/         # 公共组件
├── api/
│   └── index.ts         # 统一接口层（USE_MOCK 开关），含 15 个 API 端点：词书/任务/答题/进度/生词本/打卡/勋章/用户/名篇/全文/反馈/个人信息
├── mock/
│   ├── wordBooks.ts     # 词书 Mock（2 本，16 词）
│   ├── articles.ts      # 名篇 Mock（4 篇，含 textbook 教材标注）
│   └── badges.ts        # 勋章 Mock（8 枚）
├── docs/
│   └── api.md           # API 文档（EasyBit 风格，15 个接口完整描述）
├── utils/
│   ├── request.ts       # wx.request 封装（Promise 化、拦截、错误处理）
│   ├── util.ts          # 通用工具（formatDate、throttle、debounce 等）
│   ├── ebbinghaus.ts    # 艾宾浩斯引擎（生成今日任务、计算下次复习日、更新进度）
│   ├── tts.ts           # TTS 语音播报工具（双引擎：HTTP API + WechatSI 插件，单例管理）
│   └── storage.ts       # 本地存储封装（进度、勋章、打卡、会话、设置）
├── styles/
│   ├── variables.scss  # SCSS 变量 + CSS 自定义属性（定义在 page 上）
│   ├── mixins.scss     # mixin（flex、hairline、card、text-ellipsis 等）
│   └── reset.scss      # 样式重置
├── typings/
│   ├── index.d.ts      # 全局类型（IAppOption、IApiResponse、分页）
│   └── wx.d.ts         # 微信基础类型补充声明
├── constants/          # 全局常量
├── assets/             # 静态资源（图标、图片）
├── temp/               # 临时文件（截图等）
├── .claude/            # Claude Code 配置
│   └── memory/         # 项目记忆（架构/流程/数据模型/页面结构等，CLI 对话上下文）
```

## 核心架构模式

### 请求链路

```
页面/组件 → api/（接口定义） → utils/request.ts（封装层，自动带 JWT） → wx.request → 后端
                                       ↓
                   401 → 自动 re-login → 重试请求
                                   ↓
                         统一错误 toast + loading
```

`request.ts` 假定后端响应格式为 `{ code: 0, message: "ok", data: ... }`。`code === 0` 表示成功，其他为业务异常。BASE_URL 为 `http://localhost:8080`，开发环境直连后端。JWT token 由 `app.ts` 启动时通过 `wx.login()` 获取并存储在 localStorage，`request.ts` 自动在请求头中携带，401 时自动触发重新登录。

### 认证流程

```
app.ts onLaunch → wx.login() → code
    ↓
POST /api/auth/login { code }
    ↓
后端返回 { token, userId } → wx.setStorageSync('authToken', token)
    ↓
request.ts 每次请求自动带 Authorization: Bearer <token>
    ↓
401 → reLogin()（防并发）→ 重试原请求
```

### 样式体系

**两层变量系统**：
1. SCSS 变量（`$color-primary` 等）→ 在 `.scss` 文件中通过 `@import '../../styles/variables.scss'` 使用
2. CSS 自定义属性（`--color-primary` 等）→ 定义在 `page` 选择器上，可在 `.scss` 和 `.wxss` 中直接使用，也支持 WXML 内联 style

**BEM 命名**：页面级类名以 `page-xxx` 为 Block，例如首页 `.page-index__header`、`.page-index__btn--hover`。

**安全区**：底部用 `var(--safe-area-bottom)` 或 `@include safe-area-bottom($min-height)`。

### 页面开发规范

1. **新增页面**：在 `pages/` 下建目录，创建 4 个文件（`index.ts`、`index.wxml`、`index.scss`、`index.json`），然后在 `app.json` → `pages` 数组中注册路径
2. **页面 TS 结构**：data 类型单独定义 interface → `Page<IXxxData>({ ... })` → 生命周期按 `onLoad → onShow → onReady → onHide → onUnload` 顺序排列 → 自定义方法放最后
3. **组件 TS 结构**：`Component({ properties: { ... }, data: { ... }, lifetimes: { ... }, methods: { ... } })`
4. **`setData`**：使用增量更新（data-path 写法），只传变化字段
5. **WXML**：`wx:if` 和 `wx:for` 不共存于同一标签，用 `<block>` 包裹；`wx:key` 必须指定唯一字段

### 类型约定

- 页面 data 类型以 `I` 前缀 + 页面名 + `Data` 命名，如 `IIndexData`
- API 响应类型统一使用 `IApiResponse<T>` 包裹
- 分页查询使用 `IPaginationParams` 和 `IPaginationResult<T>`
- 纯类型导入使用 `import type`
- 全局 App 类型通过 `IAppOption` 接口扩展

### 全局状态

当前只有 `app.globalData`，包含：
- `systemInfo`：设备信息（`wx.getSystemInfoSync()` 获取）
- `statusBarHeight`：顶部状态栏高度
- `userInfo`：用户信息（预留，当前 `undefined`）
- `loginPromise`：登录 Promise（页面可 await 确保登录完成后请求）
- `currentWordBookId`：当前选中词书 ID
- `todayTask`：今日任务缓存

后续引入事件总线时挂到 `app` 实例的 `$emit`/`$on`/`$off` 方法上（类型已在 `IAppOption` 中预留）。

## 当前完成度

### 已完成
- **15 页面**全部搭建，含 4 TabBar（学习/名篇/生词本/我的）
- **核心学习回路**：句子卡片答题 → 纠错页（正确/错误/不知道）→ 字总结 → 学习完成（含艾宾浩斯引擎 `utils/ebbinghaus.ts`）
- **名篇阅读器**：通篇阅读 / 段落释义 / 逐句释义 / 逐字标注 四种模式，通篇模式内联生词高亮（keyWords 自动匹配下划线，点击弹出释义卡片）
- **名篇列表**：双行筛选（分类 + 人教版教材年级），交叉过滤
- **勋章系统**：8 枚勋章，全部为累计学习天数维度（3/7/21/30/60/100/180/365 天），学习完成时自动检测新勋章
- **打卡日历**：月视图打卡展示，已嵌入首页学习 Tab 内联展示
- **首页**：右上角"下一个勋章"倒计时激励卡片，词书进度+分布，今日任务+CTA，内嵌月日历，去掉了生词本入口（TabBar 已有）
- **生词本**：5 级标签（困难/模糊/熟悉/掌握/全部）
- **词书选择**：多词书切换，词书详情
- **全文阅读**：从纠错页或名篇阅读器跳转
- **设置页**：每日新学/复习词数、学习顺序（顺序/乱序）、自动播放语音、答题音效、震动反馈、清除数据
- **个人信息编辑**：头像（微信头像/相册/拍照）、昵称（微信昵称自动填充/自定义）、年级选择（初一～高三），通过 API 层 `fetchUserInfo()`/`saveUserInfo()` 存取，Mock 下走 localStorage，正式环境走 `GET/PUT /api/user/info`
- **"我的"页**：头像和昵称展示（点击跳转个人信息编辑），新增"个人信息"菜单项
- **学习顺序**：支持顺序/乱序两种模式，在 `utils/ebbinghaus.ts` 的 `generateTodayTask()` 中根据设置决定是否 shuffle（复习和新学各自独立乱序，复习仍优先）
- **学习页**：标题动态显示当前词书书名，答题选项随机排列，"不知道"按钮有卡片化视觉引导，语音播报按钮（🔊）支持自动/手动播放句子音频
- **语音播报**：`utils/tts.ts` 双引擎架构（HTTP API + WechatSI 插件），通过 `TTS_ENGINE` 常量切换。优先使用句子 `audioUrl` 预录音频，无则走 TTS 合成。学习页 `showNextQuestion` 自动播报，喇叭按钮可手动控制。当前默认 `api` 引擎，`TTS_API_URL` 为占位值。
- **错误反馈**：学习/名篇板块底部弹出浮层，选择错误类型 + 详细描述，提交到后端
- **内联生词链接**：名篇通篇阅读模式下，`keyWords` 最长匹配切分后高亮（主题色下划线），点击弹出居中释义卡片，不打断阅读

### 已完成（文档与后端基础设施）
- **API 文档**：`docs/api.md`，15 个接口完整文档（EasyBit 风格），含请求参数/响应字段表格、成功+错误示例、枚举值速查附录

### 后端工程

后端已迁移为独立的 Spring Boot 工程，位于 `/Users/zhutx/IdeaProjects/classical-chinese/`（详见该工程根目录的 `CLAUDE.md`，含完整的 Controller/Service/Mapper/Entity 结构、API 端点对照表、数据库设计、冷启动导入流程等）。

| 项 | 说明 |
|----|------|
| 框架 | Spring Boot 3.2.1 + Java 17 + MyBatis-Plus 3.5.5 |
| 数据库 | MySQL 8.0，数据库名 `classical_chinese`，21 张表，DDL 在后端工程 `data/schema.sql` |
| 端口 | `8080` |
| 基础路径 | `com.bogutongjin` |
| 源码结构 | common(Result/异常处理) → config(分页/跨域) → entity(21) → mapper(21, BaseMapper) → service(10) → controller(11) |
| 冷启动数据 | `src/main/resources/source.json`（188KB，与前端 data/source.json 相同内容） |
| 数据导入 | `POST /api/admin/import` → `DataImportService.importFromJson()` (JDBC Template 批处理，事务保护) |

**启动方式**：用 IntelliJ IDEA 打开该目录，运行 `ClassicalChineseApplication`。

**API 覆盖**：12 个 Controller 完整对接前端 15 个 API 端点 + 登录接口 + 管理导入接口，响应格式统一 `{code: 0, message: "ok", data: ...}`。`api/index.ts` 中 `USE_MOCK = false`，`utils/request.ts` 中 `BASE_URL = 'http://localhost:8080'`。JWT 认证完整实现：`LoginInterceptor` + `@CurrentUser` 注入 userId，前端 `app.ts` onLaunch 自动登录、`request.ts` 自动带 token、401 自动 re-login。

### 待开发
- 深层字词标注（更多数据覆盖）
- 艾宾浩斯端到端调优

### ⚠️ 上线前必须完成
- **替换 `WECHAT_APP_SECRET` 为真实值**：后端目前未配 AppSecret 时用固定 `dev-openid` 兜底，仅适合开发。上线前需在微信公众平台获取真实 AppSecret，设为后端环境变量。

## 项目记忆

`.claude/memory/` 目录存放项目记忆文件，由 CLI 维护。`MEMORY.md` 为索引入口。会话上下文通过读取 `CLAUDE.md` + `.claude/memory/MEMORY.md` 及其中引用的记忆文件来建立。新增记忆时写到 `.claude/memory/` 下，并更新 `MEMORY.md` 索引。
