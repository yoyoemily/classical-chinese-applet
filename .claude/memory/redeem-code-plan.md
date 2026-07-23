# 分享门禁 → 公众号学习码兑换 改造计划

## Context

**问题**：当前门禁机制（下载海报→分享朋友圈→签金石契）只在用户连续打卡 10 天时拦截一次，后续再无触达用户的渠道。用户打卡完毕后可能不再使用小程序，运营方无法主动触达。

**目标**：将门禁改为关注服务号 → 获取学习码 → 输入验证 →（首次）签金石契。两个独立维度：

| 维度 | 字段 | 含义 | 生命周期 |
|------|------|------|------|
| 学习码是否有效 | `redeem_code.status` + 30 天活跃判断 | 证明用户当前关注了服务号 | 30 天不活跃 → 失效，需重新关注获取 |
| 是否契约会员 | `user.member_level` | 精神约定 | 签过一次永久有效，不因码过期失效 |

核心价值：
1. 用户关注服务号后，后续可通过模板消息触达
2. 30 天不活跃 → 码失效 → 门禁再触发 → 重新关注获取新码 → **签过契的跳过签契，直接解锁**
3. 签契只签一次，仪式感保留——"君以分享托付文言雀，文言雀亦以赤诚报君"

**关键前提**：服务号与企业为同一主体（正在申请中），可在 MP 后台直接互绑，无需开放平台。

---

## 一、后端改动

### 1.1 新建 redeem_code 表

```sql
CREATE TABLE redeem_code (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE COMMENT '兑换码，格式 WYQ-XXXX-XXXX',
  user_id BIGINT NOT NULL COMMENT '所属用户ID',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=未使用 1=已验证 2=已过期',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME COMMENT '验证时间',
  INDEX idx_user_id (user_id),
  INDEX idx_code (code)
);
```

**设计要点**：
- 一用户一码：`code` UNIQUE
- `status`：0=未使用（公众号已发送但用户还没在小程序输入），1=已验证（用户输入了正确的码，验证通过），2=已过期（30 天不活跃自动失效 / 用户重新关注生成了新码）
- 学习码验证 ≠ 签契——验证通过只代表用户确实关注了公众号，签契是独立的精神约定步骤
- 过期逻辑不靠 `expires_at` 字段，靠 **30 天不活跃** 的运行时判断
- 同一个 user_id 多次关注公众号 → 生成新码 → 旧码标记为 status=2

### 1.2 新增 `user.last_active_at` 字段

```sql
ALTER TABLE user ADD COLUMN last_active_at DATETIME COMMENT '最后活跃时间';
```

30 天不活跃判断依赖此字段，在 `LoginInterceptor` 中每次请求自动更新。

### 1.3 memberLevel vs 学习码有效期：两个独立标识

**核心原则**：

| 概念 | 字段 | 何时设为 1 | 何时失效 |
|------|------|------------|----------|
| 契约会员 | `user.member_level` | 签契时写入（一次性） | **永不失效** |
| 学习码有效 | `redeem_code.status=1` + 30 天活跃 | 用户输入正确码时 | 30 天不活跃 → status→2 |

**门禁条件**：`streak >= 10 && (memberLevel < 1 || codeInactive)`

即：契约已签 **且** 码有效 → 放行。已签契但码过期 → 门禁弹窗，走"关注→输码"流程，直接解锁，不重复签契。

**运行时判断**（`UserService.getUserProfile()` 或 `fetchMemberStatus` 中）：

```java
public MemberStatus getMemberStatus(Long userId) {
    User user = userMapper.selectById(userId);
    
    // 1. 学习码是否有效
    RedeemCode code = redeemCodeMapper.selectOne(
        new LambdaQueryWrapper<RedeemCode>()
            .eq(RedeemCode::getUserId, userId)
            .eq(RedeemCode::getStatus, 1)  // 已验证
            .orderByDesc(RedeemCode::getVerifiedAt)
            .last("LIMIT 1")
    );
    
    boolean codeActive = false;
    if (code != null) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        if (user.getLastActiveAt() == null 
            || user.getLastActiveAt().isAfter(thirtyDaysAgo)) {
            codeActive = true;
        } else {
            // 30 天不活跃，码失效
            redeemCodeMapper.updateStatus(code.getId(), 2);
        }
    }
    
    // 2. 是否契约会员（签过一次永久有效）
    int memberLevel = user.getMemberLevel();  // 0 或 1，永不自动回退
    
    return new MemberStatus(memberLevel, codeActive);
}
```

**门禁判定**（前端）：

