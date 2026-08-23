"""Cut the howto recordings into 16:9 site-only clips plus an install still."""

from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"D:\Larp-Utility")
OUT = ROOT / "tmp" / "howto"
FONTS = Path(r"C:\Windows\Fonts")
PIXEL = ROOT / "tmp" / "live-gif" / "fonts"
MARK = ROOT / "public" / "assets" / "logo" / "pixel" / "liend-mark-128.png"
CURSOR = ROOT / "public" / "assets" / "cursor" / "liend-arrow.png"

BORROW_SRC = Path(r"d:\2026-08-23 07-56-00.mp4")
EXT_SRC = Path(r"d:\2026-08-23 08-04-10.mp4")

FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT_W, OUT_H = 1920, 1080
OUT_FPS = 30
TASKBAR = 48
PANEL_X = 3080

DESKTOP = (21, 64, 212)
INK = (20, 28, 51)
FACE = (236, 242, 252)
SIGNAL = (77, 255, 90)
PAPER = (232, 236, 244)
CHROME_BG = (241, 243, 244)
CHROME_CARD = (255, 255, 255)
TOGGLE = (26, 115, 232)

# Borrow / extension Ken Burns: (t, cx, cy, zoom). zoom < 1 fits width.
BORROW_KEYS = [
    (0.00, 760, 600, 1.58),
    (1.80, 760, 520, 1.50),
    (3.50, 900, 560, 1.22),
    (5.10, 820, 640, 1.36),
    (6.80, 720, 820, 1.52),
    (8.40, 780, 620, 1.26),
    (11.0, 680, 470, 1.64),
    (13.6, 820, 640, 1.30),
    (16.15, 660, 900, 1.64),
    (16.85, 2460, 720, 1.16),
    (17.25, 3180, 740, 1.44),
    (18.10, 860, 680, 1.32),
    (21.4, 860, 680, 1.32),
    (23.65, 860, 660, 1.24),
]

# Times are relative to EXT_START (OBS is on screen before that).
EXT_START = 4.40
EXT_KEYS = [
    (0.00, 820, 540, 1.28),
    (2.40, 820, 540, 1.34),
    (4.60, 3220, 540, 1.64),
    (7.20, 860, 600, 1.30),
    (9.80, 980, 700, 1.18),
    (10.8, 760, 780, 1.50),
    (12.6, 900, 540, 1.22),
    (14.6, 900, 540, 1.18),
    (16.6, 2500, 680, 1.16),
    (19.2, 3220, 600, 1.64),
    (22.2, 820, 640, 1.30),
    (24.8, 740, 860, 1.56),
    (27.17, 820, 640, 1.24),
]


def font(name: str, size: int, pixel: bool = False) -> ImageFont.FreeTypeFont:
    path = (PIXEL / name) if pixel else (FONTS / name)
    return ImageFont.truetype(str(path), size)


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def sample_keys(keys: list[tuple[float, float, float, float]], t: float) -> tuple[float, float, float]:
    if t <= keys[0][0]:
        return keys[0][1], keys[0][2], keys[0][3]
    if t >= keys[-1][0]:
        return keys[-1][1], keys[-1][2], keys[-1][3]
    for i in range(1, len(keys)):
        t0, x0, y0, z0 = keys[i - 1]
        t1, x1, y1, z1 = keys[i]
        if t <= t1:
            u = ease((t - t0) / max(1e-6, t1 - t0))
            return lerp(x0, x1, u), lerp(y0, y1, u), lerp(z0, z1, u)
    return keys[-1][1], keys[-1][2], keys[-1][3]


def crop_taskbar(rgb: np.ndarray) -> np.ndarray:
    return rgb[: rgb.shape[0] - TASKBAR]


