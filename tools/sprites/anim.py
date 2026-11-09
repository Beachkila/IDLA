import random
from make import Sprite, P, Image
from walkie import line

P.update({
    'P': (122, 82, 48), 'p': (86, 56, 32),          # brown pants
    'V': (40, 52, 104), 'v': (26, 34, 70), 'U': (64, 80, 140),  # navy shirt
    'A': (70, 44, 30),                               # hair
    'X': (60, 150, 80), 'Z': (60, 110, 200), 'Q': (230, 90, 140), 'M': (250, 220, 90),
})

DY = 8  # vertical room above the truck for the full pallet
W, H = 60, 32


def truck(s, ox, f):
    y = lambda v: v + DY
    line(s, ox + 10, y(10), ox + 3, y(3), 'g', 2)
    line(s, ox + 10, y(10), ox + 3, y(3), 'G', 1)
    s.box(ox, y(1), ox + 5, y(3), 'B', 'B', 'b'); s.set(ox + 2, y(1), 'R'); s.set(ox + 3, y(1), 'R')
    s.box(ox + 8, y(10), ox + 17, y(19), 'R', 'r', 'L')
    s.box(ox + 8, y(8), ox + 17, y(10), 'G', 'g', 'H')
    s.rect(ox + 9, y(13), ox + 16, y(13), 'r'); s.rect(ox + 10, y(15), ox + 12, y(16), 'Y')
    s.rect(ox + 13, y(11), ox + 15, y(11), 'W')
    s.box(ox + 18, y(12), ox + 19, y(19), 'G', 'g', 'H')
    fe = W - 2
    s.rect(ox + 18, y(18), fe, y(19), 'S'); s.rect(ox + 18, y(19), fe, y(19), 's'); s.set(fe, y(18), 's')
    # wheels with a rotating spoke highlight
    spin2 = [(0, -1), (1, 0), (0, 1), (-1, 0)][f % 4]
    s.wheel(ox + 12, y(20), 2); s.set(ox + 12 - 1, y(20) - 1, 'B'); s.set(ox + 12 + spin2[0], y(20) + spin2[1], 'b')
    s.wheel(fe - 3, y(20), 1); s.set(fe - 3 + spin2[0], y(20) + spin2[1], 'b'); s.set(fe - 3, y(20), 'S')
    return fe


def pallet(s, x0, fe):
    deck = 16 + DY
    s.box(x0, deck, fe - 1, deck + 1, 'C', 'c', 'T')
    for bx in range(x0 + 2, fe - 2, 4):
        s.rect(bx, deck + 1, bx + 1, deck + 1, 'c')
    top = 1
    # rows of mixed grocery cases, filling the pallet to the top
    rows = [  # (height, [widths], label colors)
        (6, [7, 6, 7], ['X', 'Z', 'Q']),
        (5, [5, 9, 6], ['M', 'R', 'X']),
        (6, [10, 10], ['Z', 'Q']),
        (6, [6, 7, 7], ['R', 'M', 'Z']),
    ]
    y1 = deck - 1
    for hgt, widths, labels in rows:
        y0 = max(top, y1 - hgt + 1)
        x = x0 + 1
        for w_, lab in zip(widths, labels):
            xe = fe - 2 if w_ == widths[-1] and lab == labels[-1] else min(x + w_ - 1, fe - 2)
            s.box(x, y0, xe, y1, 'C', 'c', 'T')
            s.rect(x + 1, y0 + 2, min(x + 2, xe - 1), y0 + 2, lab)  # printed label
            s.rect(x + 1, y0 + 3, min(x + 3, xe - 1), y0 + 3, lab)
            x = xe + 1
        y1 = y0 - 1
    # shrink-wrap glints
    for yy in range(top + 3, deck - 2, 6):
        s.set(fe - 3, yy, 'W')


def worker(s, x, f):
    bob = 0 if f % 2 == 0 else -1
    y = 2 + DY + bob
    # hair + face (no hat)
    s.rect(x + 2, y, x + 4, y, 'A'); s.rect(x + 1, y + 1, x + 4, y + 1, 'A'); s.rect(x + 1, y + 2, x + 1, y + 3, 'A')
    s.rect(x + 2, y + 2, x + 4, y + 4, 'F'); s.set(x + 4, y + 3, 'K'); s.set(x + 2, y + 4, 'f')
    s.rect(x + 2, y + 5, x + 3, y + 5, 'f')  # neck
    # navy shirt
    s.rect(x + 1, y + 6, x + 4, y + 11, 'V'); s.rect(x + 4, y + 6, x + 4, y + 11, 'v'); s.rect(x + 2, y + 6, x + 2, y + 9, 'U')
    # arm to the grip (sleeve then hand)
    gx, gy = x + 12, 1 + DY
    line(s, x + 5, y + 7, x + 7, y + 6, 'V')
    line(s, x + 8, y + 5, gx, gy + 2, 'F')
    # brown pants, 4-frame walk cycle
    hip = y + 12
    back, front = [(-2, 3), (0, 1), (3, -2), (1, 0)][f % 4]
    floor = 19 + DY
    for dxf, col in ((back, 'p'), (front, 'P')):
        line(s, x + 2, hip, x + 2 + dxf, floor - 1, col)
        line(s, x + 3, hip, x + 3 + dxf, floor - 1, col)
        s.rect(x + 2 + dxf, floor, x + 4 + dxf, floor, 'B')
    s.rect(x + 1, hip, x + 4, hip, 'P')


