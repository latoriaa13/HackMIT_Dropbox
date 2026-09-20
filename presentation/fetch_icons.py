"""Downloads Simple Icons SVGs and rasterises them to brand-coloured PNGs for the deck."""

import os
import re
import urllib.request

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
os.makedirs(OUT, exist_ok=True)

BASE = "https://raw.githubusercontent.com/simple-icons/simple-icons/{}/icons/{}.svg"

# Microsoft marks were removed from simple-icons after v12, so pin those to the last tag carrying them.
LEGACY = "12.0.0"

# slug -> (output name, brand hex, ref)
ICONS = {
    "nextdotjs": ("nextjs", "#000000", "develop"),
    "react": ("react", "#149ECA", "develop"),
    "typescript": ("typescript", "#3178C6", "develop"),
    "nodedotjs": ("node", "#5FA04E", "develop"),
    "vitest": ("vitest", "#6E9F18", "develop"),
    "zod": ("zod", "#3E67B1", "develop"),
    "tailwindcss": ("tailwind", "#06B6D4", "develop"),
    "microsoftoutlook": ("outlook", "#0078D4", LEGACY),
    "microsoftazure": ("entra", "#0078D4", LEGACY),
    "microsoft": ("microsoft", "#5E5E5E", LEGACY),
}


def fetch(slug: str, ref: str) -> bytes:
    req = urllib.request.Request(BASE.format(ref, slug), headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=20).read()


def colorize(svg: bytes, hex_color: str) -> bytes:
    text = svg.decode("utf-8")
    text = re.sub(r'\sfill="[^"]*"', "", text)
    text = text.replace("<svg ", f'<svg fill="{hex_color}" ', 1)
    return text.encode("utf-8")


def rasterize(svg: bytes, path: str, px: int = 320) -> None:
    doc = pymupdf.open(stream=svg, filetype="svg")
    page = doc[0]
    zoom = px / max(page.rect.width, page.rect.height)
    page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=True).save(path)


for slug, (name, color, ref) in ICONS.items():
    path = os.path.join(OUT, f"{name}.png")
    try:
        rasterize(colorize(fetch(slug, ref), color), path)
        print(f"{name:12} {os.path.getsize(path):>7} bytes")
    except Exception as exc:
        print(f"{name:12} FAILED {type(exc).__name__}: {exc}")