def _blur_box(rgb: np.ndarray, box: tuple[int, int, int, int], radius: int = 22) -> None:
    x0, y0, x1, y1 = box
    h, w = rgb.shape[:2]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return
    patch = Image.fromarray(rgb[y0:y1, x0:x1]).filter(ImageFilter.GaussianBlur(radius))
    rgb[y0:y1, x0:x1] = np.asarray(patch)


def _smear_box(rgb: np.ndarray, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    h, w = rgb.shape[:2]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    if x1 <= x0 or y1 <= y0:
        return
    src_x = max(0, x0 - 48)
    strip = rgb[y0:y1, src_x : src_x + 16]
    if strip.size == 0:
        return
    fill = np.repeat(strip.mean(axis=1, keepdims=True), x1 - x0, axis=1).astype(np.uint8)
    blurred = cv2.GaussianBlur(fill, (0, 0), 8)
    rgb[y0:y1, x0:x1] = blurred


def looks_gray(roi: np.ndarray) -> bool:
    if roi.size == 0:
        return False
    mean = roi.mean(axis=(0, 1))
    spread = abs(float(mean[0] - mean[1])) + abs(float(mean[1] - mean[2]))
    return spread < 28 and 42 < float(mean.mean()) < 120


def looks_dark_page(rgb: np.ndarray) -> bool:
    return float(rgb[:80, :800].mean()) < 55


def cover_desktop(rgb: np.ndarray, kind: str, t: float) -> None:
    h, w = rgb.shape[:2]
    tip = rgb[h - 28 : h - 4, 8:520]
    if tip.size and float(tip.mean()) > 188:
        _blur_box(rgb, (0, h - 34, 640, h - 2), 8)

    obs = rgb[40:1000, 1500:PANEL_X]
    if kind == "borrow" and t < 2.1:
        pass
    elif looks_gray(obs):
        _smear_box(rgb, (1480, 8, PANEL_X - 4, 1120))
        _blur_box(rgb, (1480, 8, PANEL_X - 4, 1120), 14)

    if kind == "ext" and looks_dark_page(rgb):
        cookie = rgb[h - 210 : h - 36, 2060 : PANEL_X - 20]
        if cookie.size and 8 < float(cookie.mean()) < 72:
            _blur_box(rgb, (2060, h - 220, PANEL_X - 16, h - 28), 14)

    if kind == "borrow" and 16.7 < t < 18.2:
        right = rgb[70:210, 3000:w]
        if right.size and float(right.mean()) < 110:
            _blur_box(rgb, (3000, 64, w, 200), 11)

    # Raw loan ids look like garbage (ln_mt5c46ig). Cover in source space.
    if (kind == "borrow" and t >= 18.75) or (kind == "ext" and t >= 29.0):
        _smear_box(rgb, (36, 148, 340, 198))


def hide_output_loan_id(rgb: np.ndarray, box: tuple[int, int, int, int] = (4, 14, 318, 90)) -> np.ndarray:
    """Cover the raw loan id under the LOAN title. Leave the title, write nothing."""
    img = Image.fromarray(rgb)
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    sky = tuple(int(v) for v in rgb[24:48, 360:420].mean(axis=(0, 1)))
    draw.rectangle((x0, y0, x1, y1), fill=sky)
    return np.asarray(img)


def patch_existing() -> None:
    jobs = [
        (OUT / "liend-howto-borrow.mp4", 18.75, (4, 14, 318, 90)),
        (OUT / "liend-howto-extension.mp4", 24.9, (4, 8, 360, 150)),
    ]
    for src, start, box in jobs:
        tmp = src.with_suffix(".tmp.mp4")
        cap = cv2.VideoCapture(str(src))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        cmd = [
            FF, "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OUT_W}x{OUT_H}", "-r", str(fps),
            "-i", "-",
            "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(tmp),
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        assert proc.stdin is not None
        index = 0
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            if index / fps >= start:
                rgb = hide_output_loan_id(rgb, box)
            proc.stdin.write(rgb.tobytes())
            index += 1
        cap.release()
        proc.stdin.close()
        if proc.wait() != 0:
            raise SystemExit(f"patch encode failed for {src.name}")
        tmp.replace(src)
        print(f"patched {src.name}")


def project_frame(rgb: np.ndarray, cx: float, cy: float, zoom: float) -> np.ndarray:
    h, w = rgb.shape[:2]
    if zoom < 1.0:
        scale = OUT_W / w
        new_h = max(2, int(round(h * scale)) & ~1)
        resized = cv2.resize(rgb, (OUT_W, new_h), interpolation=cv2.INTER_AREA)
        canvas = np.full((OUT_H, OUT_W, 3), DESKTOP, dtype=np.uint8)
        y0 = (OUT_H - new_h) // 2
        if new_h >= OUT_H:
            extra = (new_h - OUT_H) // 2
            canvas[:] = resized[extra : extra + OUT_H]
        else:
            canvas[y0 : y0 + new_h] = resized
        return canvas

    crop_h = h / zoom
    crop_w = crop_h * OUT_W / OUT_H
    crop_w = min(crop_w, w)
    crop_h = crop_w * OUT_H / OUT_W
    x0 = cx - crop_w / 2
    y0 = cy - crop_h / 2
    x0 = max(0.0, min(w - crop_w, x0))
    y0 = max(0.0, min(h - crop_h, y0))
    x1, y1 = x0 + crop_w, y0 + crop_h
    # Subpixel crop via resize of integer slice with a 1px pad.
    ix0, iy0 = int(math.floor(x0)), int(math.floor(y0))
    ix1, iy1 = int(math.ceil(x1)), int(math.ceil(y1))
    ix0, iy0 = max(0, ix0), max(0, iy0)
    ix1, iy1 = min(w, ix1), min(h, iy1)
    patch = rgb[iy0:iy1, ix0:ix1]
    return cv2.resize(patch, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)


def render_video(src: Path, dest: Path, keys: list, kind: str, start: float = 0.0) -> None:
    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        raise SystemExit(f"cannot open {src}")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / src_fps
    print(f"{kind}: {src.name} {total}f {src_fps:.2f}fps {duration:.2f}s -> {dest.name}")

    cmd = [
        FF, "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OUT_W}x{OUT_H}", "-r", str(OUT_FPS),
        "-i", "-",
        "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(dest),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None

    src_index = 0
    out_index = 0
    step = src_fps / OUT_FPS
    next_src = start * src_fps
    last = None
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        if src_index + 0.5 >= next_src:
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            rgb = crop_taskbar(rgb)
            t = src_index / src_fps
            cover_desktop(rgb, kind, t)
            cx, cy, zoom = sample_keys(keys, t - start)
            frame = project_frame(rgb, cx, cy, zoom)
            proc.stdin.write(frame.tobytes())
            last = frame
            out_index += 1
            next_src += step
            if out_index % 60 == 0:
                print(f"  {kind} {out_index / OUT_FPS:.1f}s")
        src_index += 1
    cap.release()
    if last is not None:
        Image.fromarray(last).save(OUT / f"preview-{kind}.jpg", quality=92)
    proc.stdin.close()
    code = proc.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg failed for {kind}: {code}")
    print(f"wrote {dest} ({dest.stat().st_size / 1e6:.1f} MB, {out_index / OUT_FPS:.2f}s)")


def knock_mark(size: int) -> Image.Image:
    image = Image.open(MARK).convert("RGBA")
    rgb = np.asarray(image)[..., :3]
    alpha = np.where(np.max(rgb, axis=2) < 12, 0, 255).astype(np.uint8)
    image.putalpha(Image.fromarray(alpha))
    return image.resize((size, size), Image.Resampling.NEAREST)


def chrome_mark(size: int = 22) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.pieslice((1, 1, size - 2, size - 2), 300, 60, fill=(234, 67, 53))
    draw.pieslice((1, 1, size - 2, size - 2), 60, 180, fill=(251, 188, 5))
    draw.pieslice((1, 1, size - 2, size - 2), 180, 300, fill=(52, 168, 83))
    r = size * 0.28
    c = size / 2
    draw.ellipse((c - r, c - r, c + r, c + r), fill=(255, 255, 255))
    r2 = size * 0.17
    draw.ellipse((c - r2, c - r2, c + r2, c + r2), fill=(66, 133, 244))
    return img


def bevel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], sunken: bool = False) -> None:
    x0, y0, x1, y1 = box
    a, b = ((112, 112, 112), (255, 255, 255)) if sunken else ((255, 255, 255), (48, 48, 48))
    draw.line([(x0, y0), (x1 - 1, y0), (x0, y0), (x0, y1 - 1)], fill=a)
    draw.line([(x1 - 1, y0), (x1 - 1, y1 - 1), (x0, y1 - 1), (x1 - 1, y1 - 1)], fill=b)


def desktop_plate() -> Image.Image:
    arr = np.full((OUT_H, OUT_W, 3), DESKTOP, dtype=np.uint8)
    arr[::8, :, :] = np.clip(arr[::8, :, :].astype(np.int16) + 9, 0, 255)
    arr[:, ::8, :] = np.clip(arr[:, ::8, :].astype(np.int16) + 5, 0, 255)
    noise = np.random.default_rng(79).integers(-7, 8, (OUT_H, OUT_W, 1), dtype=np.int16)
    return Image.fromarray(np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def add_to_chrome_badge() -> Image.Image:
    w, h = 188, 40
    badge = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), 6, fill=(28, 28, 28))
    draw.rounded_rectangle((1, 1, w - 2, h - 2), 5, fill=(18, 18, 18))
    for y in range(2, h - 2):
        u = y / (h - 4)
        c = int(44 - 20 * u)
        draw.line([(2, y), (w - 3, y)], fill=(c, c, c))
    badge.paste(chrome_mark(22), (10, 9), chrome_mark(22))
    draw.text((40, 10), "Add to Chrome", font=font("IBMPlexMono-Medium.ttf", 15, pixel=True), fill=(255, 255, 255))
    return badge


