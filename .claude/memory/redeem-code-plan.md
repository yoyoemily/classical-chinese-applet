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

### 1.3 memberLevel vs 学习码有效期：两个独立标识

| 概念 | 字段 | 何时设为 1 | 何时失效 |
|------|------|------------|----------|
| 契约会员 | `user.member_level` | 签契时写入（一次性） | **永不失效** |
| 学习码有效 | `redeem_code.status=1` + 30 天活跃 | 用户输入正确码时 | 30 天不活跃 → status→2 |

**门禁条件**：`streak >= 10 && (memberLevel < 1 || !codeActive)`

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
| `service/UserService.java` | 新增 `verifyCode()`、`getMemberStatus()`、`generateCode()`；`signPact()` 增加前置校验；`getUserProfile()` 返回 `codeVerified`/`codeActive` |
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
| `api/index.ts` | 新增 `verifyCode()`、`fetchMemberStatus()`；`fetchUserProfile()` 返回类型补齐 `codeVerified`/`codeActive` |
| `utils/request.ts` | 400 分支优先读响应体 `resData.message` 显示业务错误消息 |

### 2.2 首页门禁弹窗 `pages/index/index.*`

**三阶段设计**：

| 阶段 | 内容 | 场景 |
|------|------|------|
| 阶段一 | 🎉 坚持学习N天 + 服务号二维码 + "我已关注，输入学习码" | 所有门禁触发 |
| 阶段二 | 输入框（6位数字） + "确认验证" + 错误提示 + 返回关注 | 用户点击"输入学习码" |
| 阶段三 | 金石契 + 复选框 + 签订契约（仅 memberLevel=0 展示） | 验证通过且未签契 |

**Data 字段**：`showGate`、`gateStep`、`redeemCode`、`pactChecked`、`codeActive`、`codeVerified`、`codeError`

**方法**：`onGoToInputCode()`、`onGoBackToQrcode()`、`onInputCode()`、`onVerifyCode()`、`onTogglePactCheck()`、`onSignPact()`

**移除**：`onGoToPoster()`、`onCloseShareGate()`、分享门禁老弹窗

**门禁触发**（`onTapStartLearning`）：
```
streak >= 10 && (memberLevel < 1 || !codeActive)
  → 已签契 + 码有效 → 无门禁
  → 已签契 + 码过期 → 弹窗，跳过阶段三
  → 未签契 → 弹窗，完整三阶段
```

### 2.3 「我的」页面

**保持旧流程不变**：下载海报 → 签金石契。不受门禁改造影响。金石契弹窗（`showNuoDialog`）保持不变。

---

## 三、门禁流程

```
首次：打卡满10天 → 弹窗阶段一（公众号二维码）→ 阶段二（输入6位数字码）→ 阶段三（签契）→ 学习
码过期后回来：打卡满10天 → 弹窗阶段一 → 阶段二（输入码）→ 直接学习（跳过签契）
已签契+码有效：打卡满10天 → 无门禁，正常学习
已签契+码过期：打卡满10天 → 弹窗阶段一 → 阶段二（输入码）→ 直接学习
```

---

## 四、待完成

1. **服务号回调**（Phase 2）：新建 `WechatMpController` + `WechatMpService`，依赖 WxJava SDK，处理 subscribe 事件自动生成学习码并回复。等服务号审批通过后实现。
2. **服务号二维码图片**：替换占位图 `/assets/qrcode-mp.jpg` 为真实服务号二维码。
3. **管理后台生成码**：`POST /api/admin/generate-code` 接口已就绪，可在后台管理界面调用。
