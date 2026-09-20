"""Flat clipart-style PNGs for the architecture slide (no vendor logos)."""

import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "clipart")
os.makedirs(OUT, exist_ok=True)

ORANGE = (255, 107, 0)
NAVY = (11, 25, 44)
WHITE = (255, 255, 255)
SOFT = (255, 247, 237)
MUTED = (100, 116, 139)
SIZE = 256


def save(name: str, draw_fn) -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(img))
    img.save(os.path.join(OUT, f"{name}.png"))


def rounded_rect(d, xy, fill, outline=NAVY, w=4):
    d.rounded_rectangle(xy, radius=18, fill=fill, outline=outline, width=w)


def ingest(d):
    for i, dy in enumerate((48, 78, 108)):
        rounded_rect(d, (52 + i * 8, dy, 204 - i * 8, dy + 52), SOFT if i else WHITE)
        d.line((68 + i * 8, dy + 18, 188 - i * 8, dy + 18), fill=MUTED, width=3)


def classify(d):
    d.polygon([(128, 40), (210, 95), (178, 210), (78, 210), (46, 95)], fill=SOFT, outline=NAVY, width=4)
    for y in (115, 145, 175):
        d.line((70, y, 186, y), fill=ORANGE, width=5)


def prioritize(d):
    rounded_rect(d, (48, 160, 208, 220), SOFT)
    for i, h in enumerate((50, 90, 130, 70)):
        x = 68 + i * 36
        d.rectangle((x, 220 - h, x + 24, 220), fill=ORANGE if i == 2 else MUTED)
    d.polygon([(128, 28), (148, 58), (118, 58)], fill=ORANGE)


def weekly(d):
    rounded_rect(d, (56, 48, 200, 220), WHITE)
    for y in (88, 118, 148, 178):
        d.line((76, y, 180, y), fill=MUTED, width=3)
    for i, y in enumerate((82, 112, 142)):
        d.ellipse((76, y, 96, y + 20), fill=ORANGE if i == 0 else SOFT, outline=NAVY, width=2)


def schedule(d):
    rounded_rect(d, (56, 56, 200, 210), WHITE)
    d.rectangle((56, 56, 200, 92), fill=ORANGE)
    for row in range(3):
        for col in range(4):
            x = 72 + col * 30
            y = 108 + row * 32
            fill = SOFT if (row + col) % 2 else WHITE
            d.rounded_rectangle((x, y, x + 22, y + 22), radius=4, fill=fill, outline=MUTED, width=1)


def mcp(d):
    d.ellipse((78, 78, 178, 178), fill=WHITE, outline=ORANGE, width=5)
    d.ellipse((108, 108, 148, 148), fill=ORANGE)
    for angle in range(0, 360, 51):
        import math
        rad = math.radians(angle)
        x1 = 128 + 35 * math.cos(rad)
        y1 = 128 + 35 * math.sin(rad)
        x2 = 128 + 95 * math.cos(rad)
        y2 = 128 + 95 * math.sin(rad)
        d.line((x1, y1, x2, y2), fill=NAVY, width=4)
        d.ellipse((x2 - 10, y2 - 10, x2 + 10, y2 + 10), fill=SOFT, outline=NAVY, width=2)


def approval(d):
    rounded_rect(d, (52, 72, 204, 188), WHITE)
    d.polygon([(72, 100), (98, 126), (158, 66)], fill=ORANGE)
    d.line((72, 100, 98, 126), fill=WHITE, width=6)
    d.line((98, 126, 158, 66), fill=WHITE, width=6)
    d.rounded_rectangle((52, 188, 204, 220), radius=8, fill=SOFT, outline=NAVY, width=2)


for name, fn in [
    ("ingest", ingest),
    ("classify", classify),
    ("prioritize", prioritize),
    ("weekly", weekly),
    ("schedule", schedule),
    ("mcp", mcp),
    ("approval", approval),
]:
    save(name, fn)
    print("wrote", name)