def site_header_card(width: int, height: int) -> Image.Image:
    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    # sky plate
    sky = np.full((height, width, 3), DESKTOP, dtype=np.uint8)
    yy = np.linspace(0, 1, height)[:, None, None]
    sky = np.clip(sky.astype(np.int16) + (yy * 18).astype(np.int16), 0, 255).astype(np.uint8)
    card.paste(Image.fromarray(sky), (0, 0))
    # ticker
    draw.rectangle((0, 0, width, 28), fill=(10, 16, 40))
    draw.ellipse((16, 9, 24, 17), fill=SIGNAL)
    draw.text((32, 6), "LIVE", font=font("Silkscreen-Bold.ttf", 12, pixel=True), fill=(255, 255, 255))
    draw.text((78, 7), "liend.app", font=font("IBMPlexMono-Medium.ttf", 12, pixel=True), fill=(186, 196, 220))
    # glass header
    header = Image.new("RGBA", (width, 72), (236, 242, 252, 210))
    card.paste(header, (0, 28), header)
    draw.line((0, 99, width, 99), fill=(20, 28, 51, 80))
    mark = knock_mark(36)
    card.paste(mark, (22, 46), mark)
    draw.text((66, 54), "LIEND", font=font("Silkscreen-Bold.ttf", 18, pixel=True), fill=INK)
    for i, label in enumerate(("product", "how it works", "markets")):
        draw.text((180 + i * 150, 56), label, font=font("Silkscreen-Regular.ttf", 13, pixel=True), fill=(27, 36, 56))
    badge = add_to_chrome_badge()
    bx, by = width - 430, 44
    card.paste(badge, (bx, by), badge)
    # launch
    draw.rounded_rectangle((width - 220, 48, width - 28, 84), 6, fill=(32, 210, 74))
    draw.text((width - 198, 56), "LAUNCH APP", font=font("Silkscreen-Bold.ttf", 12, pixel=True), fill=(8, 20, 12))
    # pointer
    if CURSOR.exists():
        cur = Image.open(CURSOR).convert("RGBA").resize((42, 42), Image.Resampling.NEAREST)
        card.paste(cur, (bx + 150, by + 28), cur)
    # callout
    draw.rounded_rectangle((bx - 10, by - 8, bx + badge.width + 18, by + badge.height + 14), 8, outline=SIGNAL, width=3)
    return card


