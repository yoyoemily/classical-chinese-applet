---
name: invite-referral-system
description: 分享海报动态生成 + 邀请追踪体系（2026-07-29 上线，2026-07-29 审查优化）—— 小程序码+合成/邀请关系绑定/前后端全链路
metadata:
  type: project
---

# 邀请追踪体系

## Context

用户点击"分享给朋友"→ 后端调用微信 `wxacode.getUnlimited` 生成含 `i_{userId}` 场景值的专属小程序码 → Java 2D 合成到海报模板上 → 返回。有人扫码进来 → `app.ts` 捕获 scene → `reLogin()` 携带到 login body → `AuthService.login()` 中 `InviteService.bindInviter()` 写入 `invited_by` + `invited_count+1` + 回填 `invite_record`。

> 2026-07-29 审查通过：核心绑定逻辑（找上级/首次绑定/升级会员）完全正确。详见"绑定逻辑设计要点"。

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

## 配置

```yaml
# application.yml
invite:
  member-threshold: 5   # 推广人数达到此阈值后自动升级为契约会员
```

后端 `InviteService` 通过 `@Value("${invite.member-threshold:5}")` 注入，前端通过 `GET /api/invite/stats` → `{ totalInvited, memberThreshold }` 读取。前端 `mine/index.ts` 兜底默认值 `memberThreshold: 5`。

## 核心文件

### 后端

| 文件 | 角色 |
|------|------|
| `config/WechatMaProperties.java` | `@ConfigurationProperties("wechat")`，读已有 yml 的 app-id/app-secret |
| `config/WechatMaConfig.java` | WxMaService Bean（仿 WechatMpConfig 模式） |
| `entity/InviteRecord.java` | invite_record 实体 |
| `mapper/InviteRecordMapper.java` | MyBatis-Plus BaseMapper |
| `service/InviteService.java` | `generatePoster()`：wxacode 生成 + Java 2D 海报合成 + 内存缓存 1h；`bindInviter()`：事务绑定邀请关系；`getInviteCount()`；`getMemberThreshold()` |
| `controller/InviteController.java` | `GET /api/invite/poster?token=xxx`（exclude WebMvcConfig，手动解析 JWT）；`GET /api/invite/stats` → `{ totalInvited, memberThreshold }` |
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
| `utils/request.ts` | `reLogin()` 读取 launchScene → 携带到 login body；消费后设 `launchSceneConsumed=true`；登录成功缓存 userId；收到 10003 自动清 token 重登录 |
| `typings/index.d.ts` | `IAppOption.globalData` 新增 `launchScene`/`launchQuery`/`launchSceneConsumed`；`IInviteStats` 含 `totalInvited`/`memberThreshold` |
| `constants/config.ts` | `STORAGE_KEYS` 新增 `USER_ID` |
| `api/index.ts` | `fetchInvitePoster()` wx.downloadFile 包装；`fetchInviteStats()` |
| `pages/mine/index.ts` | `onTapShare` 用 `fetchInvitePoster`；`onShareAppMessage` path 带 `?inviter=`；`onTapBecomeMember` 读取 `memberThreshold` 动态计算进度 |
| `scripts/generate_poster_template.py` | 生成无码模板图 |

## 绑定逻辑设计要点

### 关键点 1：准确识别上级用户

- scene 格式 `i_{userId}`，服务端在 `generateWxacode` 中直接使用当前登录 userId 生成，不经过前端，无法伪造
- 前端 scene 优先于 inviterId（分享卡片 inviter 参数可由前端篡改，优先级更低）
- 解析逻辑：`parseInviterFromScene("i_123")` → `Long.parseLong(substring(2))` → 123

### 关键点 2：仅首次绑定 +1，重复扫码不重复加

```java
// Step 3: invited_by 已有值 → 直接返回
if (invitee.getInvitedBy() != null) return;

// Step 4: CAS 原子更新（数据库层面兜底）
UPDATE user SET invited_by = ? WHERE id = ? AND invited_by IS NULL;
// → 0 rows? 说明已被并发请求写入 → return

// Step 5: 原子 +1（SQL 级别原子操作）
UPDATE user SET invited_count = invited_count + 1 WHERE id = ?;
```

