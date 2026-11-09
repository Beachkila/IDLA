"""Make the home-screen icons from the side-view 8210 sprite in src/sprites.json.

Run from the repo root:  python3 tools/make_icons.py
"""
import base64, io, json, random
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
spr = json.loads((root / 'src' / 'sprites.json').read_text())
side = Image.open(io.BytesIO(base64.b64decode(spr['side'].split(',')[1]))).convert('RGBA')

def icon(px):
    # draw at 64 px "pixel art" resolution, then scale up with hard edges
    n = 64
    im = Image.new('RGBA', (n, n), (154, 200, 216, 255))
    d = ImageDraw.Draw(im)
    rng = random.Random(42)
    cols = [(214,60,52),(240,196,64),(60,150,80),(60,110,200),(230,90,140),(244,140,50),(246,246,240),(150,90,170)]
    for y in range(8, 34, 4):
        for x in range(1, n, 4):
            d.rectangle((x, y, x + 2, y + 2), fill=rng.choice(cols))
    d.rectangle((0, 35, n, 36), fill=(128, 132, 138))
    d.rectangle((0, 37, n, n), fill=(196, 200, 194))
    for x in range(0, n, 8):
        d.line((x, 37, x, n), fill=(180, 184, 178))
    im.alpha_composite(side.crop((0, 4, 60, 32)), (2, 22))
    return im.resize((px, px), Image.NEAREST)

out = root / 'icons'
out.mkdir(exist_ok=True)
for size in (192, 512):
    icon(size).save(out / f'icon-{size}.png')
icon(180).convert('RGB').save(out / 'apple-touch-icon.png')
print('icons written')
