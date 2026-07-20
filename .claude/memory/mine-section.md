---
name: mine-section
description: "我的"板块代码集成手册——等级体系/徽章系统/分享流程/页面结构/关键文件索引
metadata:
  type: project
---

## "我的"板块概览

"我的"是 TabBar 第 4 个页面，涵盖个人中心（等级/徽章/契约会员）、分享海报门禁、等级体系展示、勋章墙、打卡日历。关联页面（共 5 个）：

| 页面 | 路径 | 角色 |
|------|------|------|
| 我的 | `pages/mine/` | TabBar 4，头像/昵称/等级标签/契约会员/菜单/勋章进度/分享入口 |
| 等级体系 | `pages/level-system/` | 当前等级卡片 + 进度条 + 全部 9 级称号表 + 经验获取规则 |
| 勋章墙 | `pages/badges/` | 8 枚累计学习天数勋章，递进式获取 |
| 打卡日历 | `pages/calendar/` | 月视图打卡展示 |
| 设置 | `pages/settings/` | 每日新学/复习词数、连续答对移出阈值、学习顺序、音效/语音开关 |
| 个人信息 | `pages/profile-edit/` | 头像/昵称/年级编辑 |
| 全局搜索 | `pages/search/` | 实时搜索完整义项（从学习首页进入） |

---

## 等级体系

### 等级与称号

| 等级 | 称号 | 累计 XP 门槛 |
|------|------|-------------|
| Lv.1 | 童生 | 0 - 999 |
| Lv.2 | 秀才 | 1,000 - 1,999 |
| Lv.3 | 举人 | 2,000 - 2,999 |
| Lv.4 | 贡士 | 3,000 - 4,999 |
| Lv.5 | 进士 | 5,000 - 9,999 |
| Lv.6 | 探花 | 10,000 - 19,999 |
| Lv.7 | 榜眼 | 20,000 - 29,999 |
| Lv.8 | 状元 | 30,000 - 49,999 |
| Lv.9 | 翰林 | 50,000 以上 |

### XP 获取规则

- ✅ 每完成一个新学字词（该词所有句子答完，进入字总结时） · +10 XP
- 🎧 选篇/经典，完整听读音频 · 每 10 字 +1 XP（2026-07-17 已实现）
- 复习词答对不给 XP（防刷机制）
- 打卡/连续打卡/获得勋章暂不给 XP

### 全链路

```
字词全部句子答完 → goToWordSummary → await completeWord → 判新学词（createdAt < todayStart）→ 新学词 +10 XP 即时写入 user.total_xp
    ↓
前端累加到 session.xpGained（仅用于完成页展示）
    ↓
字总结页展示 "+10 XP"（仅新学词，从 query 参数接收）
    ↓
completeStudy 传入 xpGained（仅用于返回给前端展示，不重复写 XP）
    ↓
fetchUserProfile → UserService.calcLevel(totalXp) → 返回 level + title
    ↓
mine 页展示 "Lv.X 称号" → 点击跳转 level-system 页
```

> **即时写入**：XP 在 `completeWord`（`POST /api/study/word-complete`）中即时写入 `user.total_xp`，时机为单个字词的所有句子全部答完后、进入字总结页时。`submitAnswer` 不再发放 XP，`completeStudy` 也不再写入 XP。用户中途退出也不丢失已完成字词的 XP。

### 关键代码

