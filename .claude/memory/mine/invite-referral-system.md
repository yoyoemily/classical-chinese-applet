---
name: invite-referral-system
description: 分享海报动态生成 + 邀请追踪体系（2026-07-29 上线，2026-07-30 重构为手动签契）—— 小程序码+合成/邀请关系绑定/前后端全链路
metadata:
  type: project
---

# 邀请追踪体系

## Context

用户点击"分享给朋友"→ 后端调用微信 `wxacode.getUnlimited` 生成含 `i_{userId}` 场景值的专属小程序码 → Java 2D 合成到海报模板上 → 返回。有人扫码进来 → `app.ts` 捕获 scene → `reLogin()` 携带到 login body → `AuthService.login()` 中 `InviteService.bindInviter()` 写入 `invited_by` + `invited_count+1` + 回填 `invite_record`。

> **2026-07-30 重构**：签订契约改为手动签契（`POST /api/user/pact`），不再依赖推广数自动升级。`InviteService.bindInviter()` 中的自动升级逻辑已删除。`member-threshold` 配置仅保留用于前端进度展示参考。

---

## 前端交互

### 门禁机制

- 累计打卡满 `GATE_ACCUMULATED_DAYS` 天（默认 10，-1=关闭）+ 非契约会员 → 首页点击「开始学习」弹出门禁弹窗
- 弹窗文案："你已累计学习 N 天" + "成为契约会员，才能继续学习"
- 点击「成为契约会员」→ `wx.switchTab` 跳转「我的」页面；弹窗底部有「暂不」可关闭
- 累计天数来源：`user.checkin_days`（每次首次打卡 +1），使用 `checkinDays` 字段，非 `longestStreak`
- 不再依赖微信公众号，不再需要学习码

### mine 页分享海报（二阶段签订契约流程）

- **非会员（memberLevel=0）**：分享区域显示"成为契约会员"绿色实心按钮
  - 点击 → 打开海报弹窗（阶段一：海报图 + "保存海报" + "签订契约"按钮）
  - 阶段二（点击"签订契约"）：金石契签订 UI（📜 + 契约文案"君以分享托付文言雀，文言雀亦以赤诚报君，此约既成，金石不渝" + ☑ 复选框"余今签契，行之以诚" + "签订契约"金色按钮 + 底部"契约既签，永久免费学习"）
  - 勾选复选框后点"签订契约" → `POST /api/user/pact` → 刷新 profile 变为契约会员 → 关闭弹窗
- **会员（memberLevel>=1）**：分享区域显示"分享给朋友"虚线按钮，点击直接生成专属海报（单阶段，无契约入口）
- 海报含用户专属小程序码（scene=`i_{userId}`），扫码进入时自动记录邀请关系
- 卡片转发（`onShareAppMessage`）和朋友圈分享（`onShareTimeline`）通过右上角 ··· 原生菜单触发，均携带 `inviter={userId}` 追踪推广
- 海报不缓存：每次实时查数据库获取最新头像和昵称
- 金石契弹窗（`showNuoDialog`）保留，供已获契约会员查看

### my 页面结构

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

## 核心设计要点

### 绑定逻辑（三重防重复）

```java
// Step 1: 自己扫自己 → 跳过
if (inviterUserId.equals(inviteeUserId)) return;

// Step 2: 已有上级 → 跳过（不覆盖）
if (invitee.getInvitedBy() != null) return;

// Step 3: CAS 原子写入（数据库层兜底）
UPDATE user SET invited_by = ? WHERE id = ? AND invited_by IS NULL;
// → 0 rows? 说明已被并发请求写入 → return

// Step 4: 原子 +1（SQL 级别）
UPDATE user SET invited_count = invited_count + 1 WHERE id = ?;
```

三道保险：应用层检查 + DB 层 CAS + `@Transactional` 事务。并发下只有第一个请求能写入 `invited_by` 并触发 `invited_count+1`。

### 签订契约（手动）

用户在我的页面完成二阶段交互（海报弹窗 → 金石契签订 UI → 勾选确认 → 点击"签订契约"），前端调用 `POST /api/user/pact` → `UserService.signPact()` 设置 `member_level=1`，无前置校验。不再依赖推广数自动升级。

### anti-issues 已验证

- **自己扫自己码**：Step 1 跳过
- **老用户温启动扫码**：`onShow` 中 token 存在 → `doLogin()` 不触发；`launchSceneConsumed=true` → scene 不发给后端
- **老用户冷启动扫码**：invited_by 为空时正常绑定（正确行为）
- **已有上级的用户**：Step 2 不覆盖
- **并发绑定同用户**：Step 3 CAS 保护，只触发一次 +1
- **防刷**：扫自己码跳过；invited_by 非空不覆盖；scene_code 唯一索引；事务保证一致性

