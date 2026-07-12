"""
Generate a Chinese-style background image for the share poster using DashScope.
Only generates the background (ink wash, rice paper texture, bamboo) — NO text on the image.
Text will be overlaid via Canvas in the mini program.
"""
import os
import urllib.request
from pathlib import Path
import dashscope
from dashscope import ImageSynthesis

api_key = os.environ.get("DASHSCOPE_API_KEY")
if not api_key:
    print("ERROR: DASHSCOPE_API_KEY not set")
    exit(1)
dashscope.api_key = api_key

PROMPT = (
    "A Chinese ink-wash painting style background image, warm off-white rice-paper texture "
    "base, subtle ink-wash mountain silhouettes fading into the top and bottom edges, "
    "delicate bamboo leaf shadows scattered in the corners, soft golden-brown decorative lines. "
    "Elegant Song dynasty book design aesthetic. The upper area has a soft teal-green ink wash, "
    "the middle area is mostly clean rice-paper white with very faint ink texture, "
    "and the bottom has a subtle golden-brown seal-stamp style circular motif. "
    "NO text, NO characters, NO letters, NO typography of any kind — just pure texture and atmosphere. "
    "The image should feel like a blank antique scroll ready for calligraphy. "
    "Minimalist, refined, scholarly. Vertical 9:16 aspect ratio."
)

print("Generating background image...")
response = ImageSynthesis.call(
    model="wanx2.1-t2i-turbo",
    prompt=PROMPT,
    negative_prompt="text, characters, letters, typography, calligraphy, words, numbers, symbols, people, animals, modern elements, clutter",
    n=1,
    size="720*1280",
)

print(f"Status: {response.status_code}")

if response.status_code == 200:
    output_dir = Path(__file__).parent.parent / "assets"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "share-poster-bg.png"

    for result in response.output.results:
        if hasattr(result, 'url') and result.url:
            print(f"Downloading...")
            urllib.request.urlretrieve(result.url, output_path)
            print(f"Saved: {output_path} ({output_path.stat().st_size} bytes)")
            print(f"Actual prompt: {result.actual_prompt}")
        else:
            print(f"ERROR: No URL in result")
            exit(1)
else:
    print(f"ERROR: {response.message}")
    exit(1)
