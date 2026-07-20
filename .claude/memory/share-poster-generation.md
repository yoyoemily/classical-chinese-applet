---
name: share-poster-generation
description: 分享海报生成脚本——素材、字体、布局参数、微调指南
metadata:
  type: project
---

## 分享海报

"我的"页面 → "分享给朋友" → 展示海报弹窗 → 保存到相册。

### 海报生成

**脚本**：`tools/generate_poster.py`

纯 Python 脚本，基于 Pillow（PIL）将底图 + 小程序码 + 文字合成 720×1280 最终海报。

**素材**：

| 文件 | 用途 |
|------|------|
| `assets/share-poster-bg.png` | 水墨宣纸底图（720×1280） |
| `assets/qrcode.jpg` | 小程序码（344×344，脚本自动缩放到 220px） |
| `assets/share-poster.png` | **输出**——最终海报（脚本直接覆盖） |

**字体**：
- 主标题"文言雀"：行楷 SC Bold (`Xingkai.ttc` index 0)，飘逸有力，系统自带
- 其余文字（宣传语/金句/品牌名/提示）：华文楷体 SC Regular (`Kaiti.ttc` index 0)，规范清秀，系统自带
- 两个字体均为 macOS 系统自带，无需额外安装

**用法**：
```bash
cd 小程序项目根目录
python3 tools/generate_poster.py
```

**海报布局**（720×1280）：
```
        —— 中学生文言文助手 ——          ← y=80, 文字+两侧短横线

              文 言 雀                    ← y=350, 90px, 行楷 Bold, 深青绿 #2e5d3c

    无障碍畅读传世经典，领略古贤智慧       ← y=465, 30px, 华文楷体, 灰绿 #5a7a6a

           腹有诗书气自华                 ← y=565, 28px, 华文楷体
           ─────────────                 ← 装饰线（与文字等宽）

         ┌──────────────┐
         │              │                ← 小程序码（220px，白色圆角底板）
         │   [小程序码]  │                ← y 中心 940，圆角 16px
         │              │
         └──────────────┘
        长按识别小程序码                  ← y~1086, 紧贴码下方

        —— 中学生文言文助手 ——            ← y=1200, 同顶部
```

**微调指南**：所有参数集中在脚本顶部的配置区，无需修改渲染逻辑：
- 文案：`TITLE_BRAND`、`MAIN_TITLE`、`SUBTITLE`、`QUOTE`
- 位置：`TITLE_BRAND_TOP_Y`、`MAIN_TITLE_Y` 等，均为 y 坐标（距顶部 px）
- 颜色：`COLOR_PRIMARY`、`COLOR_SUBTITLE` 等
- 字体大小：`FONT_SIZE_MAIN_TITLE` 等
- 小程序码：`QR_DISPLAY_SIZE`、`QR_RADIUS`、`QR_CARD_PADDING`
- 装饰线：`SIDE_LINE_LENGTH`、`SIDE_LINE_GAP`、`SIDE_LINE_COLOR`

### 前端展示

- 页面：`pages/mine/index.*`
- 弹窗组件：直接在 mine 页面内用 WXML 实现（`showSharePoster` 控制显隐）
- 图片引用：`<image src="/assets/share-poster.png" mode="widthFix" />`
- 保存按钮：`onSavePoster()` → `wx.downloadFile()` → `wx.saveImageToPhotosAlbum()`
  - **注意**：小程序不支持直接保存项目内静态资源，需通过 URL 下载。图片已部署在后端 `resources/static/assets/`，`onSavePoster` 根据环境自动切换 download URL（release → `wyq.yinque-ai.com`，否则 `localhost:8080`）

### 新增底图风格（可选）

如需新增底图，可使用通义万相模型（阿里 DashScope，API Key 在环境变量 `DASHSCOPE_API_KEY`）生成，然后把底图放到 `assets/` 目录，复制 `generate_poster.py` 中的 `main()` 渲染逻辑即可合成新海报。生图 API：`dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`，模型 `wanx2.0-t2i-turbo`。

### 分享跟踪与门禁

**分享跟踪**：用户签订契约后调用 `POST /api/user/pact`，后端在 `user` 表设置 `member_level = 1`（会员级别：0=非会员，1=金石契会员）。`fetchUserProfile`/`fetchUserInfo` 返回 `memberLevel`。

**分享门禁**：连续打卡满 `SHARE_GATE_STREAK_DAYS` 天（`constants/config.ts`，默认 10，设为 -1 关闭）后，首页点击「开始学习」弹出分享门禁弹窗，引导到 mine 页面签订契约。门禁弹窗无关闭按钮，必须点击跳转。

**mine 页弹窗交互**：
1. 阶段一：海报 + 按钮。
   - 非会员（`memberLevel < 1`）：「保存图片」+「分享朋友圈」并排；「分享朋友圈」初始 disabled（浅色透明背景 + 边框 + low opacity），保存图片成功后 `posterSaved` 变为 `true`，按钮激活（金色实心 `var(--color-accent)` + 白字）可点击 → 进入阶段二
   - 已是会员（`memberLevel >= 1`）：仅「保存图片」，不显示「分享朋友圈」
2. 阶段二：海报消失 → 白底卡片「金石契」→ 文言文信任文案 → 复选框「余今签契，行之以诚」→ 「签订契约」按钮
   - 签订成功后调用 `signPact()` → `this.loadProfile()` 刷新用户信息（memberLevel 变为 1，头顶出现「契约会员」标签）
3. 契约弹窗底部「您已签订契约，永久免费学习」：暗金色 `#b8860b`，`font-size-sm`

**金石契文案**（阶段二 + 契约会员弹窗公用）：

```
君以分享托付文言雀
文言雀亦以赤诚报君
此约既成，金石不渝
```

底部：「您已签订契约，永久免费学习」，暗金色 `#b8860b`。

**mine 页「契约会员」标签**：`memberLevel >= 1` 时，头像下方显示金色渐变"契约会员"标签，点击弹出金石契弹窗（与阶段二文案一致，多一枚"契"字红色印章旋转 overlay）。

**首页艾宾浩斯提示**：开始学习按钮下方显示"基于艾宾浩斯遗忘曲线，智能安排复习节奏"，暗金色 `#b8860b`，小字居中。

**图片部署**：`share-poster.png` 已放在后端 `resources/static/assets/`，`onSavePoster` 根据环境自动切换 download URL（release → `wyq.yinque-ai.com`，否则 `localhost:8080`）。

[[study-section]]