| 层 | 文件 | 关键位置 |
|----|------|---------|
| 后端 calcLevel | `UserService.java` | `LEVEL_THRESHOLDS` 数组 + `calcLevel()` 从高往低匹配 |
| 后端 XP 写入 | `StudyService.java` | `completeWord()` 判新学词（`createdAt < todayStart`）+ 即时写入 `user.total_xp`；`submitAnswer()` 和 `completeStudy()` 不再写 XP |
| 后端 API | `StudyController.java` | `POST /api/study/word-complete` |
| 后端 API | `POST /api/study/audio-complete` | 新增音频听读 XP 发放（2026-07-17） |
| 前端等级常量 | `constants/config.ts` | `LEVEL_THRESHOLDS` + `RANK_TITLES` + `calcLevel()` + `calcAudioXP()` |
| 前端 mine 页 | `pages/mine/index.*` | `loadProfile()` 取 level/title → WXML 显示等级标签 |
| 前端等级页 | `pages/level-system/index.*` | 当前等级卡片 + 全部 9 级表 + 经验规则 |
| 前端学习页 | `pages/study/index.ts` | `goToWordSummary()` await `completeWord()` → XP 累加到 session → query 参数传给字总结页 |
| 前端字总结页 | `pages/word-summary/index.*` | 从 query 接收 `xpGained`，汉字卡片区域展示 "+N XP" |
| 前端完成页 | `pages/study-complete/index.*` | 展示 "+XX XP" |
| 前端 API | `api/index.ts` | `completeWord()` 调用 `POST /api/study/word-complete` |

---

## 徽章体系

### 8 枚勋章（按累计学习天数递进）

| ID | 名称 | 天数 | 图标 | 配色 |
|----|------|:--:|------|------|
| `badge_streak_3` | 初识文言 | 3 | 🥉 | bronze |
| `badge_streak_7` | 日积月累 | 7 | 🥈 | silver |
| `badge_streak_21` | 持之以恒 | 21 | 🥇 | gold |
| `badge_streak_30` | 渐入佳境 | 30 | 🌟 | indigo |
| `badge_streak_60` | 水滴石穿 | 60 | 💎 | diamond |
| `badge_streak_100` | 百尺竿头 | 100 | 🔮 | crimson |
| `badge_streak_180` | 金石为开 | 180 | 👑 | royal |
| `badge_streak_365` | 破万卷书 | 365 | 🏆 | emerald |

### 获取机制

- 后端 `checkNewBadge()` 在 `completeStudy()` 中调用——每次完成学习后检查 streak 是否达到新勋章门槛，返回单枚或 null（每天最多一枚）
- 勋章数据定义在 `source.json` 的 `badges` 数组中，通过 `/api/admin/import` 手动导入 `badge` 表（非启动自动导入）
- 用户已获勋章存储在 `user_badge` 表

### 展示

- **mine 页**：右上角 🏅 勋章入口显示 `N/8`，下方进度条显示下一枚勋章差距
- **勋章墙** `pages/badges/index.*`：2 列网格，每枚勋章独立配色主题（8 种），未获得显示 🔒，已获得显示 ✓ + 获得日期 + ✦ 光芒点缀
- **学习完成页** `pages/study-complete/index.*`：`finishStudy()` await `completeStudy()` 结果 → 写入 `study_summary` 缓存 → 完成页 `onLoad` 读取 `newBadge` → 非空则 400ms 后弹出金色勋章庆祝弹窗（脉动光环 + 四角闪烁粒子 + 弹跳入场动画）

### 关键代码

| 层 | 文件 | 关键位置 |
|----|------|---------|
| 后端数据定义 | `source.json` | `badges[]` 数组 |
| 后端检查授予 | `StudyService.java` | `checkNewBadge()` 返回单枚 Map 或 null |
| 后端 API | `GET /api/badges` | 返回 `{ badges, userBadges }` |
| 后端 API | `POST /api/study/complete` | 返回 `{ newBadge, xpGained }`（`newBadge` 为单枚或 null） |
| 前端 API | `api/index.ts` | `fetchBadges()`、`completeStudy()` |
| 前端 Mock | `mock/badges.ts` | `checkNewBadge()` 返回单枚 `IBadge \| null` |
| 前端学习页 | `pages/study/index.ts` | `finishStudy()` async await `completeStudy` → 写入缓存 |
| 前端完成页 | `pages/study-complete/index.*` | `newBadge` 弹窗（蒙层 + 金色勋章 + 动画） |
| 前端勋章墙 | `pages/badges/index.*` | 8 种主题配色 + 精选 ID 顺序 |
| 前端 mine 页 | `pages/mine/index.ts` | `loadBadges()` + `computeNextBadge()` |

---

## 分享流程与金石契

### 门禁机制

