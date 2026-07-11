# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

文言雀——微信原生小程序，面向中学生帮助掌握文言文实词/虚词/通假字释义，基于艾宾浩斯遗忘曲线安排学习与复习节奏。18 个页面全部搭建完成，核心学习回路（答题→纠错→字总结→完成）已跑通。

详情见 `.claude/memory/` 目录及 `MEMORY.md` 索引。

## 开发环境

- **IDE**：微信开发者工具（WeChat DevTools），直接用该工具打开项目根目录即可
- **编译**：开发者工具自动完成 TypeScript → JavaScript、SCSS → WXSS 的编译，无需手动执行任何构建命令
- **基础库版本**：`2.25.0`（`project.config.json` → `libVersion`）
- **AppID**：`wx00adcbea9d77ba88`（`project.config.json` → `appid`）
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
| 后端 | 传统 HTTP API（非云开发），JWT 认证。BASE_URL 根据环境自动切换：`envVersion === 'release'` → `https://wyq.yinque-ai.com`，否则 → `http://localhost:8080` |
| 数据源 | 词书/名篇/经典/任务/答题/进度/生词本/打卡/勋章/等级/全文/反馈/个人信息 → 全部走 API；仅设置项和学习会话本地缓存。词书 JSON、典故注释 JSON 的唯一权威数据源位于 Obsidian 知识库 `~/Documents/knowledge_library/文言文/` |
| 艾宾浩斯 | 服务端权威调度——服务端 `getTodayTask` 返回任务列表、`submitAnswer` 更新进度；前端保留离线冗余 |
| 状态管理 | 轻量：`app.globalData` + 事件总线 |
| Mock 模式 | `api/index.ts` 中 `USE_MOCK = false`，已对接真实后端；所有依赖静态顶级导入（禁止 `await import()`） |
| 认证 | JWT：`app.ts` onLaunch 调用 `wx.login()` → `/api/auth/login` 获取 token → `request.ts` 自动带 Authorization header，401 时自动 re-login |
| 路径别名 | `@/*` → `./*`（`tsconfig.json` → `paths`），但在小程序中 import 需使用相对路径 |

## 请求链路

```
页面/组件 → api/ → utils/request.ts（自动带 JWT） → wx.request → 后端
                              ↓
              401 → 自动 re-login → 重试请求
                              ↓
                    统一错误 toast + loading
```

`request.ts` 假定后端响应格式为 `{ code: 0, message: "ok", data: ... }`。`code === 0` 表示成功，其他为业务异常。BASE_URL 为 `http://localhost:8080`，开发环境直连后端。JWT token 由 `app.ts` 启动时通过 `wx.login()` 获取并存储在 localStorage，`request.ts` 自动在请求头中携带，401 时自动触发重新登录。

## 认证流程

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

## 页面开发规范

1. **新增页面**：在 `pages/` 下建目录，创建 4 个文件（`index.ts`、`index.wxml`、`index.scss`、`index.json`），然后在 `app.json` → `pages` 数组中注册路径
2. **页面 TS 结构**：data 类型单独定义 interface → `Page<IXxxData>({ ... })` → 生命周期按 `onLoad → onShow → onReady → onHide → onUnload` 顺序排列 → 自定义方法放最后
3. **组件 TS 结构**：`Component({ properties: { ... }, data: { ... }, lifetimes: { ... }, methods: { ... } })`
4. **`setData`**：使用增量更新（data-path 写法），只传变化字段
5. **WXML**：`wx:if` 和 `wx:for` 不共存于同一标签，用 `<block>` 包裹；`wx:key` 必须指定唯一字段

## 类型约定

- 页面 data 类型以 `I` 前缀 + 页面名 + `Data` 命名，如 `IIndexData`
- API 响应类型统一使用 `IApiResponse<T>` 包裹
- 分页查询使用 `IPaginationParams` 和 `IPaginationResult<T>`
- 纯类型导入使用 `import type`
- 全局 App 类型通过 `IAppOption` 接口扩展

## 三个业务板块

| 板块 | 关联页面 | 知识库 | 记忆文件 |
|------|---------|--------|---------|
| 学习 | index, study, word-summary, study-complete, book-select, book-detail, mistake-book, vocabulary, badges, calendar, search | `文言文/词书/readme.md` | `study-section.md` |
| 选篇 | article-list, article-reader | `文言文/选篇/典故注释/readme.md` | `articles-section.md` |
| 经典 | classic, classic-reader | `文言文/经典/readme.md` | `classics-section.md` |

> 说"继续学习板块"/"继续选篇板块"/"继续经典板块"时，直接读对应记忆文件即可，无需读 CLAUDE.md 或其他文件（触发词规则见 `work-manual.md`）。

## 后端工程

位于 `/Users/zhutx/IdeaProjects/classical-chinese/`。Spring Boot 3.2 + Java 17 + MyBatis-Plus + MySQL 8.0（26 张表，端口 8080）。完整架构见 `.claude/memory/backend-infrastructure.md`。

## 项目记忆

`.claude/memory/` 目录存放项目记忆文件，由 CLI 维护。`MEMORY.md` 为索引入口。会话上下文通过读取 `CLAUDE.md` + `.claude/memory/MEMORY.md` 及其中引用的记忆文件来建立。新增记忆时写到 `.claude/memory/` 下，并更新 `MEMORY.md` 索引。
