import contextlib, io, base64, json
from PIL import Image
with contextlib.redirect_stdout(io.StringIO()):
    import topanim, anim, ds_mock
from make import P

def b64(im):
    buf = io.BytesIO(); im.save(buf, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

out = {}
for f in range(4):
    im = topanim.build(f).image(1)
    out[f'tl{f}'] = b64(im)
    # empty truck: drop the pallet rows, draw two fork tines
    e = im.copy()
    for y in range(49, e.height):
        for x in range(e.width):
            e.putpixel((x, y), (0, 0, 0, 0))
    K = P['K'] + (255,); S = P['S'] + (255,); s = P['s'] + (255,); H = P['H'] + (255,)
    for x0 in (5, 19):
        for y in range(48, 74):
            for x in range(x0 - 1, x0 + 6):
                e.putpixel((x, y), K)
        for y in range(48, 73):
            for x in range(x0, x0 + 5):
                e.putpixel((x, y), H if x == x0 else (s if x == x0 + 4 else S))
    out[f'te{f}'] = b64(e)

# carts in 3 shopper colors
base = ds_mock.cart_customer()
for name, (a, b) in {'c0': ('M', 'y'), 'c1': ('Q', 'r'), 'c2': ('Z', 'n')}.items():
    sp = ds_mock.cart_customer()
    for row in sp.px:
        for i, c in enumerate(row):
            if c == 'M': row[i] = a
            elif c == 'y': row[i] = b
    out[name] = b64(sp.image(1))

out['pal'] = b64(anim.frame_sprite(0).image(1).crop((33, 0, 60, 32)))
out['side'] = b64(anim.frame_sprite(0).image(1))
open('sprites.json', 'w').write(json.dumps(out))
print({k: len(v) for k, v in out.items()})