- 连续打卡满 `SHARE_GATE_STREAK_DAYS` 天（默认 10，-1 关闭）后，首页点击「开始学习」弹出分享门禁弹窗，引导到 mine 页面
- 门禁弹窗无关闭按钮，必须点击跳转

### mine 页弹窗交互（两阶段）

**阶段一：海报 + 按钮**
- 非会员（`memberLevel < 1`）：「保存图片」+「分享朋友圈」并排；「分享朋友圈」初始 disabled，保存图片成功后激活 → 进入阶段二
- 已是会员（`memberLevel >= 1`）：仅「保存图片」

**阶段二：金石契（契约签订）**
- 海报消失 → 白底卡片 → 文案：
  ```
  君以分享托付文言雀
  文言雀亦以赤诚报君
  此约既成，金石不渝
  ```
- 复选框「余今签契，行之以诚」→ 「签订契约」按钮
- 签订成功后调用 `POST /api/user/pact`，后端 `user.member_level` 设为 1

### 「契约会员」标签

- mine 页 `memberLevel >= 1` 时，头像下方显示金色渐变「契约会员」标签
- 标签带 shimmer 动画，点击弹出金石契弹窗（与阶段二文案一致，多一枚"契"字红色印章旋转 overlay）
- 底部：「您已签订契约，永久免费学习」

### 海报生成

- 脚本：`tools/generate_poster.py`（Pillow 合成 720×1280）
- 素材：`assets/share-poster-bg.png` + `assets/qrcode.jpg` → 输出 `assets/share-poster.png`
- 图片部署：后端 `resources/static/assets/`，前端 `onSavePoster` 根据环境自动切换 download URL
- 字体：行楷 SC Bold（主标题"文言雀"）+ 华文楷体 SC Regular（其余文字），macOS 系统自带

### 关键代码

| 层 | 文件 | 关键位置 |
|----|------|---------|
| 后端 API | `POST /api/user/pact` | `UserService.signPact()` 设置 memberLevel=1 |
| 后端 Profile | `GET /api/user/profile` | 返回 `memberLevel` |
| 前端 mine 页 | `pages/mine/index.*` | 两阶段弹窗 + 契约会员标签 + 金石契弹窗 |
| 前端门禁常量 | `constants/config.ts` | `SHARE_GATE_STREAK_DAYS` |
| 前端首页 | `pages/index/index.ts` | `onTapStart()` 检查分享门禁 |
| 海报脚本 | `tools/generate_poster.py` | Pillow 合成逻辑 |

---

## my 页面结构

```
┌──────────────────────────┐
│  深绿色渐变头部            │
│  [头像] 昵称 Lv.X 称号    │  ← 等级标签可点击跳转等级体系页
│         契约会员(金色渐变)  │  ← memberLevel>=1 时显示
│               🏅 N/8      │  ← 点击跳转勋章墙
│  ┌─下一枚勋章进度条─────┐  │
│  │ 🎖 勋章名    还差N天  │  │
│  │ ████████░░░░░  N%   │  │
│  └──────────────────────┘  │
├──────────────────────────┤
│  📤 分享给朋友（虚线按钮）  │
├──────────────────────────┤
│  📅 打卡日历              │
│  📝 错题本                │
│  📖 生词本                │
│  👤 个人信息              │
│  ⚙️ 设置                  │
├──────────────────────────┤
│         文言雀            │
└──────────────────────────┘
```

---

## 关键文件索引

