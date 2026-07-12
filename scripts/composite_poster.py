"""
Composite the final share poster: AI-generated background + Canvas-rendered Chinese text.
Output: assets/share-poster.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = Path(__file__).parent.parent / "assets"
BG_PATH = ASSETS / "share-poster-bg.png"
QRCODE_PATH = ASSETS / "qrcode.jpg"
OUTPUT_PATH = ASSETS / "share-poster.png"

# ---------- Design parameters ----------
W, H = 720, 1280
COLOR_TEAL = (74, 106, 94)      # #4a6a5e 墨绿
COLOR_GOLD = (201, 169, 110)    # #c9a96e 金色
COLOR_DARK = (44, 44, 44)       # 深灰正文
COLOR_WHITE_SOFT = (252, 250, 245)  # 米白

# ---------- Load resources ----------
bg = Image.open(BG_PATH).convert("RGBA")
if bg.size != (W, H):
    bg = bg.resize((W, H), Image.LANCZOS)

# Load QR code
qrcode = Image.open(QRCODE_PATH).convert("RGBA")
QR_SIZE = 120  # display size on poster
qrcode = qrcode.resize((QR_SIZE, QR_SIZE), Image.LANCZOS)

# Create a drawing layer
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)

# ---------- Try to load a Chinese font ----------
def find_chinese_font():
    """Try to find a Chinese font on macOS."""
    candidates = [
        # Serif / classical fonts preferred for Chinese-style poster
        "/System/Library/Fonts/Supplemental/Songti.ttc",  # 宋体 (Song/Ming style, best for 国风)
        "/Library/Fonts/Songti.ttc",
        # Fallback to sans-serif
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None

FONT_PATH = find_chinese_font()
if not FONT_PATH:
    print("WARNING: No Chinese font found, text rendering may fail!")
    FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"  # fallback

print(f"Using font: {FONT_PATH}")

# Font sizes (PIL uses points, not rpx — approximate mapping for 720px width)
# 720px ≈ 750rpx, so 1pt ≈ 1rpx * 720/750 ≈ 0.96rpx
FONT_BRAND = ImageFont.truetype(FONT_PATH, 72)       # 品牌名 文言雀
FONT_SLOGAN = ImageFont.truetype(FONT_PATH, 28)      # slogan
FONT_SONG = ImageFont.truetype(FONT_PATH, 28)        # 宋体正文
FONT_HEI_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
if not os.path.exists(FONT_HEI_PATH):
    FONT_HEI_PATH = FONT_PATH
FONT_HEI = ImageFont.truetype(FONT_HEI_PATH, 28)     # 黑体正文
FONT_CLOSING = ImageFont.truetype(FONT_PATH, 32)     # 收尾金句
FONT_SMALL = ImageFont.truetype(FONT_PATH, 18)       # 小字

def draw_text_centered(draw, text, y, font, fill, max_width=None):
    """Draw text centered horizontally at given y position. Returns bottom y."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (W - tw) / 2
    draw.text((x, y), text, font=font, fill=fill)
    return y + th

def draw_multiline(draw, lines, start_y, font, fill, line_spacing=1.8):
    """Draw multiple centered lines. Returns bottom y."""
    y = start_y
    for line in lines:
        y = draw_text_centered(draw, line, y, font, fill) + int(font.size * (line_spacing - 1))
    return y

# ---------- TOP: Brand area (semi-transparent teal overlay + gold text) ----------
# Draw a subtle teal gradient bar at the top
bar_height = 280
for i in range(bar_height):
    alpha = int(120 * (1 - i / bar_height) * (1 - i / bar_height))  # quadratic fade
    if alpha > 0:
        draw.line([(0, i), (W, i)], fill=(*COLOR_TEAL, alpha))

# Horizontal gold accent lines
draw.line([(160, 90), (560, 90)], fill=(*COLOR_GOLD, 180), width=2)
draw.line([(160, 250), (560, 250)], fill=(*COLOR_GOLD, 120), width=1)

# Brand name "文言雀"
draw_text_centered(draw, "文  言  雀", 120, FONT_BRAND, (*COLOR_GOLD, 230))

# Tagline
draw_text_centered(draw, "畅读中华经典", 210, FONT_SLOGAN, (*COLOR_GOLD, 180))

# ---------- MIDDLE: Main body copy ----------
# Upper section: 2 lines, Songti
UPPER = [
    ("应该是最强文言文助手了", FONT_SONG),
    ("中高考拿满根本不是事儿", FONT_SONG),
]

# Middle section: 2 lines, Heiti
MIDDLE = [
    ("上手直接无障碍通读传世经典", FONT_HEI),
    ("领略古贤智慧", FONT_HEI),
]

y = 340
# Upper: small spacing
for text, font in UPPER:
    y = draw_text_centered(draw, text, y, font, COLOR_DARK) + 28

# Gap before middle
y += 36  # 小间距
for text, font in MIDDLE:
    y = draw_text_centered(draw, text, y, font, COLOR_DARK) + 28

# ---------- BOTTOM: Taglines + QR code ----------
BOTTOM_TAGLINES = [
    ("孩子文言文不丢分，别错过", FONT_CLOSING),
    ("腹有诗书气自华，你也可以", FONT_CLOSING),
]

y += 80  # large gap before bottom taglines
for text, font in BOTTOM_TAGLINES:
    y = draw_text_centered(draw, text, y, font, COLOR_TEAL) + 20

# QR code (centered, with white padding background) — directly below taglines, no separator
qr_size = QR_SIZE
qr_x = (W - qr_size) // 2
qr_y = y + 24  # 紧挨着金句下方
# White rounded-rect background behind QR code
qr_pad = 10
draw.rounded_rectangle(
    [qr_x - qr_pad, qr_y - qr_pad, qr_x + qr_size + qr_pad, qr_y + qr_size + qr_pad],
    radius=8,
    fill=(255, 255, 255, 240)
)
canvas.paste(qrcode, (qr_x, qr_y), qrcode)

# QR code label
qr_label_y = qr_y + qr_size + 12
draw_text_centered(draw, "长按进入", qr_label_y, FONT_SLOGAN, (*COLOR_TEAL, 160))

# ---------- Composite and save ----------
result = Image.alpha_composite(bg, canvas)
result = result.convert("RGB")  # Drop alpha for PNG
result.save(OUTPUT_PATH, "PNG", optimize=True)
print(f"Poster saved to: {OUTPUT_PATH}")
print(f"Size: {OUTPUT_PATH.stat().st_size} bytes, {result.size}")