def frame_sprite(f):
    s = Sprite(W, H)
    ox = 13
    fe = truck(s, ox, f)
    pallet(s, ox + 21, fe)
    worker(s, ox - 12, f)
    s.outline()
    return s


# ---------- grocery aisle background (tiles every 64px so the scroll loops) ----------
BGW, BGH, TILE = 120, 64, 64
rng = random.Random(7)
PRODUCT_COLS = [(214, 60, 52), (240, 196, 64), (60, 150, 80), (60, 110, 200), (230, 90, 140),
                (244, 140, 50), (240, 240, 232), (150, 90, 170), (120, 190, 210)]


def make_shelf_tile():
    t = Image.new('RGBA', (TILE, BGH), (226, 222, 210, 255))  # back wall
    for x in range(TILE):  # ceiling + light strip
        for y in range(0, 4): t.putpixel((x, y), (200, 196, 186, 255))
        if 8 <= x % 32 <= 24: t.putpixel((x, 2), (255, 252, 230, 255))
    shelf_y = [14, 24, 34, 44]
    for x in range(TILE):
        for sy in shelf_y:
            t.putpixel((x, sy), (150, 154, 160, 255)); t.putpixel((x, sy + 1), (110, 114, 120, 255))
    for ux in (0, 1, 32, 33):  # uprights
        for y in range(6, 47): t.putpixel((ux, y), (120, 124, 130, 255))
    for top, bot in ((6, 13), (16, 23), (26, 33), (36, 43)):
        x = 3
        while x < TILE - 3:
            if x in range(30, 35): x += 1; continue
            kind = rng.choice(['box', 'can', 'bottle'])
            col = rng.choice(PRODUCT_COLS)
            dark = tuple(max(0, c - 50) for c in col)
            w = {'box': 4, 'can': 3, 'bottle': 2}[kind]
            h = {'box': rng.randint(5, 7), 'can': 4, 'bottle': rng.randint(6, 7)}[kind]
            for i in range(rng.randint(2, 4)):
                if x + w >= TILE - 2 or (x <= 33 and x + w >= 30): break
                for yy in range(bot - h + 1, bot + 1):
                    for xx in range(x, x + w):
                        c = dark if xx == x + w - 1 else col
                        if kind == 'bottle' and yy < bot - h + 3 and xx != x: continue
                        t.putpixel((xx, yy), c + (255,))
                t.putpixel((x, bot - h + 2), (255, 255, 255, 255))  # label glint
                x += w + 1
            x += 1
    for x in range(TILE):  # floor
        for y in range(47, BGH):
            c = (196, 200, 198) if (x // 8 + y // 8) % 2 else (184, 188, 186)
            t.putpixel((x, y), c + (255,))
        t.putpixel((x, 47), (90, 92, 96, 255))  # kick plate
        t.putpixel((x, 48), (120, 122, 126, 255))
    return t


tile = make_shelf_tile()
strip = Image.new('RGBA', (BGW + TILE, BGH))
for x in range(0, BGW + TILE, TILE):
    strip.paste(tile, (x, 0))

SCALE = 6
STEP = 2
frames = []
n = TILE // STEP
for i in range(n):
    off = (i * STEP) % TILE
    bg = strip.crop((off, 0, off + BGW, BGH)).copy()
    sp = frame_sprite(i % 4).image(1)
    # soft shadow
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    bx, by = 28, BGH - H - 3
    for x in range(W):
        for yy in (H - 2, H - 1):
            if sp.getpixel((x, H - 3))[3] and (x + yy) % 2: sh.putpixel((bx + x, by + yy + 1), (150, 154, 152, 255))
    bg.alpha_composite(sh)
    bg.alpha_composite(sp, (bx, by))
    frames.append(bg.resize((BGW * SCALE, BGH * SCALE), Image.NEAREST))

frames[0].save('8210_walker_aisle.gif', save_all=True, append_images=frames[1:], duration=120, loop=0, disposal=2)
frames[0].save('8210_walker_aisle_still.png')

# 4-frame sprite sheet at game size, transparent
sheet = Image.new('RGBA', (W * 4, H))
for f in range(4):
    sheet.alpha_composite(frame_sprite(f).image(1), (W * f, 0))
sheet.save('8210_walker_spritesheet_1x.png')
sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save('check_sheet.png')
strip.crop((0, 0, TILE, BGH)).save('grocery_aisle_tile_1x.png')
print(len(frames), 'frames')