| 层 | 文件 | 角色 |
|----|------|------|
| 前端 mine | `pages/mine/index.*` | 个人中心主页面 |
| 前端等级 | `pages/level-system/index.*` | 等级体系展示页 |
| 前端勋章 | `pages/badges/index.*` | 勋章墙 |
| 前端日历 | `pages/calendar/index.*` | 打卡日历月视图 |
| 前端设置 | `pages/settings/index.*` | 学习参数设置 |
| 前端搜索 | `pages/search/index.*` | 全局搜索 |
| 前端常量 | `constants/config.ts` | `LEVEL_THRESHOLDS`、`RANK_TITLES`、`calcLevel()`、分享门禁常量 |
| 前端 API | `api/index.ts` | `fetchUserProfile()`、`fetchBadges()`、`signPact()` |
| 后端等级 | `UserService.java` | `LEVEL_THRESHOLDS` + `calcLevel()` + `getUserProfile()` |
| 后端 XP | `StudyService.java` | `completeWord()` 判新学词（createdAt < todayStart）+ 即时写入 `user.total_xp`；`submitAnswer()` 和 `completeStudy()` 不再写 XP |
| 后端 API | `StudyController.java` | `POST /api/study/word-complete` |
| 后端勋章 | `StudyService.java` | `checkNewBadges()` |
| 后端契约 | `UserService.java` | `signPact()` |
| 后端数据 | `source.json` | `badges[]` 8 枚勋章定义 |
| 海报脚本 | `tools/generate_poster.py` | Pillow 合成 720×1280 海报 |

[[classical-chinese-applet-overview]]
[[study-section]]
[[share-poster-generation]]

---

## 待办

（音频听读 XP 已于 2026-07-17 完成，详见下方"音频听读 XP"章节）

---

## 音频听读 XP（2026-07-17 已实现）

- **触发**：选篇/经典阅读器中完整听完音频 → `onEnded` 回调 → `POST /api/study/audio-complete`
- **XP 规则**：后端根据 `contentId` 查数据库取出原文，去标点后统计纯汉字（CJK），每 10 字 = 1 XP
- **去重**：`user_audio_listen_log` 表 `UNIQUE(user_id, content_type, content_id)`，同一内容只给一次
- **防作弊**：前端只传 `contentType` + `contentId`，字数统计完全在后端完成
- **已读标记**：
  - 选篇列表：已听读文章显示"✓ 已听读"标签，`onShow` 刷新
  - 经典目录：4 种 navMode 均以圆点标记（● 已读/○ 未读），打开目录时刷新
  - 后端 `ArticleService.listArticles()` 返回 `listened` 字段，`ClassicService.getClassicMeta()` 返回 `listenedNodeIds` 数组
- **+XP 动效**：听完后弹出墨绿渐变 pill 标签，弹性弹入 + 上飘淡出（2.2s）
- **TTS 工具**：`TTSCallbacks` 新增 `onEnded` 回调，仅在自然播放完成时触发（stop/error/playId 过期不触发）

### 涉及文件

| 层 | 文件 | 改动 |
|----|------|------|
| 后端 | `data/schema.sql` | `user_audio_listen_log` 表 |
| 后端 | `entity/UserAudioListenLog.java` | 新建 |
| 后端 | `mapper/UserAudioListenLogMapper.java` | 新建 |
| 后端 | `dto/AudioCompleteRequest.java` | 新建 |
| 后端 | `service/StudyService.java` | `completeAudioListen()` + `fetchContentText()` |
| 后端 | `controller/StudyController.java` | `POST /api/study/audio-complete` |
| 后端 | `service/ArticleService.java` | `getArticles()` 加 userId，返回 `listened` |
| 后端 | `service/ClassicService.java` | `getClassicMeta()` 加 userId，返回 `listenedNodeIds` |
| 前端 | `utils/tts.ts` | `TTSCallbacks.onEnded`，`_playUrl`/`_playSequential` 中触发 |
| 前端 | `api/index.ts` | `completeAudioListen()` |
| 前端 | `constants/config.ts` | `calcAudioXP()` / `AUDIO_XP_CHARS_PER_POINT` |
| 前端 | `utils/storage.ts` | `getAudioListened()` / `isAudioListened()` / `markAudioListened()` |
| 前端 | `typings/index.d.ts` | `IArticle.listened`，`IClassicMeta.listenedNodeIds` |
| 前端 | `pages/article-reader/index.*` | `onEnded` → API + XP 动效 |
| 前端 | `pages/article-list/index.*` | 已读标记 + `onShow` 刷新 |
| 前端 | `pages/classic-reader/index.*` | `onEnded` → API + TOC 圆点标记 + XP 动效 |
| 前端 | `pages/level-system/index.wxml` | XP 规则文案更新 |
