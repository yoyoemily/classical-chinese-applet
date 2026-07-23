---
name: redeem-code-plan
description: 专项任务：分享门禁改为关注服务号→获取学习码→（首次）签金石契。触发词：学习码、门禁改造、兑换码、redeem code
metadata:
  type: project
---

# 分享门禁 → 公众号学习码兑换 改造计划

## Context

**问题**：旧门禁机制（下载海报→分享朋友圈→签金石契）只在用户连续打卡 10 天时拦截一次，后续再无触达用户的渠道。

**目标**：将门禁改为关注服务号 → 获取学习码 → 输入验证 →（首次）签金石契。两个独立维度：

| 维度 | 字段 | 含义 | 生命周期 |
|------|------|------|------|
| 学习码是否有效 | `redeem_code.status` + 30 天活跃判断 | 证明用户当前关注了服务号 | 30 天不活跃 → 失效，需重新关注获取 |
| 是否契约会员 | `user.member_level` | 精神约定 | 签过一次永久有效，不因码过期失效 |

核心价值：
1. 用户关注服务号后，后续可通过模板消息触达
2. 30 天不活跃 → 码失效 → 门禁再触发 → 重新关注获取新码 → **签过契的跳过签契，直接解锁**
3. 签契只签一次，仪式感保留

**关键前提**：服务号与企业为同一主体（正在申请中），可在 MP 后台直接互绑，无需开放平台。

---

## 一、后端改动 ✅ 已完成

### 1.1 新增 redeem_code 表

```sql
CREATE TABLE redeem_code (
  id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(32)  NOT NULL UNIQUE COMMENT '兑换码，6 位数字',
  user_id     BIGINT       NOT NULL COMMENT '所属用户ID',
  status      TINYINT      NOT NULL DEFAULT 0 COMMENT '0=未使用 1=已验证 2=已过期',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME     COMMENT '验证时间',
  INDEX idx_redeem_user_id (user_id),
  INDEX idx_redeem_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习码兑换记录';
```

**设计要点**：
- 一用户一码（同一时刻只有一个 status=0 的码，旧码生成新码时过期）
- 学习码 6 位纯数字，易输入
- 学习码验证 ≠ 签契——验证通过只代表用户确实关注了公众号，签契是独立的精神约定步骤
- 过期逻辑不靠 `expires_at` 字段，靠 **30 天不活跃** 的运行时判断

### 1.2 新增 `user.last_active_at` 字段

```sql
ALTER TABLE `user` ADD COLUMN last_active_at DATETIME COMMENT '最后活跃时间';
```

在 `LoginInterceptor` 中每次请求调用 `userMapper.updateLastActiveAt(userId)` 更新。失败不影响请求。

### 1.3 学习码状态码 `codeStatus`

前端不关心 `codeVerified`/`codeActive` 两个 boolean，统一用后端返回的 `codeStatus` 单一标识：

| codeStatus | 含义 | 判断依据 |
|:--:|------|------|
| -1 | 从没绑过码 | redeem_code 表无 status=1 且无 status=2 记录 |
| 1 | 码有效 | 有 status=1 记录 + 30 天内有活跃 |
| 2 | 码已过期 | 有 status=1 或 status=2 记录，但 30 天不活跃 → status=1 被动改为 2 |

> **注意**：status=0（后台生成但未验证）不算绑过，codeStatus 仍为 -1。
>
> 30 天不活跃的判定：运行时检查 `user.last_active_at`，非独立的到期字段。`buildMemberStatus()` 每次调用时检查，不活跃时自动将 status=1 → 2，然后查 status=2 确认"过期"身份。

**门禁条件**：`streak >= SHARE_GATE_STREAK_DAYS && (memberLevel < 1 || codeStatus !== 1)`

### 1.4 signPact() 新增前置校验

`signPact()` 现在要求必须有已验证的学习码（status=1），否则抛出 BusinessException "请先关注公众号获取学习码"。

### 1.5 新增 API

| API | 方法/路径 | 用途 | 状态 |
|-----|-----------|------|:--:|
| `POST /api/user/verify-code` | POST `{ code }` | 验证学习码（仅校验，不改 memberLevel） | ✅ |
| `GET /api/user/member-status` | GET | 会员状态快照（含 30 天过期判断） | ✅ |
| `POST /api/admin/generate-code` | POST `{ userId }` | 管理端生成学习码（6 位数字） | ✅ |

### 1.6 新增文件

| 文件 | 内容 |
|------|------|
| `entity/RedeemCode.java` | 实体类，对应 redeem_code 表 |
| `mapper/RedeemCodeMapper.java` | MyBatis-Plus BaseMapper |
| `dto/VerifyCodeRequest.java` | `{ code: String }` 请求体 |

### 1.7 修改文件

