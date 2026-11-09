"""Build sprites for every playable character (top-down truck frames, pull frames, side view, portraits)."""
import contextlib, io, base64, json
from PIL import Image
import make
from make import P, Sprite
with contextlib.redirect_stdout(io.StringIO()):
    import topanim, anim

BASE = {k: P[k] for k in 'AVvUPp'}
P['J'] = (140, 186, 232); P['j'] = (96, 140, 196)          # light denim
CHARS = {
    '':   dict(A=(70, 44, 30), V=(40, 52, 104), v=(26, 34, 70), U=(64, 80, 140), P=(122, 82, 48), p=(86, 56, 32), female=False),
    'f_': dict(A=(26, 24, 32), V=(30, 54, 132), v=(20, 36, 92), U=(52, 82, 168), P=(120, 160, 212), p=(84, 120, 172), female=True),
}
CTX = {}
_orig_outline = Sprite.outline


def hooked_outline(self):
    c = CTX.get('char')
    if c and c['female']:
        f = CTX['frame']
        if CTX['view'] == 'top':
            ox, oy = 9, (0 if f % 2 == 0 else 1)
            for sx in (ox + 3, ox + 8):                       # overall straps
                self.rect(sx, oy + 7, sx, oy + 9, 'J')
            self.rect(ox + 3, oy + 10, ox + 8, oy + 13, 'J')   # overall bib
            self.rect(ox + 3, oy + 13, ox + 8, oy + 13, 'j'); self.set(ox + 5, oy + 11, 'j'); self.set(ox + 6, oy + 11, 'j')
            self.rect(ox + 11, oy + 2, ox + 12, oy + 6, 'A')  # ponytail peeking past the ear
            self.set(ox + 12, oy + 7, 'A'); self.set(ox + 11, oy + 2, 'J')
        elif CTX['view'] == 'side':
            x, y = 1, 2 + anim.DY + (0 if f % 2 == 0 else -1)
            self.rect(x + 3, y + 6, x + 3, y + 7, 'J')        # overall strap
            self.rect(x + 2, y + 8, x + 4, y + 11, 'J'); self.rect(x + 4, y + 8, x + 4, y + 11, 'j')  # bib
            self.set(x + 0, y + 1, 'J')                       # hair tie
            self.rect(x + 0, y + 2, x + 0, y + 5, 'A'); self.rect(x - 1, y + 3, x - 1, y + 6, 'A')
    _orig_outline(self)


Sprite.outline = hooked_outline


