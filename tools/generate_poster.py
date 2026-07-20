#!/usr/bin/env python3
"""
文言雀 · 分享海报生成脚本
========================
基于底图 + 小程序码合成最终的 720×1280 分享海报。

用法：
    python3 tools/generate_poster.py

素材：
    assets/share-poster-bg.png   - 水墨底图（720×1280）
    assets/qrcode.jpg            - 小程序码（344×344）

输出：
    assets/share-poster.png      - 最终海报（覆盖）

微调指引：
    - 修改 POSTER_CONFIG 里的文案、字号、颜色、位置
    - 修改 QR_* 调整小程序码的位置和大小
    - 字体路径在 FONT_PATH 中
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ============================================================
# 路径配置
# ============================================================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
BG_PATH = os.path.join(ASSETS_DIR, "share-poster-bg.png")
QR_PATH = os.path.join(ASSETS_DIR, "qrcode.jpg")
OUTPUT_PATH = os.path.join(ASSETS_DIR, "share-poster.png")

# macOS 中文字体
# - 行楷（Xingkai SC Bold）：主标题"文言雀"，飘逸有力
# - 华文楷体（Kaiti SC Regular）：正文副标题/金句/品牌文字，规范清秀
FONT_PATH_XINGKAI = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/13b8ce423f920875b28b551f9406bf1014e0a656.asset/AssetData/Xingkai.ttc"
FONT_PATH_KAITI = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/88d6cc32a907955efa1d014207889413890573be.asset/AssetData/Kaiti.ttc"

# ============================================================
# 海报尺寸
# ============================================================
WIDTH = 720
HEIGHT = 1280

# ============================================================
# 颜色调色板（古风配色）
# ============================================================
COLOR_PRIMARY = "#2e5d3c"       # 深青绿 — 主标题、金句
COLOR_SUBTITLE = "#5a7a6a"      # 灰绿 — 宣传语
COLOR_MUTED = "#666666"         # 深灰 — 提示文字
COLOR_DECORATION = "#bdaa8a"    # 暖金 — 下划线装饰
COLOR_WHITE = "#ffffff"

# ============================================================
# 文案配置
# ============================================================
TITLE_BRAND = "中学生文言文助手"
MAIN_TITLE = "文言雀"
SUBTITLE = "基于艾宾浩斯记忆法，科学掌握文言字词"
QUOTE = "每天十分钟，文言很轻松"
QR_HINT = "长按识别小程序码"

# ============================================================
# 布局参数（所有 y 值均为距顶部 px）
# ============================================================
TITLE_BRAND_TOP_Y = 80      # 顶部"中学生文言文助手"的 y 中心
MAIN_TITLE_Y = 350          # "文言雀"的 y 中心
SUBTITLE_Y = 465            # 宣传语的 y 中心
QUOTE_Y = 565               # 金句的 y 中心
QUOTE_LINE_Y = 605          # 金句下方装饰线 y
QR_CENTER_Y = 940           # 小程序码的中心 y
QR_CARD_PADDING = 16        # 白底内边距
QR_RADIUS = 16              # 白底圆角半径
QR_HINT_GAP = 20            # 提示语距离白底底部的间距
# QR_HINT_Y 在 main() 中根据实际白底位置动态计算
TITLE_BRAND_BOTTOM_Y = 1200  # 底部"中学生文言文助手"的 y 中心

# 小程序码渲染尺寸（原图 344×344，缩放到此尺寸）
QR_DISPLAY_SIZE = 220

# 上下装饰横线（文字两侧的左右短横线）
SIDE_LINE_LENGTH = 80       # 单侧横线长度 px
SIDE_LINE_GAP = 16          # 左右横线之间的间距 px
SIDE_LINE_COLOR = "#bdaa8a" # 暖金色
SIDE_LINE_WIDTH = 2         # px

# 品牌文字字号
FONT_SIZE_BRAND = 28

# ============================================================
# 字体字号
# ============================================================
FONT_SIZE_MAIN_TITLE = 90
FONT_SIZE_SUBTITLE = 30
FONT_SIZE_QUOTE = 28
FONT_SIZE_QR_HINT = 24


# ============================================================
# 渲染函数
# ============================================================

def load_font(size: int, font_path: str = None) -> ImageFont.FreeTypeFont:
    """加载字体，默认华文楷体。"""
    path = font_path or FONT_PATH_KAITI
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        print(f"  ⚠️  无法加载 {path}，使用默认字体")
        return ImageFont.load_default()


def text_size(draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont):
    """返回文字的 (width, height)。"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return (bbox[2] - bbox[0], bbox[3] - bbox[1])