三道保险：Step 3 应用层检查 + Step 4 DB 层 CAS + `@Transactional` 事务。并发下只有第一个请求能写入 `invited_by` 并触发 +1。

### 关键点 3：invited_count 达阈值时升级 member_level

```java
// Step 6: 原子更新，只升不降
UPDATE user SET member_level = 1
WHERE id = ? AND member_level = 0 AND invited_count >= memberThreshold;
```

三条防线：`memberLevel=0`（已升级的不再改）+ `invitedCount >= memberThreshold`（不到阈值不触发）+ `@Transactional`（与 Step 5 同一事务）。

### anti-issues 已验证

- **自己扫自己码**：Step 2 `inviterUserId.equals(inviteeUserId)` → 跳过
- **老用户温启动扫码**：`onShow` 中 token 存在 → `doLogin()` 不触发；`launchSceneConsumed=true` → `captureLaunchParams` 跳过 → scene 不发给后端。老用户不受影响
- **老用户冷启动扫码**：invited_by 为空时正常绑定（正确行为，用户主动扫码）
- **已有上级的用户**：Step 3 `invitedBy != null` → 不覆盖
- **并发绑定同用户**：Step 4 CAS 保护，只触发一次 +1
- **并发升级 memberLevel**：`eq(memberLevel, 0)` 条件，已升级的不会被重复写入

### invite_record 写入策略

| 邀请来源 | 预写时机 | bindInviter Step 7 | sourceType |
|---------|---------|-------------------|------------|
| 海报扫码 | `generatePoster` → `ensureInviteRecord()` | UPDATE 命中 | 0 |
| 分享卡片 | 无预写 | UPDATE 未命中 → INSERT | 1 |

`ensureInviteRecord` 的并发竞态通过 `try-catch(DuplicateKeyException)` 静默处理。

### stale scene 防残留

`reLogin()` 消费 scene 时设 `launchSceneConsumed = true`。`captureLaunchParams` 检测到该标记后跳过写入，防止 `onLaunch` 消费后 `onShow` 重新写回同一 scene。

## 关键设计决策

- **scene 格式**：`i_{userId}`（≤12 字符，32 字符限制内）
- **小程序码参数**：width=430，isHyaline=true（透明底色），lineColor=#2e5d3c（深绿），page=pages/index/index
- **海报合成**：模板 720×1280 → 小程序码缩放 430→220px → 贴到 (250, 830) 带 16px 白底圆角卡片
- **token 传递**：海报 API 不走 LoginInterceptor（wx.downloadFile 无 header），token 走 query param，Controller 手动解析 JWT
- **绑定时机**：AuthService.login() 中一次完成，无需前端额外调用
- **防刷**：扫自己码跳过；invited_by 非空不覆盖；scene_code 唯一索引；事务保证 invited_count 一致性
- **内存缓存**：ConcurrentHashMap<Long, byte[]> key=userId，1h TTL；微信侧 wxacode.getUnlimited 同 scene+page 天然缓存

## 全链路

```
用户 A 点"分享给朋友"
  → fetchInvitePoster() → GET /api/invite/poster?token=xxx
  → InviteService.generatePoster(userId)
    → wxMaService.getQrcodeService().createWxaCodeUnlimitBytes(scene="i_{userId}", ...)
    → 加载 classpath 模板图 + Java 2D 合成
    → 写 invite_record(inviter_id, scene_code) 幂等
    → 缓存 1h
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
          6. UPDATE inviter SET member_level = 1 WHERE id=? AND member_level=0 AND invited_count>=memberThreshold
          7. 回填 invite_record: UPDATE 优先（海报预写），未命中则 INSERT（卡片分享）
    → 签发 JWT
```

## 后续可扩展

- invite_record 表做邀请排行榜
- 邀请人获得 XP 奖励（在 bindInviter 中加一行 user.total_xp += N）
