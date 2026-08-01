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

- 累计打卡满 `GATE_ACCUMULATED_DAYS` 天（默认 10，-1=关闭）+ 非契约会员 → 首页点击「开始学习」弹出门禁弹窗
- 弹窗文案："你已累计学习 N 天" + "成为契约会员，才能继续学习"
- 点击「成为契约会员」→ `wx.switchTab` 跳转「我的」页面；弹窗底部有「暂不」可关闭
- **累计天数来源**：`user.checkin_days`（每次首次打卡 +1），门禁使用 `checkinDays` 字段，非 `longestStreak`（历史最长连续天数）
- **不再依赖微信公众号，不再需要学习码**。

### mine 页分享海报（2026-07-30 重构为二阶段签订契约流程）

**交互流程**：

- **非会员（memberLevel=0）**：分享区域显示"成为契约会员"绿色实心按钮
  - 点击 → 直接打开海报弹窗（调用 `onTapBecomeMember()` → `onTapShare()`）
  - 阶段一：专属海报图 + "保存海报"按钮 + "签订契约"按钮（始终可点击）
  - 阶段二（点击"签订契约"后）：金石契签订 UI（📜 + 契约文案"君以分享托付文言雀，文言雀亦以赤诚报君，此约既成，金石不渝" + 👉 复选框"余今签契，行之以诚" + "签订契约"金色按钮 + 底部"契约既签，永久免费学习"）
  - 勾选复选框后点"签订契约" → `POST /api/user/pact` → 刷新 profile 变为契约会员 → 关闭弹窗
- **会员（memberLevel>=1）**：分享区域显示"分享给朋友"虚线按钮，点击直接生成专属海报（单阶段，无契约入口）
- 海报含用户专属小程序码（scene=`i_{userId}`），扫码进入时自动记录邀请关系
- 海报后端合成时，上半部分绘制圆形头像（120px，4px 白色描边，水平居中，Y=116）→「{昵称} 邀你打卡文言雀」（Bold 30px SansSerif 深灰色，Y=290），下半部分小程序码白底卡片圆角 24px，下方"长按或扫码进入"灰色提示。头像从 `user.avatarUrl` 下载（末尾 /132→/0 取原图），下载失败静默跳过
- 卡片转发（`onShareAppMessage`）和朋友圈分享（`onShareTimeline`）通过右上角 ··· 原生菜单触发，均携带 `inviter={userId}` 追踪推广
- **签订契约**：手动签契（`POST /api/user/pact`），不再依赖推广数自动升级。`InviteService.bindInviter()` 中的自动升级逻辑已删除
- **海报不再缓存**：每次实时查数据库获取最新头像和昵称，删除了旧的 `ConcurrentHashMap` 1h TTL 内存缓存
- 金石契弹窗（`showNuoDialog`）保留，供已获契约会员查看

### 邀请追踪（2026-07-29 新增，同日审查优化）

- **user 表**：`invited_by`（上级ID，首次登录写入不可修改）+ `invited_count`（推广数，自治 +1）
- **invite_record 表**：邀请明细（inviter_id/invitee_id/scene_code/source_type/bound_at），scene_code 唯一
- **绑定逻辑**（三重防重复）：① invited_by 非空直接返回 ② `UPDATE WHERE invited_by IS NULL` CAS 原子写入 ③ `@Transactional` 事务保证
- **会员升级**：仅手动签契（`POST /api/user/pact` → `member_level=1`），推广数不再自动升级。`member-threshold` 配置仅保留用于参考
- **小程序码生成**：后端 `InviteService.generatePoster()` 调 `wxacode.getUnlimited`（`weixin-java-miniapp:4.7.0`），scene 格式 `i_{userId}`，颜色深绿 #2e5d3c，透明底色
- **海报合成**：模板图 `share-poster-template.png`（720×1280，不含码）→ Java 2D 将 430px 小程序码缩放至 220px → 贴到模板 (250, 830) 带白底圆角卡片
- **绑定时机**：`AuthService.login()` 中，scene/inviterId 传入 → `InviteService.bindInviter()` 事务
- **登录链路**：app.ts `captureLaunchParams()` 解析 scene/inviter → globalData → `request.ts reLogin()` 携带到 login body；`launchSceneConsumed` 标记防 stale scene 残留
- **invite_record 写入**：海报扫码预写（`ensureInviteRecord`，sourceType=0）+ 卡片分享 on-the-fly INSERT（sourceType=1）
- **海报不缓存**：`wxacode.getUnlimited` 微信侧已有缓存，每次生成海报实时查数据库取最新头像昵称
- **配置化阈值**：`application.yml` → `invite.member-threshold: 5`，仅用于前端进度展示参考，不再自动升级
- **防刷**：扫自己码跳过；invited_by 已有值不覆盖；scene_code 唯一索引；memberLevel 已为 1 不重复升级；老用户温启动不绑定

### 海报生成

- 模板脚本：`scripts/generate_poster_template.py`（Pillow 合成 720×1280，不含小程序码，不含顶部品牌文字）→ `assets/share-poster-template.png`
- 原始脚本：`scripts/generate_poster.py`（含静态码的旧版，已不用于线上）
- 服务端合成：Java 2D BufferedImage + Graphics2D，上半部分绘制"{昵称} 邀你打卡文言雀"，二维码白底圆角卡片（24px 圆角）+ 缩放小程序码 + 下方"长按或扫码进入"提示
- 模板部署：后端 `resources/static/assets/share-poster-template.png`
- 海报 API：`GET /api/invite/poster?token=xxx`（加入 WebMvcConfig exclude 列表，Controller 手动解析 JWT）
- 邀请统计 API：`GET /api/invite/stats` → `Result.ok(Map.of("totalInvited", count))`，读 `user.invited_count`
- 字体：SansSerif Bold 30px（邀请文案）/ SansSerif Plain 22px（提示文字）


