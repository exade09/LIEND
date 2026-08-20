"""Pixelate the lo-fi sky still into a looping App backdrop."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Admin\.cursor\projects\d-Larp-Utility\assets"
    r"\c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_9a62534098371f684b2621aa65e4281c_images_image-1455c177-92dc-4d77-97f7-ad90bc582a94.png"
)
OUT = Path(r"D:\Larp-Utility\apps\app\public\assets\stage\pixel-sky.png")
GRID = (240, 135)

PALETTE = [
    (8, 24, 96),
    (11, 28, 120),
    (12, 40, 148),
    (14, 48, 168),
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
]


def nearest(rgb):
    r, g, b = rgb
    best = PALETTE[0]
    best_d = 10**9
    for color in PALETTE:
        dr = r - color[0]
        dg = g - color[1]
        db = b - color[2]
        dist = dr * dr * 0.7 + dg * dg + db * db * 1.35
        if dist < best_d:
            best_d = dist
            best = color
    return best


src = Image.open(SRC).convert("RGB")
grid = src.resize(GRID, Image.Resampling.BOX)
px = grid.load()
w, h = grid.size
for y in range(h):
    for x in range(w):
        px[x, y] = nearest(px[x, y])

OUT.parent.mkdir(parents=True, exist_ok=True)

def mix(a, b, t):
    return tuple(int(a[c] + (b[c] - a[c]) * t) for c in range(3))


def make_seamless_x(img, blend=40):
    """Wrap the left edge into the right edge so a horizontal loop has no cut."""
    w, h = img.size
    blend = min(blend, w // 3)
    px = img.load()
    for y in range(h):
        for i in range(blend):
            t = i / max(blend - 1, 1)
            t = t * t * (3 - 2 * t)
            left = px[i, y]
            right = px[w - blend + i, y]
            px[w - blend + i, y] = nearest(mix(right, left, t))
    return img


src = Image.open(SRC).convert("RGB")
grid = src.resize(GRID, Image.Resampling.BOX)
px = grid.load()
w, h = grid.size
for y in range(h):
    for x in range(w):
        px[x, y] = nearest(px[x, y])

grid = make_seamless_x(grid)
grid.save(OUT)
print(OUT, grid.size)
