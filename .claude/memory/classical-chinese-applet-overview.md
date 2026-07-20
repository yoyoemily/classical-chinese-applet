---
name: classical-chinese-applet-overview
description: 文言雀项目概览——技术栈、认证流程、后端工程、全局架构
metadata:
  type: project
---

## 项目概述

文言雀——微信原生小程序，面向中学生帮助掌握文言文实词/虚词/通假字释义，基于艾宾浩斯遗忘曲线安排学习与复习节奏。

**AppID**: `wxa192d18a50c75dca`（与后端 wechat.app-id 一致）
**基础库版本**: `2.25.0`
**技术栈**: 微信原生（WXML + SCSS + TS），无 UI 组件库，全部手写
**后端 API 域名**：正式版 `https://wyq.yinque-ai.com`，开发/体验版 `http://localhost:8080`（request.ts 根据 `envVersion` 自动切换）
**设计**: 新中式/国风 + 现代极简，SCSS variables in `styles/variables.scss`，BEM 命名，配色 #4a6a5e（墨绿主色）+ #c9a96e（金色点缀）

## 全局架构

```
页面/组件 → api/index.ts → utils/request.ts（自动带 JWT） → wx.request → 后端 Spring Boot
                                       ↓
                   401 → 自动 re-login → 重试请求
                                       ↓
                         统一错误 toast + loading
```

### 认证流程

```
app.ts onLaunch → wx.login() → code
    ↓ POST /api/auth/login { code }
后端返回 { token, userId } → wx.setStorageSync('authToken', token)
    ↓ request.ts 每次请求自动带 Authorization: Bearer <token>
401 → reLogin()（防并发）→ 重试原请求
```

### 请求约定

- 后端响应格式：`{ code: 0, message: "ok", data: ... }`，`code === 0` 表示成功
- `api/index.ts` 中 `USE_MOCK = false`，`BASE_URL` 根据环境自动切换
- 所有 import 为静态顶级（小程序不支持 `await import()`）
- API 文档：`docs/api.md`（EasyBit 风格，21 个接口完整文档）

### 状态管理

轻量：`app.globalData` + 事件总线。仅设置项和学习会话保留本地缓存，其余全部走 API。

## 板块索引

| 板块 | 记忆文件 | 关联页面 |
|------|---------|---------|
| 学习 | [[study-section]] | index, study, word-summary, study-complete, book-select, book-detail, mistake-book, vocabulary, badges, calendar, search |
| 选篇 | [[articles-section]] | article-list, article-reader |
| 经典 | [[classics-section]] | classic, classic-reader |
| 通用 | — | mine, settings, profile-edit, full-text |

## 后端工程

位于 `/Users/zhutx/IdeaProjects/classical-chinese/`。Spring Boot 3.2 + Java 17 + MyBatis-Plus + MySQL 8.0（26 张表，端口 8080）。完整架构见 [[backend-infrastructure]]。

## 开发约定

- **新增页面**：`pages/` 下建目录 → 4 文件（ts/wxml/scss/json）→ `app.json` 注册
- **尺寸单位**：`rpx`（1rpx = 屏幕宽度 / 750）
- **WXML**：`wx:if` 和 `wx:for` 不共存于同一标签，用 `<block>` 包裹；`wx:key` 必须指定唯一字段
- **setData**：增量更新（data-path 写法），只传变化字段
- **类型约定**：页面 data 以 `I` 前缀命名（如 `IIndexData`），API 响应用 `IApiResponse<T>` 包裹
- **前端薄层原则**：逻辑下沉到后端，前端只负责渲染；后端返回的数据拿来即用，前端不做 map/filter/reduce/groupBy 等二次加工

[[study-section]]
[[articles-section]]
[[classics-section]]
[[backend-infrastructure]]
[[classical-chinese-data-model]]
