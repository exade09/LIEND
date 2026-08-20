"""Render LIEND mark variants from the current pixel droplet source.

Transparent marks for UI. Opaque navy plates only for favicon / apple icon.
Run: python scripts/render-logo-variants.py
"""

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tmp" / "logo-pixel" / "source.png"
OUT_DIR = ROOT / "public" / "assets" / "logo" / "pixel"
APP_DIR = ROOT / "apps" / "app" / "public" / "assets" / "logo" / "pixel"
PREVIEW_DIR = ROOT / "tmp" / "logo-pixel"

SIZES = (32, 48, 64, 128, 256, 512)
NAVY = (11, 28, 114, 255)


def luma(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def knockout_black(image: Image.Image, cut: float = 12, fade: float = 28) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            red, green, blue, _alpha = pixels[x, y]
            level = luma(red, green, blue)
            if level < cut:
                pixels[x, y] = (0, 0, 0, 0)
            elif level < fade:
                t = (level - cut) / (fade - cut)
                pixels[x, y] = (red, green, blue, int(255 * t))
    return image


def crop_mark(image: Image.Image, pad_ratio: float = 0.08) -> Image.Image:
    box = image.getbbox()
    if not box:
        return image
    left, top, right, bottom = box
    pad = int(max(right - left, bottom - top) * pad_ratio)
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(image.width, right + pad)
    bottom = min(image.height, bottom + pad)
    cropped = image.crop((left, top, right, bottom))
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(
        cropped,
        ((side - cropped.width) // 2, (side - cropped.height) // 2),
        cropped,
    )
    return square


def scale_mark(source: Image.Image, size: int) -> Image.Image:
    scaled = source.resize((size, size), Image.Resampling.LANCZOS)
    if size >= 64:
        radius = 0.45 if size < 256 else 0.9
        scaled = scaled.filter(ImageFilter.UnsharpMask(radius=radius, percent=55, threshold=2))
    return scaled


def on_navy(mark: Image.Image) -> Image.Image:
    field = Image.new("RGBA", mark.size, NAVY)
    field.paste(mark, (0, 0), mark)
    return field


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)
    print(f"{image.size[0]}px -> {path.relative_to(ROOT)}")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing source: {SRC}")

    mark = crop_mark(knockout_black(Image.open(SRC)))
    variants: dict[int, Image.Image] = {}
    for size in SIZES:
        variants[size] = scale_mark(mark, size)
        save_png(variants[size], OUT_DIR / f"liend-mark-{size}.png")

    save_png(variants[32], OUT_DIR / "liend-32.png")
    save_png(variants[48], OUT_DIR / "liend-48.png")
    save_png(variants[64], OUT_DIR / "liend-64.png")
    save_png(variants[256], OUT_DIR / "liend-mark.png")
    save_png(variants[256], APP_DIR / "liend-mark.png")
    save_png(variants[512], OUT_DIR / "liend-icon-512.png")
    save_png(on_navy(variants[512]), ROOT / "public" / "assets" / "liend-icon.png")
    save_png(on_navy(variants[128]), ROOT / "app" / "icon.png")
    save_png(on_navy(variants[256]), OUT_DIR / "liend-twitter-native.png")
    save_png(on_navy(variants[256]), OUT_DIR / "liend-card.png")


if __name__ == "__main__":
    main()