```typescript
// 首页 onTapStartLearning
const needGate = streak >= 10 && (memberLevel < 1 || !codeActive);
// 已签契 + 码有效 → 不弹门禁
// 已签契 + 码过期 → 弹门禁，但跳过签契步骤
// 未签契 + 码过期 → 弹门禁，完整流程
```

### 1.4 `signPact()` 不变

`POST /api/user/pact` 保持现有逻辑：查 `user.member_level`，已经是 1 就直接返回，否则写入 1。

**不需要**新增"必须有学习码"的前置条件——学习码和契是独立的。但建议在门禁 UI 中确保用户先验证码再签契（第二阶段→第三阶段的顺序）。

### 1.4 新增 API

| API | 方法 | 用途 |
|-----|------|------|
| `POST /api/user/verify-code` | POST `{ code }` | 用户输入学习码验证，后端校验：码存在、status=0、码属于当前用户 → 设 status=1、记录 verified_at → 返回 `{ valid: true }`。注意：此接口**仅验证码，不改 memberLevel** |
| `POST /api/user/pact` | POST（已有，保留不变） | 签金石契，memberLevel 设为 1。**前置条件**：必须有已验证的学习码（status=1），否则返回错误"请先关注公众号获取学习码" |
| `POST /api/admin/generate-code` | POST `{ userId }` | 管理端给指定用户生成唯一码（仅管理后台用） |
| `GET /api/user/member-status` | GET | 返回 `{ memberLevel, codeVerified: boolean, lastActiveAt }`，完整的会员状态快照 |

### 1.5 服务号回调（Phase 2，等服务号审批通过后）

依赖 `weixin-java-mp`（WxJava），新增：

- `WechatMpController`：`GET/POST /api/wechat/mp/callback`
  - `GET`：服务器验证（echostr）
  - `POST`：接收消息事件
    - **subscribe 事件**：取出 FromUserName(OpenId) → 通过 UnionID 或 OpenId 查 user 表 → 生成唯一码（`WYQ-` + 8 位随机字母数字）→ 写入 `redeem_code` → 自动回复"您的学习码：WYQ-XXXX-XXXX，回到小程序输入即可解锁永久学习"
    - **unsubscribe 事件**：可选，记录取关日志
    - **关键词"学习码"**：查用户是否已有未兑换的码 → 有则直接回，无则生成新码

- `application.yml` 配置：
  ```yaml
  wechat:
    mp:
      app-id: <服务号AppID>
      secret: <服务号AppSecret>
      token: <随机Token>
      aes-key: <随机AESKey>
  ```

> **注意**：服务号回调 URL 需要公网可访问（`https://wyq.yinqueai.com/api/wechat/mp/callback`），生产环境已满足。

---

## 二、前端改动

### 2.1 首页门禁弹窗（`pages/index/index.*`）

**弹窗分支逻辑**：

```
门禁触发（streak >= 10, memberLevel < 1 或 codeActive = false）
    │
    ├─ 已签契（memberLevel=1），仅码过期
    │    → 阶段一（关注公众号）→ 阶段二（输入码）→ 直接放行，跳过签契
    │
    └─ 未签契（memberLevel=0）
         → 阶段一（关注公众号）→ 阶段二（输入码）→ 阶段三（签金石契）→ 放行
```

**三阶段设计**：

**阶段一：引导关注公众号**
```
┌──────────────────────────────┐
│           🎉                │
│   你已经坚持学习了 10 天！    │
│   关注公众号，获取永久学习码   │
│                            │
│  ┌────────────────────┐    │
│  │   [服务号二维码]     │    │
│  │                    │    │
│  └────────────────────┘    │
│                            │
│  长按识别二维码关注公众号     │
│                            │
│  [我已关注，输入学习码]       │
└──────────────────────────────┘
```

**阶段二：输入学习码**
```
┌──────────────────────────────┐
│        输入学习码            │
│                            │
│  请在公众号回复的消息中       │
│  找到您的学习码并输入         │
│  关注公众号，获取学习码       │
│                            │
│  ┌────────────────────┐    │
│  │ WYQ - ____ - ____  │    │
│  └────────────────────┘    │
│                            │
│  [  确认验证  ]             │ ← API verify-code
│                            │   分支：
│                            │   · 已签契 → 直接关闭弹窗 ✓
│                            │   · 未签契 → 进入阶段三
│                            │
│  还没关注？[返回关注]        │
└──────────────────────────────┘
```