### 关键代码

| 层 | 文件 | 关键位置 |
|----|------|---------|
| 后端 API | `POST /api/user/pact` | `UserService.signPact()` 设置 memberLevel=1，无前置校验 |
| 后端 Profile | `GET /api/user/profile` | 返回 `memberLevel`、`longestStreak`、`checkinDays` |
| 后端打卡 | `StudyService.java` / `UserMapper.java` | `completeStudy()` 当日首次打卡时 `updateCheckinDays(userId)` SQL 原子 +1；`UserMapper.updateCheckinDays()` |
| 前端 mine 页 | `pages/mine/index.*` | 非会员CTA按钮"成为契约会员" + 二阶段海报弹窗（保存海报→签订契约） + 会员分享按钮 + 金石契弹窗 |
| 前端门禁常量 | `constants/config.ts` | `GATE_ACCUMULATED_DAYS`（默认 10，-1 关闭） |
| 前端首页 | `pages/index/index.ts` | `onTapStartLearning()` 检查门禁：`checkinDays >= GATE_ACCUMULATED_DAYS && memberLevel < 1` → 弹窗提示「你已累计学习 N 天，成为契约会员才能继续学习」|
| 前端首页弹窗 | `pages/index/index.*` | `showGate` → 弹窗有「成为契约会员」按钮（`wx.switchTab` 跳转我的）和「暂不」关闭 |
| 前端首页数据 | `pages/index/index.ts` | `loadData()` 从 profile 取 `checkinDays` |
| 后端邀请统计 | `GET /api/invite/stats` | 返回 `{ totalInvited, memberThreshold }`，读 `user.invited_count` + `InviteService.getMemberThreshold()` |
| 后端海报合成 | `InviteService.java` | `compositePoster()` 绘制圆形头像 + 邀请文案 + 二维码白底卡片（圆角24px）+ 提示文字；`downloadAndCropCircle()` 下载头像并圆形裁剪 |
| 后端配置 | `application.yml` | `invite.member-threshold: 5` 推广升级阈值 |

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
│  📜 成为契约会员（绿底白字）  │  ← memberLevel=0 时显示
│  📤 分享给朋友（虚线按钮）  │  ← memberLevel>=1 时显示
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
| 前端常量 | `constants/config.ts` | `LEVEL_THRESHOLDS`、`RANK_TITLES`、`calcLevel()`、`GATE_ACCUMULATED_DAYS` |
| 前端 API | `api/index.ts` | `fetchUserProfile()`（返回含 `longestStreak`）、`fetchBadges()`、`fetchInvitePoster()`、`fetchInviteStats()` |
| 后端等级 | `UserService.java` | `LEVEL_THRESHOLDS` + `calcLevel()` + `getUserProfile()` |
| 后端 XP | `StudyService.java` | `completeWord()` 判新学词（createdAt < todayStart）+ 即时写入 `user.total_xp`；`submitAnswer()` 和 `completeStudy()` 不再写 XP |
| 后端 API | `StudyController.java` | `POST /api/study/word-complete` |
| 后端勋章 | `StudyService.java` | `checkNewBadges()` |
| 后端契约 | `InviteService.java` | `bindInviter()` 事务：invited_count+1 → 推广达 `memberThreshold` 自动 memberLevel=1；三重防重复 + 只升不降 |
| 后端邀请 | `InviteService.java` | `generatePoster()` 合成海报（含邀请文案+二维码+提示文字）、`getInviteCount()` 读 user.invited_count |
| 后端邀请 API | `InviteController.java` | `GET /api/invite/poster`（手动JWT，返回PNG）、`GET /api/invite/stats`（`Result.ok(Map.of(...))`） |
| 后端配置 | `WechatMaConfig.java` / `WechatMaProperties.java` | WxMaService Bean（仿 WechatMpConfig 模式） |
| 后端数据 | `source.json` | `badges[]` 8 枚勋章定义 |
| 海报模板脚本 | `scripts/generate_poster_template.py` | Pillow 合成 720×1280 无码模板 |
| 海报旧脚本 | `scripts/generate_poster.py` | 含静态码旧版（已不用） |
| 前端链路 | `app.ts` / `utils/request.ts` | `captureLaunchParams()` 解析 scene → `reLogin()` 携带到 login body → `launchSceneConsumed` 防残留；401 自动 re-login |
| 前端 my 页 | `pages/mine/index.ts` | `onTapBecomeMember`（→`onTapShare`直接生成海报）、`onTapShare`（二阶段海报弹窗：阶段一海报+保存+签订契约按钮，阶段二金石契签订UI）、`onConfirmShare`（进入阶段二）、`onTogglePactCheck`（复选框）、`onConfirmPact`（调 `signPact` → 刷新profile → 关闭）、`onSavePoster`（保存海报到相册）、`onShareAppMessage` + `onShareTimeline` 带 inviter |

[[study-section]]

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

## 相关联记忆

[[invite-referral-system]]
