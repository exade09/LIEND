"""Turn the pixel meadow still into a looping cloud-drift GIF."""
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\Admin\.cursor\projects\d-Larp-Utility\assets"
    r"\c__Users_Admin_AppData_Roaming_Cursor_User_workspaceStorage"
    r"_9a62534098371f684b2621aa65e4281c_images_image-4d221616-d8cc-4543-b03e-ad9184333cf1.png"
)
OUT = Path(r"D:\Larp-Utility\public\assets\loops\meadow.gif")

img = Image.open(SRC).convert("RGB")
w, h = img.size
px = img.load()

horizon = h
for y in range(h - 1, -1, -1):
    greens = 0
    for x in range(0, w, 4):
        r, g, b = px[x, y]
        if g > r + 20 and g > b:
            greens += 1
    if greens < w / 4 / 4:
        horizon = y + 1
        break

print("size", w, h, "horizon", horizon)

sky = img.crop((0, 0, w, horizon))
ground = img.crop((0, horizon, w, h))

FRAMES = 16
SHIFT = w // FRAMES
frames = []
for i in range(FRAMES):
    offset = (i * SHIFT) % w
    rolled = Image.new("RGB", (w, horizon))
    rolled.paste(sky, (-offset, 0))
    rolled.paste(sky, (w - offset, 0))
    frame = Image.new("RGB", (w, h))
    frame.paste(rolled, (0, 0))
    frame.paste(ground, (0, horizon))
    frames.append(frame.convert("P", palette=Image.ADAPTIVE, colors=24))

OUT.parent.mkdir(parents=True, exist_ok=True)
frames[0].save(
    OUT,
    save_all=True,
    append_images=frames[1:],
    duration=140,
    loop=0,
    optimize=True,
    disposal=2,
)
print("saved", OUT, OUT.stat().st_size)
