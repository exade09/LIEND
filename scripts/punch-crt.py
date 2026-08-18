"""Punch black backdrop and white CRT screen to alpha, then crop."""
from collections import deque
from pathlib import Path

from PIL import Image

src = Path(
    r"C:\Users\Admin\.cursor\projects\d-Larp-Utility\assets"
    r"\c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_9a62534098371f684b2621aa65e4281c_images_image-cad12b62-07a2-430e-b253-6e28808f22f8.png"
)
img = Image.open(src).convert("RGBA")
w, h = img.size
px = img.load()
print("size", w, h)


def is_black(x, y):
    r, g, b, a = px[x, y]
    return a > 0 and r < 16 and g < 16 and b < 16


def is_white(x, y):
    r, g, b, a = px[x, y]
    return (
        a > 200
        and r > 220
        and g > 218
        and b > 208
        and abs(r - g) < 10
        and abs(g - b) < 14
    )


def flood(pred, sx, sy):
    if not pred(sx, sy):
        return []
    seen = {(sx, sy)}
    q = deque([(sx, sy)])
    cells = []
    while q:
        x, y = q.popleft()
        cells.append((x, y))
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and pred(nx, ny):
                seen.add((nx, ny))
                q.append((nx, ny))
    return cells


outer_seen = set()
outer = []
for sx, sy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1)):
    if (sx, sy) in outer_seen:
        continue
    for cell in flood(is_black, sx, sy):
        if cell not in outer_seen:
            outer_seen.add(cell)
            outer.append(cell)

inner = flood(is_white, w // 2, h // 3)
if not inner:
    inner = flood(is_white, w // 2, h // 4)
print("inner white pixels", len(inner))

# Eat anti-aliased fringe so the hole sits under the inner bezel lip.
dilated = set(inner)
for _ in range(4):
    extra = []
    for x, y in list(dilated):
        for nx in range(x - 1, x + 2):
            for ny in range(y - 1, y + 2):
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in dilated:
                    extra.append((nx, ny))
    dilated.update(extra)
inner = list(dilated)
print("inner after dilate", len(inner))

for x, y in outer:
    px[x, y] = (0, 0, 0, 0)
for x, y in inner:
    px[x, y] = (0, 0, 0, 0)

xs = [x for x, _ in inner]
ys = [y for _, y in inner]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)

# Corner radius of the punched screen: walk inward from AABB corner until a
# punched (transparent) pixel on the hole's quarter-circle is left behind.
def corner_radius():
    for r in range(2, 80):
        x = minx + r
        y = miny
        # find first opaque pixel along top edge from left
        if px[x, miny][3] > 0:
            return r
    return 8

print("screen px", minx, miny, maxx, maxy)

bbox = img.getbbox()
print("opaque bbox", bbox)
cropped = img.crop(bbox)
cw, ch = cropped.size
sx0 = minx - bbox[0]
sy0 = miny - bbox[1]
sx1 = maxx - bbox[0]
sy1 = maxy - bbox[1]
print("cropped size", cw, ch)
print("cropped left", round(sx0 / cw * 100, 4))
print("cropped top", round(sy0 / ch * 100, 4))
print("cropped right", round((cw - 1 - sx1) / cw * 100, 4))
print("cropped bottom", round((ch - 1 - sy1) / ch * 100, 4))
print("cropped width", round((sx1 - sx0 + 1) / cw * 100, 4))
print("cropped height", round((sy1 - sy0 + 1) / ch * 100, 4))

# radius in cropped space: distance from AABB corner to first opaque along top
cpx = cropped.load()
radius = 0
for r in range(0, 90):
    x = sx0 + r
    if x > sx1:
        break
    if cpx[x, sy0][3] > 40:
        radius = r
        break
print("approx corner radius px", radius)
print("approx corner radius % of width", round(radius / cw * 100, 4))

out = Path(r"D:\Larp-Utility\public\assets\crt-monitor.png")
out.parent.mkdir(parents=True, exist_ok=True)
cropped.save(out, "PNG", optimize=True)
print("saved", out, out.stat().st_size)
