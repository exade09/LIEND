"""Knock solid black out of the pixel droplet so store tiles can use a transparent mark."""

from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Admin\.cursor\projects\d-Larp-Utility\assets"
    r"\c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_9a62534098371f684b2621aa65e4281c_images_image-abe4dc1f-6146-49f0-a7f5-37929029f4c6.png"
)
OUT_DIR = Path("tmp/cws-promo")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def punch(src: Path, dest: Path) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Keep the nested hole (near-black interior) only when neighbours are coloured.
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if luma < 14 and max(r, g, b) < 22:
                pixels[x, y] = (r, g, b, 0)
    img.save(dest)


if __name__ == "__main__":
    rgb = Image.open(SRC).convert("RGBA")
    rgb.save(OUT_DIR / "logo-source.png")
    punch(SRC, OUT_DIR / "logo-clear.png")
    print("wrote", OUT_DIR / "logo-clear.png")