| 文件 | 改动 |
|------|------|
| `entity/User.java` | 新增 `lastActiveAt` 字段 |
| `mapper/UserMapper.java` | 新增 `updateLastActiveAt(Long userId)` 方法 |
| `config/LoginInterceptor.java` | 注入 `UserMapper`，JWT 验证通过后更新 `last_active_at` |
| `service/UserService.java` | 新增 `verifyCode()`、`getMemberStatus()`、`generateCode()`；`signPact()` 增加前置校验；`buildMemberStatus` 返回 `codeStatus`（-1/1/2）；`getUserProfile()` 返回 `codeStatus` |
| `controller/UserController.java` | 新增 `POST /api/user/verify-code`、`GET /api/user/member-status` |
| `controller/ImportController.java` | 新增 `POST /api/admin/generate-code` |
| `data/schema.sql` | `user` 表加 `last_active_at` 列，新增 `redeem_code` 表定义 |

---

## 二、前端改动 ✅ 已完成

### 2.1 基础设施文件

| 文件 | 改动 |
|------|------|
| `constants/config.ts` | 新增 `REDEEM_CODE_EXPIRE_DAYS = 30` |
| `typings/index.d.ts` | 新增 `IMemberStatus` 接口 |
| `api/index.ts` | 新增 `verifyCode()`、`fetchMemberStatus()`；`fetchUserProfile()` 返回 `codeStatus` |
| `utils/request.ts` | 400 分支优先读响应体 `resData.message` 显示业务错误消息 |

### 2.2 首页门禁弹窗 `pages/index/index.*`

**三阶段设计**：

| 阶段 | 内容 | 场景 |
|------|------|------|
| 阶段一 | 🎉 坚持学习N天 + 服务号二维码 + "我已关注，输入学习码" | 从没绑过码（codeStatus=-1） |
| 阶段一（过期） | ⏰ 好久不见！学习码已过期 + 重新获取 | 码已过期（codeStatus=2） |
| 阶段二 | 输入框（6位数字纯digit） + "确认验证" + 错误提示 + 返回关注 | 用户点击"输入学习码" |
| 阶段三 | 金石契 + 复选框 + 签订契约（仅 memberLevel<1 展示） | 验证通过且未签契；或 codeStatus=1+未签契时跳过阶段一二 |

**Data 字段**：`showGate`、`gateStep`（1\|2\|3）、`redeemCode`、`pactChecked`、`codeStatus`（-1\|1\|2）、`codeExpired`、`codeError`

**方法**：`onGoToInputCode()`、`onGoBackToQrcode()`、`onInputCode()`、`onVerifyCode()`、`onTogglePactCheck()`、`onSignPact()`

**移除**：`onGoToPoster()`、`onCloseShareGate()`、分享门禁老弹窗

**门禁触发**（`onTapStartLearning`）：
```
streak >= SHARE_GATE_STREAK_DAYS && (memberLevel < 1 || codeStatus !== 1)
  → codeStatus=1 + 未签契 → 跳过阶段一二，直接签契（gateStep=3）
  → codeStatus=2 → 弹窗阶段一，过期文案（⏰ 好久不见）
  → codeStatus=-1 → 弹窗阶段一，欢迎文案（🎉 坚持N天）
  → 已签契 + codeStatus=1 → 无门禁，正常学习
```
- 弹窗内按钮改为 `<view>`（非 `<button>`），避免原生 padding 干扰

**阶段一文案分支**（`codeExpired` 标识）：
- 未过期（codeStatus=-1）：🎉 坚持了N天 + "关注公众号，获取永久学习码"
- 已过期（codeStatus=2）：⏰ 好久不见！你的学习码已过期 + "请重新关注公众号，获取新的学习码"

**学习码输入**：`type="digit"` 纯数字键盘，`onInputCode` 过滤 `\D` 截断 6 位

### 2.3 「我的」页面

**保持旧流程不变**：下载海报 → 签金石契。不受门禁改造影响。金石契弹窗（`showNuoDialog`）保持不变。

---

## 三、门禁流程

```
从没绑过码：打卡满N天 → 弹窗阶段一（🎉 欢迎）→ 阶段二（输入6位数字码）→ 阶段三（签契）→ 关闭弹窗，用户自行点击开始学习
码过期回来：打卡满N天 → 弹窗阶段一（⏰ 过期文案）→ 阶段二（输入码）→ 已签契则关闭弹窗 / 未签契则进入阶段三签契
码有效+未签契：打卡满N天 → 跳过阶段一二 → 直接签契（阶段三）→ 关闭弹窗
已签契+码有效：打卡满N天 → 无门禁，正常学习
```

---

## 四、待完成

1. **服务号回调**（Phase 2）：新建 `WechatMpController` + `WechatMpService`，依赖 WxJava SDK，处理 subscribe 事件自动生成学习码并回复。等服务号审批通过后实现。
2. 管理后台生成码 `POST /api/admin/generate-code` 接口已就绪，可在后台管理界面调用
3. ✅ 服务号二维码图片 `/assets/qrcode-mp.jpg` 已替换为真实二维码