def draw_centered_text(
    draw: ImageDraw.Draw,
    text: str,
    y_center: float,
    font: ImageFont.FreeTypeFont,
    color: str,
) -> int:
    """在 x=WIDTH/2 居中绘制文字，返回文字实际高度。"""
    tw, th = text_size(draw, text, font)
    x = (WIDTH - tw) // 2
    y = int(y_center - th // 2)
    draw.text((x, y), text, font=font, fill=color)
    return th


def draw_brand_with_lines(
    draw: ImageDraw.Draw,
    text: str,
    y: float,
    font: ImageFont.FreeTypeFont,
    text_color: str,
    line_color: str = SIDE_LINE_COLOR,
    line_width: int = SIDE_LINE_WIDTH,
) -> None:
    """绘制品牌文字 + 两侧短横线点缀，整体居中。"""
    tw, th = text_size(draw, text, font)
    text_x = (WIDTH - tw) // 2
    text_y = int(y - th // 2)

    # 先画文字
    draw.text((text_x, text_y), text, font=font, fill=text_color)

    # 线条 y 稍下移，补偿汉字视觉重心偏下的问题
    line_y = y + 4

    # 左侧短横线（紧贴文字左侧）
    x_left_end = text_x - SIDE_LINE_GAP
    x_left_start = x_left_end - SIDE_LINE_LENGTH
    draw.line((x_left_start, line_y, x_left_end, line_y), fill=line_color, width=line_width)

    # 右侧短横线（紧贴文字右侧）
    x_right_start = text_x + tw + SIDE_LINE_GAP
    x_right_end = x_right_start + SIDE_LINE_LENGTH
    draw.line((x_right_start, line_y, x_right_end, line_y), fill=line_color, width=line_width)


def draw_quote_underline(
    draw: ImageDraw.Draw,
    text: str,
    y_center: float,
    font: ImageFont.FreeTypeFont,
    color: str = COLOR_DECORATION,
    width: int = 2,
) -> None:
    """在金句下方画一条细装饰线。"""
    tw, _ = text_size(draw, text, font)
    line_w = int(tw * 1.0)
    x_start = (WIDTH - line_w) // 2
    x_end = x_start + line_w
    y_line = QUOTE_LINE_Y
    draw.line((x_start, y_line, x_end, y_line), fill=color, width=width)


def paste_qr_code(canvas: Image.Image) -> tuple[int, int]:
    """将小程序码粘贴到海报中央，带白色圆角底板。返回底板的 (bottom_y, top_y)。"""
    qr_raw = Image.open(QR_PATH).convert("RGBA")
    qr_resized = qr_raw.resize((QR_DISPLAY_SIZE, QR_DISPLAY_SIZE), Image.LANCZOS)

    card_size = QR_DISPLAY_SIZE + QR_CARD_PADDING * 2
    card = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle(
        [(0, 0), (card_size - 1, card_size - 1)],
        radius=QR_RADIUS,
        fill=(255, 255, 255, 255),
    )

    card.paste(qr_resized, (QR_CARD_PADDING, QR_CARD_PADDING), qr_resized)

    card_x = (WIDTH - card_size) // 2
    card_y = QR_CENTER_Y - card_size // 2

    canvas.paste(card, (card_x, card_y), card)
    return (card_y, card_y + card_size)  # top, bottom


def main():
    print("🖌️  生成分享海报...")

    # 加载底图
    print(f"  加载底图：{BG_PATH}")
    if not os.path.exists(BG_PATH):
        print(f"  ❌ 底图不存在：{BG_PATH}")
        return 1
    base = Image.open(BG_PATH).convert("RGBA")

    if base.size != (WIDTH, HEIGHT):
        print(f"  ⚠️  底图尺寸 {base.size}，预期 {WIDTH}×{HEIGHT}，将缩放")
        base = base.resize((WIDTH, HEIGHT), Image.LANCZOS)

    # 创建画布
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    canvas.paste(base, (0, 0))

    draw = ImageDraw.Draw(canvas)

    # -------- 顶部品牌文字 + 两侧短横线 --------
    font_brand = load_font(FONT_SIZE_BRAND)  # 华文楷体
    draw_brand_with_lines(draw, TITLE_BRAND, TITLE_BRAND_TOP_Y, font_brand, COLOR_MUTED)

    # -------- 主标题：文言雀（行楷 Bold）--------
    font_main = load_font(FONT_SIZE_MAIN_TITLE, FONT_PATH_XINGKAI)
    draw_centered_text(draw, MAIN_TITLE, MAIN_TITLE_Y, font_main, COLOR_PRIMARY)

    # -------- 宣传语（华文楷体）--------
    font_sub = load_font(FONT_SIZE_SUBTITLE)
    draw_centered_text(draw, SUBTITLE, SUBTITLE_Y, font_sub, COLOR_SUBTITLE)

    # -------- 金句 + 下划线（华文楷体）--------
    font_quote = load_font(FONT_SIZE_QUOTE)
    draw_centered_text(draw, QUOTE, QUOTE_Y, font_quote, COLOR_PRIMARY)
    draw_quote_underline(draw, QUOTE, QUOTE_Y, font_quote)

    # -------- 小程序码 --------
    _, qr_bottom = paste_qr_code(canvas)

    # 提示文字（华文楷体，紧贴小程序码白底下方）
    qr_hint_y = qr_bottom + QR_HINT_GAP
    font_hint = load_font(FONT_SIZE_QR_HINT)
    draw_centered_text(draw, QR_HINT, qr_hint_y, font_hint, COLOR_MUTED)

    # -------- 底部品牌文字 + 两侧短横线 --------
    draw_brand_with_lines(draw, TITLE_BRAND, TITLE_BRAND_BOTTOM_Y, font_brand, COLOR_MUTED)

    # 保存
    canvas_rgb = canvas.convert("RGB")
    canvas_rgb.save(OUTPUT_PATH, "PNG", quality=95)
    print(f"  ✅ 海报已保存到：{OUTPUT_PATH}")
    print(f"     尺寸：{canvas_rgb.size[0]}×{canvas_rgb.size[1]}")
    return 0


if __name__ == "__main__":
    exit(main())
