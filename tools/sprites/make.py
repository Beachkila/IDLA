from PIL import Image

P = {
    'K': (24, 22, 30), 'R': (204, 48, 44), 'r': (132, 28, 32), 'L': (240, 110, 96),
    'G': (120, 126, 138), 'g': (72, 76, 88), 'H': (186, 190, 200), 'W': (246, 246, 240),
    'S': (160, 166, 176), 's': (92, 96, 106), 'B': (40, 40, 48), 'b': (70, 70, 80),
    'Y': (240, 196, 64), 'y': (176, 132, 32), 'O': (244, 128, 40), 'o': (184, 80, 24),
    'F': (236, 188, 148), 'f': (196, 140, 104), 'N': (60, 64, 96), 'n': (40, 42, 66),
    'C': (196, 150, 96), 'c': (140, 100, 60), 'T': (224, 184, 120),
}


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def box(self, x0, y0, x1, y1, mid, dark, light):
        self.rect(x0, y0, x1, y1, mid)
        self.rect(x0, y0, x1, y0, light)
        self.rect(x0, y0, x0, y1, light)
        self.rect(x0, y1, x1, y1, dark)
        self.rect(x1, y0, x1, y1, dark)

    def wheel(self, cx, cy, r):
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r + r:
                    self.set(cx + x, cy + y, 'B')
        self.set(cx, cy, 'S')
        if r >= 2:
            self.set(cx - 1, cy - 1, 'b')

    def outline(self):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h and self.px[ny][nx] not in (None, 'K'):
                            add.append((x, y))
                            break
        for x, y in add:
            self.px[y][x] = 'K'

    def image(self, scale=1, bg=None):
        im = Image.new('RGBA', (self.w, self.h), bg or (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c:
                    im.putpixel((x, y), P[c] + (255,))
        return im.resize((self.w * scale, self.h * scale), Image.NEAREST)


def operator(s, x, y):
    """Original warehouse worker, ~13px tall, top-left at (x, y), facing right."""
    s.rect(x + 1, y, x + 4, y + 1, 'Y'); s.rect(x, y + 2, x + 5, y + 2, 'y')   # hard hat
    s.rect(x + 1, y + 3, x + 4, y + 4, 'F'); s.set(x + 4, y + 3, 'K'); s.set(x + 1, y + 4, 'f')
    s.rect(x + 1, y + 5, x + 4, y + 8, 'O'); s.rect(x + 1, y + 7, x + 4, y + 7, 'Y')  # hi-vis vest
    s.rect(x + 4, y + 5, x + 4, y + 8, 'o')
    s.rect(x + 4, y + 6, x + 6, y + 6, 'F')  # arm reaching to tiller
    s.rect(x + 1, y + 9, x + 4, y + 12, 'N'); s.rect(x + 3, y + 9, x + 4, y + 12, 'n')


def side(with_op=False, load=False, w=40, h=24):
    s = Sprite(w, h)
    oy = 0
    # backrest / operator guard
    s.box(1, 6 + oy, 2, 16 + oy, 'G', 'g', 'H')
    # operator platform
    s.box(1, 16 + oy, 8, 17 + oy, 'G', 'g', 'H')
    # drive unit housing
    s.box(8, 6 + oy, 18, 17 + oy, 'R', 'r', 'L')
    s.box(8, 5 + oy, 18, 6 + oy, 'G', 'g', 'H')  # top cover
    s.rect(10, 9 + oy, 16, 9 + oy, 'r')  # panel seam
    s.rect(10, 13 + oy, 12, 14 + oy, 'Y')  # caution label (no logo)
    s.rect(14, 11 + oy, 16, 11 + oy, 'W')  # highlight stripe
    # tiller
    s.rect(9, 1 + oy, 10, 4 + oy, 'g')
    s.box(6, 0 + oy, 11, 1 + oy, 'B', 'B', 'b')
    s.set(11, 0 + oy, 'R')
    # load backrest
    s.box(19, 9 + oy, 20, 18 + oy, 'G', 'g', 'H')
    # forks
    fe = w - 2
    s.rect(19, 17 + oy, fe, 18 + oy, 'S'); s.rect(19, 18 + oy, fe, 18 + oy, 's')
    s.set(fe, 17 + oy, 's')
    # wheels
    s.wheel(13, 19 + oy, 2)
    s.wheel(4, 19 + oy, 1)
    s.wheel(fe - 3, 19 + oy, 1)
    if load:
        px0 = 22
        s.box(px0, 15, fe - 1, 16, 'C', 'c', 'T')  # pallet deck
        for bx in range(px0 + 2, fe - 2, 4):
            s.rect(bx, 16, bx + 1, 16, 'c')
        s.box(px0 + 1, 8, px0 + 7, 14, 'C', 'c', 'T')
        s.box(px0 + 8, 8, fe - 2, 14, 'C', 'c', 'T')
        s.box(px0 + 3, 2, px0 + 11, 7, 'C', 'c', 'T')
        s.rect(px0 + 3, 4, px0 + 11, 4, 'c')
    if with_op:
        operator(s, 2, 3)
        s.box(1, 6, 2, 16, 'G', 'g', 'H')  # guard in front of legs
    s.outline()
    return s


def iso():
    """3/4 overhead, DS RPG overworld style, facing right."""
    s = Sprite(40, 32)
    d = 5  # depth of top face
    def block(x0, y0, x1, y1, top, topd, front, frontd, frontl):
        # top face (oblique, up-right)
        for i in range(d):
            s.rect(x0 + i + 1, y0 - i - 1, x1 + i + 1, y0 - i - 1, top if i else topd)
        # side face (right)
        for i in range(d):
            s.rect(x1 + i + 1, y0 - i, x1 + i + 1, y1 - i, frontd)
        s.box(x0, y0, x1, y1, front, frontd, frontl)
    # forks (two tines seen from above)
    for ty in (0, 3):
        for i in range(2):
            s.rect(20 + i, 22 - ty - i, 37 + i, 22 - ty - i, 'S' if i else 's')
    s.rect(20, 23, 37, 23, 's')
    # load backrest
    block(19, 12, 20, 22, 'H', 'G', 'G', 'g', 'H')
    # drive unit
    block(7, 11, 18, 23, 'H', 'G', 'R', 'r', 'L')
    s.rect(9, 14, 16, 14, 'r'); s.rect(9, 18, 11, 19, 'Y'); s.rect(13, 16, 15, 16, 'W')
    # platform + guard
    block(1, 22, 6, 23, 'H', 'G', 'G', 'g', 'H')
    block(1, 11, 2, 21, 'H', 'G', 'G', 'g', 'H')
    # tiller
    s.rect(10, 1, 11, 6, 'g')
    s.box(7, 0, 13, 1, 'B', 'B', 'b')
    s.wheel(12, 25, 2); s.wheel(4, 25, 1); s.wheel(35, 25, 1)
    s.outline()
    # ground shadow under it, drawn after outline so it stays soft
    for x in range(2, 40):
        for y in (28, 29):
            if s.px[y][x] is None and (x + y) % 2 == 0:
                s.px[y][x] = 'g'
    return s


def floor_bg(w, h):
    im = Image.new('RGBA', (w, h), (148, 152, 150, 255))
    for y in range(h):
        for x in range(w):
            if x % 16 == 0 or y % 16 == 0:
                im.putpixel((x, y), (128, 132, 130, 255))
            elif (x * 7 + y * 13) % 29 == 0:
                im.putpixel((x, y), (160, 164, 162, 255))
    for x in range(w):  # yellow aisle line
        for y in (h - 4, h - 3):
            im.putpixel((x, y), (232, 192, 64, 255))
    return im


opts = {
    'option1_side': side(),
    'option2_rider_load': side(with_op=True, load=True, w=44, h=24),
    'option3_overhead': iso(),
}
SCALE = 10
for name, sp in opts.items():
    sp.image(1).save(f'{name}_1x.png')
    bg = floor_bg(sp.w + 8, sp.h + 8)
    bg.alpha_composite(sp.image(1), (4, 2))
    bg.resize((bg.width * SCALE, bg.height * SCALE), Image.NEAREST).save(f'{name}_preview.png')
print('ok')
