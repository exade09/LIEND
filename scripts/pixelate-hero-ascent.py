"""Pixel hero banner from the stairs/sky still, fading into the stats cobalt."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Admin\.cursor\projects\d-Larp-Utility\assets"
    r"\c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_9a62534098371f684b2621aa65e4281c_images_image-82b999ad-f075-49af-81f3-ad7c87c1dec9.png"
)
OUT = Path(r"D:\Larp-Utility\public\assets\hero\pixel-ascent.png")
GRID = (480, 270)
COBALT = (18, 56, 200)

PALETTE = [
    (8, 24, 96),
    (12, 40, 148),
    (18, 56, 200),
    (21, 72, 214),
    (26, 98, 228),
    (28, 125, 242),
    (46, 148, 248),
    (63, 168, 255),
    (92, 188, 255),
    (130, 208, 255),
    (168, 224, 255),
    (198, 236, 255),
    (226, 244, 255),
    (242, 250, 255),
    (255, 255, 255),
    (210, 222, 236),
    (186, 202, 222),
    (158, 178, 206),
    (128, 152, 188),
    (96, 124, 172),
    (72, 104, 156),
    (232, 236, 240),
    (214, 220, 228),
    (196, 204, 214),
    (168, 176, 188),
    (220, 132, 88),
    (188, 84, 58),
    (48, 72, 140),
    (32, 52, 120),
]


def nearest(rgb):
    r, g, b = rgb
    best = PALETTE[0]
    best_d = 10**9
    for color in PALETTE:
        dr = r - color[0]
        dg = g - color[1]
        db = b - color[2]
        dist = dr * dr * 0.85 + dg * dg + db * db * 1.2
        if dist < best_d:
            best_d = dist
            best = color
    return best


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


src = Image.open(SRC).convert("RGB")
grid = src.resize(GRID, Image.Resampling.BOX)
px = grid.load()
w, h = grid.size
fade_from = int(h * 0.62)

for y in range(h):
    fade = smooth((y - fade_from) / (h - 1 - fade_from)) if y >= fade_from else 0.0
    for x in range(w):
        color = px[x, y]
        if fade:
            color = mix(color, COBALT, fade)
        px[x, y] = nearest(color)

OUT.parent.mkdir(parents=True, exist_ok=True)
grid.save(OUT, "PNG", optimize=True)
print("saved", OUT, grid.size, OUT.stat().st_size)
