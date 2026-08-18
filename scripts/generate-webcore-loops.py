"""Compact looping pixel-webcore GIFs in the LIEND cobalt/signal palette."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(r"D:\Larp-Utility\public\assets\loops")
OUT.mkdir(parents=True, exist_ok=True)
W, H, FRAMES = 480, 270, 24
INK = (8, 18, 78)
DEEP = (4, 10, 48)
CYAN = (94, 232, 255)
GREEN = (77, 255, 90)
VIOLET = (123, 92, 255)
GLASS = (214, 224, 242)
TITLE = (48, 78, 210)


def save_gif(name, frames, duration=80):
    path = OUT / name
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(name, path.stat().st_size)


def dither_bg(img, t, period=7):
    px = img.load()
    for y in range(0, H, 3):
        shade = 10 + ((y + t) % 9)
        for x in range(0, W, 3):
            if ((x + y + t) % period) == 0:
                px[x, y] = (shade, shade + 8, shade + 36)


def lattice(t):
    img = Image.new("RGB", (W, H), INK)
    dither_bg(img, t)
    d = ImageDraw.Draw(img)
    vanishing = (W // 2, 78)
    for i in range(-10, 11):
        x = vanishing[0] + i * 42
        d.line((x, H, vanishing[0], vanishing[1]), fill=(36, 62, 168))
    for row in range(12):
        y = vanishing[1] + int((H - vanishing[1]) * ((row / 12) ** 1.45))
        d.line((0, y, W, y), fill=(32, 58, 160))
    packet = (t * 18) % (W + 60) - 30
    horizon = vanishing[1] + 36 + (t % 6) * 8
    d.rectangle((packet, horizon, packet + 28, horizon + 8), fill=CYAN)
    d.rectangle((packet + 30, horizon, packet + 36, horizon + 8), fill=GREEN)
    d.rectangle((0, vanishing[1] - 1, W, vanishing[1] + 1), fill=VIOLET)
    return img.convert("P", palette=Image.ADAPTIVE, colors=40)


def scan(t):
    img = Image.new("RGB", (W, H), DEEP)
    px = img.load()
    bar = (t * 11) % H
    for y in range(H):
        row = (18, 32, 96) if y % 3 == 0 else (6, 16, 72)
        for x in range(W):
            px[x, y] = row
        dist = abs(y - bar)
        if dist < 14:
            glow = int(110 * (1 - dist / 14))
            for x in range(W):
                r, g, b = px[x, y]
                px[x, y] = (min(255, r + glow // 4), min(255, g + glow), min(255, b + glow // 2))
    d = ImageDraw.Draw(img)
    gx = (t * 17) % (W - 80)
    gy = (t * 9) % (H - 40)
    d.rectangle((gx, gy, gx + 54, gy + 18), outline=CYAN)
    d.rectangle((gx + 4, gy + 4, gx + 22, gy + 8), fill=GREEN)
    if t % 5 == 0:
        d.rectangle((gx + 70, gy + 22, gx + 118, gy + 30), fill=VIOLET)
    return img.convert("P", palette=Image.ADAPTIVE, colors=32)


def windows(t):
    img = Image.new("RGB", (W, H), INK)
    dither_bg(img, t, period=11)
    d = ImageDraw.Draw(img)
    specs = (
        (28, 36, 150, 92, GREEN),
        (210, 22, 170, 108, CYAN),
        (70, 128, 180, 96, VIOLET),
        (280, 140, 140, 86, GREEN),
        (340, 48, 110, 74, CYAN),
    )
    for i, (x, y, w, h, accent) in enumerate(specs):
        dx = ((t * (2 + i)) % 24) - 12
        dy = ((t * (1 + i)) % 16) - 8
        x0, y0 = x + dx, y + dy
        d.rectangle((x0, y0, x0 + w, y0 + h), fill=(12, 28, 96), outline=GLASS)
        d.rectangle((x0, y0, x0 + w, y0 + 12), fill=TITLE)
        d.rectangle((x0 + 4, y0 + 4, x0 + 18, y0 + 8), fill=accent)
        d.rectangle((x0 + w - 28, y0 + 3, x0 + w - 6, y0 + 9), fill=(180, 188, 210))
        for row in range(3):
            yy = y0 + 22 + row * 16
            d.rectangle((x0 + 10, yy, x0 + w - 12, yy + 6), fill=(40, 70, 170))
    return img.convert("P", palette=Image.ADAPTIVE, colors=40)


def rain(t):
    img = Image.new("RGB", (W, H), DEEP)
    d = ImageDraw.Draw(img)
    for col in range(0, W, 8):
        head = (col * 17 + t * 13) % (H + 36) - 18
        for k in range(10):
            y = (head - k * 7) % (H + 16)
            if k == 0:
                color = GREEN
            elif k < 3:
                color = CYAN
            else:
                color = (18, 70 + k * 6, 58)
            d.rectangle((col, y, col + 5, y + 5), fill=color)
    d.rectangle((0, 0, W, 2), fill=VIOLET)
    d.rectangle((0, H - 3, W, H), fill=(30, 50, 130))
    return img.convert("P", palette=Image.ADAPTIVE, colors=28)


save_gif("lattice.gif", [lattice(i) for i in range(FRAMES)], 90)
save_gif("scan.gif", [scan(i) for i in range(FRAMES)], 70)
save_gif("windows.gif", [windows(i) for i in range(FRAMES)], 90)
save_gif("rain.gif", [rain(i) for i in range(FRAMES)], 70)