def chrome_extensions_card(width: int, height: int, mode: str) -> Image.Image:
    card = Image.new("RGBA", (width, height), CHROME_BG + (255,))
    draw = ImageDraw.Draw(card)
    draw.rectangle((0, 0, width, 38), fill=(255, 255, 255))
    draw.rounded_rectangle((16, 8, width - 16, 32), 14, fill=(232, 234, 237))
    draw.text((28, 12), "chrome://extensions", font=font("segoeui.ttf", 13), fill=(60, 64, 67))
    draw.line((0, 38, width, 38), fill=(218, 220, 224))
    if mode == "extensions":
        draw.text((22, 56), "Extensions", font=font("segoeui.ttf", 26), fill=(32, 33, 36))
        draw.text((22, 96), "Open this page in Chrome after the zip downloads", font=font("segoeui.ttf", 14), fill=(95, 99, 104))
        for i, name in enumerate(("LIEND", "uBlock", "Phantom")):
            y = 150 + i * 78
            draw.rounded_rectangle((22, y, width - 22, y + 68), 10, fill=CHROME_CARD)
            if i == 0:
                m = knock_mark(36)
                card.paste(m, (38, y + 16), m)
                draw.text((84, y + 14), "LIEND", font=font("segoeui.ttf", 16), fill=(32, 33, 36))
                draw.text((84, y + 38), "not loaded yet", font=font("segoeui.ttf", 13), fill=(95, 99, 104))
            else:
                draw.ellipse((40, y + 20, 68, y + 48), fill=(200, 204, 210))
                draw.text((84, y + 22), name, font=font("segoeui.ttf", 16), fill=(95, 99, 104))
    elif mode == "developer":
        draw.text((22, 56), "Developer mode", font=font("segoeui.ttf", 24), fill=(32, 33, 36))
        draw.text((22, 96), "Toggle it on in the top right", font=font("segoeui.ttf", 14), fill=(95, 99, 104))
        draw.rounded_rectangle((22, 150, width - 22, 230), 12, fill=CHROME_CARD)
        draw.text((40, 172), "Developer mode", font=font("segoeui.ttf", 18), fill=(32, 33, 36))
        draw.text((40, 198), "Required to load an unpacked zip", font=font("segoeui.ttf", 13), fill=(95, 99, 104))
        # toggle ON
        tx0, ty0 = width - 118, 176
        draw.rounded_rectangle((tx0, ty0, tx0 + 68, ty0 + 34), 17, fill=TOGGLE)
        draw.ellipse((tx0 + 36, ty0 + 3, tx0 + 66, ty0 + 31), fill=(255, 255, 255))
        draw.rounded_rectangle((tx0 - 8, ty0 - 8, tx0 + 76, ty0 + 42), 20, outline=SIGNAL, width=3)
        draw.rounded_rectangle((22, 252, width - 22, height - 22), 12, fill=CHROME_CARD)
        draw.rounded_rectangle((40, 278, 210, 318), 8, fill=(232, 240, 254))
        draw.text((56, 288), "Load unpacked", font=font("segoeui.ttf", 15), fill=TOGGLE)
        draw.text((40, 336), "This button appears after developer mode is on", font=font("segoeui.ttf", 13), fill=(95, 99, 104))
    else:
        draw.text((22, 56), "Load unpacked", font=font("segoeui.ttf", 24), fill=(32, 33, 36))
        draw.text((22, 96), "Extract the zip, then import that folder", font=font("segoeui.ttf", 14), fill=(95, 99, 104))
        # folder
        draw.rounded_rectangle((28, 150, width - 28, 268), 10, fill=(32, 36, 48))
        draw.rectangle((40, 168, 92, 200), fill=(250, 208, 80))
        draw.rounded_rectangle((40, 188, width - 48, 252), 8, fill=(255, 214, 96))
        draw.text((52, 208), "liend-extension", font=font("IBMPlexMono-Medium.ttf", 16, pixel=True), fill=(40, 28, 8))
        draw.text((52, 230), "manifest.json", font=font("IBMPlexMono-Medium.ttf", 13, pixel=True), fill=(90, 60, 16))
        draw.rounded_rectangle((28, 288, width - 28, height - 22), 10, fill=CHROME_CARD)
        draw.rounded_rectangle((44, 312, 240, 354), 8, fill=TOGGLE)
        draw.text((64, 322), "Load unpacked", font=font("segoeui.ttf", 16), fill=(255, 255, 255))
        draw.text((44, 368), "Select the extracted folder", font=font("segoeui.ttf", 14), fill=(95, 99, 104))
    return card