def b64(im):
    buf = io.BytesIO(); im.save(buf, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def set_char(c):
    for k in 'AVvUPp': P[k] = c[k]


def empty_from(im):
    e = im.copy()
    for y in range(49, e.height):
        for x in range(e.width): e.putpixel((x, y), (0, 0, 0, 0))
    K = P['K'] + (255,); S = P['S'] + (255,); s = P['s'] + (255,); H = P['H'] + (255,)
    for x0 in (5, 19):
        for y in range(48, 74):
            for x in range(x0 - 1, x0 + 6): e.putpixel((x, y), K)
        for y in range(48, 73):
            for x in range(x0, x0 + 5): e.putpixel((x, y), H if x == x0 else (s if x == x0 + 4 else S))
    return e


def pull_from(im, c, f):
    """Back-of-head version: face pixels become hair; the ponytail hangs down the back."""
    im = im.copy(); bob = 0 if f % 2 == 0 else 1
    skin = {P['F'], P['f'], P['K']}
    hair = c['A']; hair2 = tuple(min(255, v + 26) for v in hair)
    for y in range(3 + bob, 7 + bob):
        for x in range(11, 19):
            if im.getpixel((x, y))[:3] in skin:
                im.putpixel((x, y), (hair2 if (x + y) % 3 == 0 else hair) + (255,))
    if c['female']:
        for y in range(7 + bob, 13 + bob):
            for x in (14, 15):
                im.putpixel((x, y), hair + (255,))
        im.putpixel((14, 6 + bob), P['J'] + (255,)); im.putpixel((15, 6 + bob), P['J'] + (255,))
        # cover the ear-side tuft from the front view (it's behind her now)
    return im


def portrait(c, blink=False):
    s = Sprite(20, 36)
    fem = c['female']
    # legs + shoes
    s.box(5, 22, 9, 31, 'P', 'p', 'P'); s.box(10, 22, 14, 31, 'P', 'p', 'P')
    s.rect(9, 24, 10, 31, 'p')
    s.rect(4, 32, 9, 33, 'B'); s.rect(10, 32, 15, 33, 'B')
    # torso + sleeves
    s.box(4, 12, 15, 21, 'V', 'v', 'U')
    s.box(2, 12, 3, 17, 'V', 'v', 'U'); s.box(16, 12, 17, 17, 'V', 'v', 'U')
    s.rect(2, 18, 3, 21, 'F'); s.rect(16, 18, 17, 21, 'F'); s.set(3, 21, 'f'); s.set(17, 21, 'f')
    s.rect(8, 11, 11, 12, 'f')   # neck
    if fem:
        for x in (6, 13):                                          # overall straps + buckles
            s.rect(x, 12, x, 15, 'J'); s.set(x, 15, 'H')
        s.box(6, 15, 13, 23, 'J', 'j', 'J')                        # bib
        s.rect(8, 17, 11, 19, 'j'); s.rect(8, 17, 11, 17, 'J')     # bib pocket
        s.rect(5, 21, 14, 23, 'J'); s.rect(5, 23, 14, 23, 'j')
    else:
        s.rect(4, 21, 15, 21, 'p')   # belt
    # head
    s.rect(5, 3, 14, 10, 'F'); s.rect(5, 10, 14, 10, 'f')
    s.set(4, 6, 'F'); s.set(15, 6, 'F')
    if blink:
        s.rect(7, 6, 8, 6, 'f'); s.rect(11, 6, 12, 6, 'f')
    else:
        s.set(7, 6, 'K'); s.set(12, 6, 'K'); s.set(7, 5, 'W'); s.set(12, 5, 'W')
    s.rect(9, 8, 10, 8, 'f')
    s.rect(5, 0, 14, 2, 'A'); s.rect(4, 1, 15, 4, 'A'); s.rect(6, 3, 13, 3, 'A')
    if fem:
        s.rect(4, 5, 4, 7, 'A'); s.rect(15, 5, 15, 7, 'A')     # side hair
        s.set(15, 1, 'J'); s.set(16, 1, 'J')                      # tie
        s.rect(16, 2, 17, 8, 'A'); s.rect(17, 9, 17, 11, 'A')   # ponytail
        s.set(16, 3, 'U')
    else:
        s.rect(4, 3, 4, 4, 'A'); s.rect(15, 3, 15, 4, 'A')
    s.outline()
    return s.image(1)


d = json.load(open('sprites.json'))
for pre, c in CHARS.items():
    set_char(c)
    CTX.update(char=c)
    for f in range(4):
        CTX.update(view='top', frame=f)
        im = topanim.build(f).image(1)
        e = empty_from(im)
        d[f'{pre}tl{f}'] = b64(im); d[f'{pre}te{f}'] = b64(e)
        d[f'{pre}tlp{f}'] = b64(pull_from(im, c, f)); d[f'{pre}tep{f}'] = b64(pull_from(e, c, f))
    CTX.update(view='side', frame=0)
    d[f'{pre}side'] = b64(anim.frame_sprite(0).image(1))
    i = '1' if c['female'] else '0'
    CTX.update(view='por')
    d[f'por{i}a'] = b64(portrait(c)); d[f'por{i}b'] = b64(portrait(c, blink=True))
set_char(CHARS[''])
json.dump(d, open('sprites.json', 'w'))

# preview sheet
def L(k): return Image.open(io.BytesIO(base64.b64decode(d[k].split(',')[1]))).convert('RGBA')
keys = ['por0a', 'por1a', 'tl0', 'f_tl0', 'tlp1', 'f_tlp1', 'side', 'f_side']
ims = [L(k) for k in keys]
W = sum(i.width for i in ims) + 8 * len(ims); H = max(i.height for i in ims)
sheet = Image.new('RGBA', (W, H), (190, 194, 188, 255)); x = 0
for im in ims: sheet.alpha_composite(im, (x, 0)); x += im.width + 8
sheet.resize((W * 5, H * 5), Image.NEAREST).save('/tmp/chars.png')
print('ok')
