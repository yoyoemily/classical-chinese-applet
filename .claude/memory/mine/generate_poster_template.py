#!/usr/bin/env python3
"""
文言雀 · 海报模板生成（无小程序码版本）
====================
基于底图 + 文字生成 720×1280 模板图，不含小程序码。
运行时由后端 Java 合成用户专属 wxacode。

用法：
    python3 .claude/memory/mine/generate_poster_template.py

输出：
    assets/share-poster-template.png
"""
from PIL import Image, ImageDraw, ImageFont
import os

# ============================================================
# 路径配置
# ============================================================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
BG_PATH = os.path.join(ASSETS_DIR, "share-poster-bg.png")
OUTPUT_PATH = os.path.join(ASSETS_DIR, "share-poster-template.png")

# macOS 中文字体
FONT_PATH_XINGKAI = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/13b8ce423f920875b28b551f9406bf1014e0a656.asset/AssetData/Xingkai.ttc"
FONT_PATH_KAITI = "/System/Library/AssetsV2/com_apple_MobileAsset_Font8/88d6cc32a907955efa1d014207889413890573be.asset/AssetData/Kaiti.ttc"

# ============================================================
# 海报尺寸
# ============================================================
WIDTH = 720
HEIGHT = 1280

# ============================================================
# 颜色调色板
# ============================================================
COLOR_PRIMARY = "#2e5d3c"
COLOR_SUBTITLE = "#5a7a6a"
COLOR_MUTED = "#666666"
COLOR_DECORATION = "#bdaa8a"

# ============================================================
# 文案
# ============================================================
TITLE_BRAND = "中学生文言文助手"
MAIN_TITLE = "文言雀"
SUBTITLE = "基于艾宾浩斯记忆法，科学掌握文言字词"
QUOTE = "每天十分钟，文言很轻松"

# ============================================================
# 布局参数
# ============================================================
TITLE_BRAND_TOP_Y = 80
MAIN_TITLE_Y = 350
SUBTITLE_Y = 465
QUOTE_Y = 565
QUOTE_LINE_Y = 605
TITLE_BRAND_BOTTOM_Y = 1200

# 装饰线
SIDE_LINE_LENGTH = 80
SIDE_LINE_GAP = 16
SIDE_LINE_COLOR = "#bdaa8a"
SIDE_LINE_WIDTH = 2

# 字号
FONT_SIZE_BRAND = 28
FONT_SIZE_MAIN_TITLE = 90
FONT_SIZE_SUBTITLE = 30
FONT_SIZE_QUOTE = 28


def load_font(size: int, font_path: str = None) -> ImageFont.FreeTypeFont:
    path = font_path or FONT_PATH_KAITI
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        print(f"  ⚠️  无法加载 {path}，使用默认字体")
        return ImageFont.load_default()


def text_size(draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont):
    bbox = draw.textbbox((0, 0), text, font=font)
    return (bbox[2] - bbox[0], bbox[3] - bbox[1])


def draw_centered_text(draw, text, y_center, font, color):
    tw, th = text_size(draw, text, font)
    x = (WIDTH - tw) // 2
    y = int(y_center - th // 2)
    draw.text((x, y), text, font=font, fill=color)
    return th


def draw_brand_with_lines(draw, text, y, font, text_color):
    tw, th = text_size(draw, text, font)
    text_x = (WIDTH - tw) // 2
    text_y = int(y - th // 2)
    draw.text((text_x, text_y), text, font=font, fill=text_color)

    line_y = y + 4
    x_left_end = text_x - SIDE_LINE_GAP
    x_left_start = x_left_end - SIDE_LINE_LENGTH
    draw.line((x_left_start, line_y, x_left_end, line_y), fill=SIDE_LINE_COLOR, width=SIDE_LINE_WIDTH)
    x_right_start = text_x + tw + SIDE_LINE_GAP
    x_right_end = x_right_start + SIDE_LINE_LENGTH
    draw.line((x_right_start, line_y, x_right_end, line_y), fill=SIDE_LINE_COLOR, width=SIDE_LINE_WIDTH)


def main():
    print("🖌️  生成海报模板（不含小程序码）...")

    if not os.path.exists(BG_PATH):
        print(f"  ❌ 底图不存在：{BG_PATH}")
        return 1
    base = Image.open(BG_PATH).convert("RGBA")
    if base.size != (WIDTH, HEIGHT):
        base = base.resize((WIDTH, HEIGHT), Image.LANCZOS)

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    canvas.paste(base, (0, 0))
    draw = ImageDraw.Draw(canvas)

    # 主标题
    font_brand = load_font(FONT_SIZE_BRAND)
    font_main = load_font(FONT_SIZE_MAIN_TITLE, FONT_PATH_XINGKAI)
    draw_centered_text(draw, MAIN_TITLE, MAIN_TITLE_Y, font_main, COLOR_PRIMARY)

    # 宣传语
    font_sub = load_font(FONT_SIZE_SUBTITLE)
    draw_centered_text(draw, SUBTITLE, SUBTITLE_Y, font_sub, COLOR_SUBTITLE)

    # 金句 + 下划线
    font_quote = load_font(FONT_SIZE_QUOTE)
    draw_centered_text(draw, QUOTE, QUOTE_Y, font_quote, COLOR_PRIMARY)
    tw, _ = text_size(draw, QUOTE, font_quote)
    line_w = int(tw)
    x_start = (WIDTH - line_w) // 2
    draw.line((x_start, QUOTE_LINE_Y, x_start + line_w, QUOTE_LINE_Y),
              fill=COLOR_DECORATION, width=2)

    # 注意：不画小程序码，后端运行时合成

    # 底部品牌文字
    draw_brand_with_lines(draw, TITLE_BRAND, TITLE_BRAND_BOTTOM_Y, font_brand, COLOR_MUTED)

    canvas_rgb = canvas.convert("RGB")
    canvas_rgb.save(OUTPUT_PATH, "PNG", quality=95)
    print(f"  ✅ 模板已保存到：{OUTPUT_PATH}")
    print(f"     尺寸：{canvas_rgb.size[0]}×{canvas_rgb.size[1]}")
    return 0


if __name__ == "__main__":
    exit(main())
