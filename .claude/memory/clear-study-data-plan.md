---
name: clear-study-data-plan
description: 清除学习数据功能设计方案——软删除+24h恢复窗口，待实施
metadata:
  type: project
---

# 清除学习数据——软删除 + 24h 恢复窗口

**状态：已完成。** 详见 `/Users/zhutx/.claude/plans/peaceful-roaming-hopper.md`。

> ⚠️ 管理后台侧的 TRUNCATE 清空工具 `clear_data.sh` 已实现（`POST /api/admin/clear-data?scope=`），与本方案的软删除+恢复是不同的两套机制：管理工具是物理 TRUNCATE（不可恢复，供冷启动/开发调试用），本方案是面向用户的软删除+24h 恢复窗口（供 settings 页"清除学习数据"按钮用）。

## 核心设计

- 9 张用户表全部加 `deleted` 列（TINYINT DEFAULT 0），`@TableLogic` 逻辑删除
- user 表也不例外：同一 openId 允许两条记录，永远只有一条 `deleted=0`
- 清除：所有数据 `deleted=0→1`，user clone 新行 `deleted=0`
- 恢复：新旧数据 `deleted` 互换（旧→0，新→1），24h 窗口
- 重复清除：先物理删除上一轮冷宫，再软删当前，始终只保留一代冷宫

## 涉及的表（共 8 张，不含 badge）

user, user_word_progress, user_checkin, user_badge, user_answer_history, daily_task, study_mistake, study_mistake_sentence, feedback

## 关键点

- 清除前后 userId 不同，新旧数据天然隔离，恢复时按 userId swap deleted
- 清除/恢复后返回新 token，前端更新 localstorage
- user info 接口返回 recoveryDeadline，前端据此显示/隐藏恢复按钮

## 实施步骤

1. 9 张表 ALTER TABLE 加 deleted 列，user 加 data_cleared_at
2. Entity 加 @TableLogic + dataClearedAt
3. 认证改造：登录查 openId AND deleted=0
4. UserService.clearUserData(userId)
5. UserService.recoverUserData(userId)
6. UserController 新增 2 个 POST 接口
7. GET /api/user/info 返回 recoveryDeadline
8. 前端 api/index.ts 新增 clearUserData / recoverUserData
9. 前端 settings 页改造：onClearData + 恢复按钮
10. 首页/我的页检测恢复状态刷新

## 验证

1. 学习几天 → 清除 → toast"24 小时内可恢复" → 首页进度归零
2. 设置页出现恢复按钮 → 恢复 → 旧数据复活
3. 清除后学几个新词 → 恢复 → 新词隐藏，旧数据恢复
4. 再次清除 → 上一轮冷宫物理删，当前数据软删
5. 超过 24h → 恢复按钮消失，冷宫数据物理清理

[[backend-infrastructure]]
[[study-section]]