def compose_install() -> Path:
    canvas = desktop_plate()
    draw = ImageDraw.Draw(canvas)
    title = font("Silkscreen-Bold.ttf", 28, pixel=True)
    body = font("IBMPlexMono-Medium.ttf", 15, pixel=True)
    draw.text((48, 28), "LOAD THE EXTENSION", font=title, fill=(255, 255, 255))
    draw.text((48, 68), "add to chrome on the site  then load the unpacked folder", font=body, fill=(186, 204, 255))

    panels = [
        (48, 112, 1824, 430, "01  add to chrome", "the header button downloads the zip"),
        (48, 560, 592, 488, "02  extensions", "open chrome://extensions"),
        (664, 560, 592, 488, "03  developer mode", "turn the toggle on"),
        (1280, 560, 592, 488, "04  unpack and import", "extract on the pc  load unpacked"),
    ]
    for x, y, w, h, label, sub in panels:
        draw.rectangle((x, y, x + w, y + h), fill=(12, 28, 110))
        bevel(draw, (x, y, x + w, y + h))
        draw.text((x + 16, y + 10), label, font=font("Silkscreen-Bold.ttf", 16, pixel=True), fill=SIGNAL)
        draw.text((x + 16, y + 34), sub, font=font("IBMPlexMono-Medium.ttf", 12, pixel=True), fill=(196, 210, 255))

    header = site_header_card(1792, 300)
    canvas.paste(header, (64, 168), header)

    canvas.paste(chrome_extensions_card(560, 400, "extensions"), (64, 620), chrome_extensions_card(560, 400, "extensions"))
    canvas.paste(chrome_extensions_card(560, 400, "developer"), (680, 620), chrome_extensions_card(560, 400, "developer"))
    canvas.paste(chrome_extensions_card(560, 400, "load"), (1296, 620), chrome_extensions_card(560, 400, "load"))

    dest = OUT / "liend-howto-install.jpg"
    rgb = canvas.convert("RGB")
    rgb.save(dest, quality=94)
    rgb.save(OUT / "liend-howto-install.png")
    print(f"wrote {dest}")
    return dest


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    args = set(sys.argv[1:])
    if not args or "install" in args or "all" in args:
        compose_install()
    if not args or "borrow" in args or "all" in args:
        render_video(BORROW_SRC, OUT / "liend-howto-borrow.mp4", BORROW_KEYS, "borrow")
    if not args or "ext" in args or "all" in args:
        render_video(EXT_SRC, OUT / "liend-howto-extension.mp4", EXT_KEYS, "ext", start=EXT_START)
    if "patch" in args:
        patch_existing()


if __name__ == "__main__":
    main()
