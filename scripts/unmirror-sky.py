"""Rebuild mirrored pixel skies from one real half, scaled to full frame."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def from_half(im: Image.Image, keep: str) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    cut = max(2, h // 80)
    if keep == "bottom":
        half = rgb.crop((0, h // 2 + cut, w, h))
    else:
        half = rgb.crop((0, 0, w, h // 2 - cut))
    return half.resize((w, h), Image.Resampling.NEAREST)


def save_still(path: Path, keep: str) -> None:
    from_half(Image.open(path), keep).save(path)
    print(f"wrote {path.name} ({keep})")


def save_gif(path: Path, keep: str) -> None:
    src = Image.open(path)
    frames: list[Image.Image] = []
    durations: list[int] = []
    for index in range(getattr(src, "n_frames", 1)):
        src.seek(index)
        durations.append(int(src.info.get("duration", 80)))
        frames.append(from_half(src, keep))
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        disposal=2,
        loop=src.info.get("loop", 0),
        optimize=False,
    )
    print(f"wrote {path.name} ({keep}, {len(frames)} frames)")


if __name__ == "__main__":
    save_still(ROOT / "public" / "assets" / "webcore-sky.png", "bottom")
    save_gif(ROOT / "public" / "assets" / "loops" / "meadow-sky.gif", "top")
    save_gif(ROOT / "public" / "assets" / "loops" / "rain.gif", "top")