### invite_record 写入策略

| 邀请来源 | 预写时机 | bindInviter | sourceType |
|---------|---------|-------------|------------|
| 海报扫码 | `generatePoster` → `ensureInviteRecord()` | UPDATE 命中 | 0 |
| 分享卡片 | 无预写 | UPDATE 未命中 → INSERT | 1 |

`ensureInviteRecord` 的并发竞态通过 `try-catch(DuplicateKeyException)` 静默处理。

### stale scene 防残留

`reLogin()` 消费 scene 时设 `launchSceneConsumed = true`。`captureLaunchParams` 检测到该标记后跳过写入，防止 `onLaunch` 消费后 `onShow` 重新写回同一 scene。

---

## 数据库

```sql
-- user 表新增
ALTER TABLE user ADD COLUMN invited_by BIGINT COMMENT '邀请人（上级）用户ID，首次登录写入不可修改';
ALTER TABLE user ADD COLUMN invited_count INT NOT NULL DEFAULT 0 COMMENT '已邀请人数（推广数）';

-- 邀请明细表
CREATE TABLE invite_record (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  inviter_id      BIGINT NOT NULL,
  invitee_id      BIGINT COMMENT '被邀请人用户ID（登录后回填，可空）',
  scene_code      VARCHAR(32) NOT NULL COMMENT 'scene 值 i_{userId}',
  source_type     TINYINT NOT NULL DEFAULT 0 COMMENT '0=海报扫码 1=分享卡片',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bound_at        DATETIME COMMENT '绑定时间',
  UNIQUE INDEX idx_invite_record_scene (scene_code)
);
```

---

## 配置

```yaml
# application.yml
invite:
  member-threshold: 5   # 仅用于前端进度展示参考，不再自动升级
```

---

## 关键设计决策

- **scene 格式**：`i_{userId}`（≤12 字符，32 字符限制内）
- **小程序码参数**：width=430，isHyaline=true（透明底色），lineColor=#2e5d3c（深绿），page=pages/index/index
- **海报合成**：模板 720×1280 → 小程序码缩放 430→220px → 贴到 (250, 830)，白底圆角卡片（24px 圆角）
- **海报不再缓存**：每次实时查数据库获取最新头像和昵称
- **token 传递**：海报 API 不走 LoginInterceptor（wx.downloadFile 无 header），token 走 query param，Controller 手动解析 JWT
- **绑定时机**：`AuthService.login()` 中一次完成，无需前端额外调用
- **登录链路**：`app.ts captureLaunchParams()` 解析 scene/inviter → globalData → `request.ts reLogin()` 携带到 login body；`launchSceneConsumed` 标记防 stale scene 残留

---

## 海报合成

- **模板**：`scripts/generate_poster_template.py`（Pillow 合成 720×1280，不含小程序码）→ `assets/share-poster-template.png`
- **服务端合成**：Java 2D BufferedImage + Graphics2D
  - 上半部分：圆形头像（120px，4px 白色描边，水平居中，Y=116）→「{昵称} 邀你打卡文言雀」（Bold 30px SansSerif 深灰色，Y=290）
  - 下半部分：小程序码白底卡片（24px 圆角）→ 下方"长按或扫码进入"（22px SansSerif 灰色）
  - 头像从 `user.avatarUrl` 下载（末尾 /132→/0 取原图），下载失败静默跳过
- **字体**：SansSerif Bold 30px（邀请文案）/ SansSerif Plain 22px（提示文字）
- **API**：`GET /api/invite/poster?token=xxx`（加入 WebMvcConfig exclude 列表，Controller 手动解析 JWT）
- **邀请统计 API**：`GET /api/invite/stats` → `Result.ok(Map.of("totalInvited", count, "memberThreshold", threshold))`

---

## 核心文件

### 后端