**阶段三：签金石契（仅首次，memberLevel=0 时展示）**
```
┌──────────────────────────────┐
│         📜                  │
│       金石契                │
│                            │
│  君以分享托付文言雀          │
│  文言雀亦以赤诚报君          │
│  此约既成，金石不渝          │
│                            │
│  ☐ 余今签契，行之以诚       │
│                            │
│  [  签订契约  ]             │ ← API signPact
│  契约既签，永久免费学习      │
└──────────────────────────────┘
```

**代码改动**：
- `index.ts` data 新增字段：`gateStep: 1 | 2 | 3`、`redeemCode: string`、`pactChecked: boolean`
- `index.ts` 方法新增：`onVerifyCode()` → 成功后根据 memberLevel 决定进阶段三还是直接关闭、`onSignPact()`、`onTogglePactCheck()`
- 移除：`onGoToPoster()`、`onCloseShareGate()`
- `onTapStartLearning()` 门禁条件改为：`streak >= 10 && (memberLevel < 1 || !codeActive)`

### 2.2 「我的」页面（`pages/mine/index.*`）

**调整**：
- 移除：两阶段海报弹窗（海报下载、保存相册、分享朋友圈）
- **保留**：金石契弹窗（`showNuoDialog`），契约会员标签（`memberLevel >= 1`）——样式和动画不变
- **保留**：`onShareAppMessage`（微信原生分享）——分享给朋友的功能不变
- `onTapShare`：改为展示服务号二维码弹窗，文案"关注公众号，获取学习码，签订金石契"
- 已签约用户点击"分享给朋友"：只展示二维码，不触发门禁流程

### 2.3 `api/index.ts` 新增

```typescript
// 验证学习码（仅校验，不改 memberLevel）
export async function verifyCode(code: string): Promise<{ valid: boolean; message: string }> {
  return post('/api/user/verify-code', { code });
}

// 查询会员状态（含 30 天过期判断、学习码验证状态）
export async function fetchMemberStatus(): Promise<{ 
  memberLevel: number; 
  codeVerified: boolean; 
  lastActiveAt?: string 
}> {
  return get('/api/user/member-status');
}
```

### 2.4 `typings/index.d.ts`

新增 `redeemCode` 等字段到相关 interface。

---

## 三、改造范围与兼容

### 3.1 流程对比

```
旧：打卡满10天 → 下载海报 → 分享朋友圈 → 签金石契 → memberLevel=1 → 解锁

新：
  首次：打卡满10天 → 关注公众号 → 输入码验证 → 签金石契 → memberLevel=1 → 解锁
  码过期后回来：打卡满10天 → 关注公众号 → 输入码验证 → 直接解锁（已签契，跳过签契）
```

- `memberLevel`：签过一次永久有效，不因码过期而回退
- `codeActive`：30 天活跃窗口，超时失效，重新关注获取新码即可

### 3.2 `member_level` 列

`user.member_level` 保持现状：`POST /api/user/pact` 写入 1，之后永不自动回退。

新增 `redeem_code` 表和 `user.last_active_at` 字段，码有效期独立于契约会员。

### 3.3 `signPact()` API

保持现有逻辑不变。无需新增前置条件——学习码和契是两个独立维度。UI 层保证先验证码再签契的顺序即可。

---

## 四、待确认项

1. **服务号二维码**：需等服务号审批通过后在 MP 后台获取，先在前端代码中预留占位图片路径，后续替换为真实二维码
2. **学习码格式**：建议 `WYQ-XXXX-XXXX`（文言雀首字母 + 8 位字母数字），易读易输入
3. **30 天窗口**：写死常量 `REDEEM_CODE_EXPIRE_DAYS = 30`，后续可在 `constants/config.ts` 中调整

---

## 五、验证

1. 后端：`POST /api/user/verify-code` 正确校验码归属、状态流转
2. 后端：`GET /api/user/member-status` 正确返回 `memberLevel`（永不过期）和 `codeActive`（受 30 天影响）
3. 后端：`POST /api/user/pact` 保持现有行为，签契一次永久有效
4. 前端：连续打卡 ≥ 10 天，`memberLevel=0` → 门禁弹窗，三阶段完整流程
5. 前端：连续打卡 ≥ 10 天，`memberLevel=1`，`codeActive=false` → 门禁弹窗，二阶段（跳过签契）
6. 前端：连续打卡 ≥ 10 天，`memberLevel=1`，`codeActive=true` → 无门禁，正常学习
7. 前端：模拟 30 天不活跃后 → `codeActive=false` → 门禁再次触发，但签契步骤跳过
8. 回归：mine 页移除海报分享弹窗，契约会员标签和金石契弹窗保持不变