| 文件 | 角色 |
|------|------|
| `config/WechatMaProperties.java` | `@ConfigurationProperties("wechat")`，读已有 yml 的 app-id/app-secret |
| `config/WechatMaConfig.java` | WxMaService Bean（仿 WechatMpConfig 模式） |
| `entity/InviteRecord.java` | invite_record 实体 |
| `mapper/InviteRecordMapper.java` | MyBatis-Plus BaseMapper |
| `service/InviteService.java` | `generatePoster()`：wxacode 生成 + Java 2D 海报合成；`bindInviter()`：事务绑定邀请关系（不再自动升级）；`getInviteCount()`；`getMemberThreshold()` |
| `controller/InviteController.java` | `GET /api/invite/poster?token=xxx`（exclude WebMvcConfig，手动 JWT）；`GET /api/invite/stats` |
| `dto/LoginRequest.java` | 新增 `scene`、`inviterId` 字段 |
| `service/AuthService.java` | `login()` 中调 `bindInviterIfNeeded()` 绑定邀请 |
| `config/WebMvcConfig.java` | `/api/invite/poster` 加入 excludePathPatterns |
| `pom.xml` | 新增 `weixin-java-miniapp:4.7.0` |
| `data/schema.sql` | user 加列 + invite_record 表 |
| `resources/static/assets/share-poster-template.png` | 无码海报模板（720×1280） |
| `resources/application.yml` | `invite.member-threshold` 配置 |

### 前端

| 文件 | 角色 |
|------|------|
| `app.ts` | `captureLaunchParams()` 解析 scene/inviter → globalData.launchScene/launchQuery；`launchSceneConsumed` 标记防 stale scene 残留 |
| `utils/request.ts` | `reLogin()` 读取 launchScene → 携带到 login body；消费后设 `launchSceneConsumed=true` |
| `typings/index.d.ts` | `IAppOption.globalData` 新增 `launchScene`/`launchQuery`/`launchSceneConsumed`；`IInviteStats` |
| `api/index.ts` | `fetchInvitePoster()` wx.downloadFile 包装；`fetchInviteStats()`；`signPact()` |
| `pages/mine/index.ts` | `onTapBecomeMember`（→`onTapShare`直接生成海报）、`onTapShare`（二阶段海报弹窗：阶段一海报+保存+签订契约按钮，阶段二金石契签订UI）、`onConfirmShare`（进入阶段二）、`onTogglePactCheck`（复选框）、`onConfirmPact`（调 `signPact` → 刷新profile → 关闭）、`onSavePoster`（保存海报到相册）、`onShareAppMessage` + `onShareTimeline` 带 inviter |
| `pages/index/index.ts` | `onTapStartLearning()` 门禁检查（`checkinDays >= GATE_ACCUMULATED_DAYS && memberLevel < 1` → 弹窗提示「你已累计学习 N 天，成为契约会员才能继续学习」）。弹窗有「成为契约会员」按钮（`wx.switchTab` 跳转我的）和「暂不」关闭 |
| `constants/config.ts` | `GATE_ACCUMULATED_DAYS`（默认 10，-1 关闭） |
| `scripts/generate_poster_template.py` | 生成无码模板图（720×1280） |

---

## 全链路

```
用户 A 点"分享给朋友"
  → fetchInvitePoster() → GET /api/invite/poster?token=xxx
  → InviteService.generatePoster(userId)
    → wxMaService.getQrcodeService().createWxaCodeUnlimitBytes(scene="i_{userId}", ...)
    → 加载 classpath 模板图 + Java 2D 合成（头像+文案+码+提示文字）
    → 写 invite_record(inviter_id, scene_code) 幂等
  → 返回 PNG 字节流
  → 前端弹窗展示 → 用户保存/分享

用户 B 扫码打开小程序
  → app.ts captureLaunchParams() 捕获 scene="i_{userId}"
  → app.ts doLogin() → reLogin()
  → POST /api/auth/login { code, scene: "i_{userId}" }
  → AuthService.login()
    → findOrCreateByOpenId(openId)
    → bindInviterIfNeeded(user, scene, inviterId)
      → InviteService.bindInviter(inviteeUserId, "i_{userId}")
        → 事务:
          1. 解析 inviterUserId from scene
          2. 自己扫自己? → 跳过
          3. invitee.invited_by != null? → 跳过（已有上级，不覆盖）
          4. UPDATE invitee SET invited_by = inviterUserId WHERE id=? AND invited_by IS NULL
          5. UPDATE inviter SET invited_count = invited_count + 1 WHERE id=?
          6. 回填 invite_record: UPDATE 优先（海报预写），未命中则 INSERT（卡片分享）
    → 签发 JWT

用户 A 签订契约（在我的页面）
  → 打开海报弹窗 → 点击"签订契约"进入阶段二
  → 金石契 UI：📜 + 契约文案 + ☑ 复选框 + "签订契约"按钮
  → 勾选后点击 → POST /api/user/pact → member_level=1
  → 刷新 profile → 关闭弹窗
```

---

## 相关联记忆

无。邀请体系信息已全部在本文件中。
