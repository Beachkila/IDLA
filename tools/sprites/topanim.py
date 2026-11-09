import random
from make import Sprite, P, Image
import anim  # registers the extra colors (navy, brown, hair, labels)

SW, SH = 30, 76
GAP = 10


def build(f):
    s = Sprite(SW, SH)
    bob = 0 if f % 2 == 0 else 1
    # ---- operator, facing the viewer, walking behind the truck ----
    ox, oy = 9, 0 + bob
    # legs (drawn first; the handle and arms overlap them)
    l_len, r_len = [(10, 7), (9, 9), (7, 10), (9, 9)][f % 4]
    s.rect(ox + 2, oy + 14, ox + 4, oy + 14 + l_len, 'P'); s.rect(ox + 2, oy + 15 + l_len, ox + 4, oy + 15 + l_len, 'B')
    s.rect(ox + 7, oy + 14, ox + 9, oy + 14 + r_len, 'p'); s.rect(ox + 7, oy + 15 + r_len, ox + 9, oy + 15 + r_len, 'B')
    s.rect(ox + 2, oy + 13, ox + 9, oy + 14, 'P')
    # torso
    s.box(ox + 1, oy + 7, ox + 10, oy + 13, 'V', 'v', 'U')
    s.rect(ox + 4, oy + 7, ox + 7, oy + 7, 'f')  # collar / neck
    # head: hair on top, face below
    s.rect(ox + 2, oy + 0, ox + 9, oy + 3, 'A'); s.rect(ox + 1, oy + 1, ox + 10, oy + 2, 'A')
    s.rect(ox + 2, oy + 3, ox + 9, oy + 6, 'F'); s.rect(ox + 2, oy + 3, ox + 9, oy + 3, 'A')
    s.set(ox + 4, oy + 4, 'K'); s.set(ox + 7, oy + 4, 'K'); s.rect(ox + 2, oy + 6, ox + 9, oy + 6, 'f')
    s.set(ox + 1, oy + 4, 'F'); s.set(ox + 10, oy + 4, 'F')  # ears
    # arms reaching down to the grip
    s.rect(ox + 0, oy + 8, ox + 0, oy + 17, 'V'); s.rect(ox + 11, oy + 8, ox + 11, oy + 17, 'v')
    s.rect(ox + 0, oy + 18, ox + 0, 16 + GAP, 'F'); s.rect(ox + 11, oy + 18, ox + 11, 16 + GAP, 'F')

    op = s
    s = Sprite(SW, SH)
    # ---- tiller: handle head + arm down to the drive unit ----
    s.box(7, 16, 22, 19, 'B', 'B', 'b'); s.rect(13, 17, 16, 17, 'R')
    s.rect(9, 15, 9, 16, 'F'); s.rect(20, 15, 20, 16, 'F')  # hands on the grip
    s.rect(13, 20, 16, 27, 'g'); s.rect(14, 20, 15, 27, 'G')

    # ---- drive unit: tray on top, red front face ----
    s.box(4, 26, 25, 33, 'H', 'G', 'W'); s.rect(6, 28, 23, 31, 'G'); s.rect(6, 31, 23, 31, 'g')
    s.box(4, 33, 25, 38, 'R', 'r', 'L')
    s.rect(6, 35, 23, 35, 'r'); s.rect(6, 36, 9, 37, 'Y'); s.rect(19, 34, 23, 34, 'W')
    spin = f % 2
    for wx in (2, 26):  # drive wheel peeking out
        s.rect(wx, 33, wx + 1, 37, 'B'); s.set(wx, 34 + spin * 2, 'b')

    # ---- full pallet: box tops, then the front face of the stack ----
    top0, face0, face1 = 39, 47, 62
    s.box(1, top0, 28, face0, 'T', 'C', 'W')
    for x in (10, 19):  # seams between case tops
        s.rect(x, top0 + 1, x, face0 - 1, 'c')
    s.rect(2, top0 + 4, 27, top0 + 4, 'c')
    s.rect(3, top0 + 2, 5, top0 + 2, 'W'); s.rect(21, top0 + 6, 24, top0 + 6, 'W')  # shrink-wrap glints
    s.box(1, face0, 28, face1, 'C', 'c', 'T')
    rows = [(face0 + 1, [9, 9, 8], ['Q', 'X', 'Z']), (face0 + 6, [6, 12, 8], ['M', 'R', 'X']),
            (face0 + 11, [13, 13], ['Z', 'Q'])]
    for ry, widths, labs in rows:
        x = 2
        for w_, lab in zip(widths, labs):
            s.rect(x + w_ - 1, ry, x + w_ - 1, ry + 4, 'c')
            s.rect(x + 1, ry + 1, x + 3, ry + 2, lab)
            x += w_
        s.rect(2, ry + 4, 27, ry + 4, 'c')
    s.box(1, face1, 28, face1 + 2, 'C', 'c', 'T')  # pallet deck
    for x in (3, 13, 24):
        s.rect(x, face1 + 2, x + 2, face1 + 2, 'c')
    # load rollers under the deck
    s.rect(6, face1 + 3, 9, face1 + 3, 'B'); s.rect(20, face1 + 3, 23, face1 + 3, 'B')
    for y in range(SH - GAP - 1, -1, -1):
        for x in range(SW):
            if s.px[y][x]:
                op.px[y + GAP][x] = s.px[y][x]
    # hands stay on the grip after the shift
    op.rect(9, 15 + GAP, 9, 16 + GAP, 'F'); op.rect(20, 15 + GAP, 20, 16 + GAP, 'F')
    op.outline()
    return op


# ---------- top-down grocery aisle (vertical, tiles every 64px) ----------
BW, BH, T = 104, 120, 64
SHELF = 26
rng = random.Random(11)
COLS = [(214, 60, 52), (240, 196, 64), (60, 150, 80), (60, 110, 200), (230, 90, 140),
        (244, 140, 50), (240, 240, 232), (150, 90, 170), (120, 190, 210)]


def shade(c, d):
    return tuple(max(0, min(255, v + d)) for v in c)


def aisle_tile():
    t = Image.new('RGBA', (BW, T))
    for y in range(T):
        for x in range(BW):
            c = (204, 206, 200) if (x // 8 + y // 8) % 2 else (190, 194, 188)
            t.putpixel((x, y), c + (255,))
    def gondola(x0, inner_right):
        # metal frame
        for y in range(T):
            for x in range(x0, x0 + SHELF):
                t.putpixel((x, y), (128, 132, 138, 255))
        # product tops in bays (bay break every 32px)
        for bay in (0, 32):
            y = bay + 2
            while y < bay + 30:
                col = rng.choice(COLS); kind = rng.choice(['can', 'box', 'bottle'])
                h = {'can': 3, 'box': 4, 'bottle': 2}[kind]
                if y + h > bay + 30: break
                for x in range(x0 + 2, x0 + SHELF - 2, h + 1):
                    for yy in range(y, y + h):
                        for xx in range(x, min(x + h, x0 + SHELF - 2)):
                            edge = (yy == y + h - 1) or (xx == x + h - 1)
                            t.putpixel((xx, yy), shade(col, -45 if edge else 0) + (255,))
                    t.putpixel((x, y), shade(col, 60) + (255,))
                y += h + 1
            for x in range(x0, x0 + SHELF):  # bay divider
                t.putpixel((x, bay), (98, 102, 108, 255))
        # shelf lip + price strip facing the aisle
        lip = x0 + SHELF - 1 if inner_right else x0
        for y in range(T):
            t.putpixel((lip, y), (88, 92, 98, 255))
            px = lip - 1 if inner_right else lip + 1
            t.putpixel((px, y), (250, 250, 244, 255) if y % 8 < 5 else (214, 60, 52, 255))
        # cast shadow onto the floor
        sx = x0 + SHELF if inner_right else x0 - 1
        for y in range(T):
            if y % 2: t.putpixel((sx, y), (160, 164, 158, 255))
    gondola(0, True)
    gondola(BW - SHELF, False)
    return t


tile = aisle_tile()
strip = Image.new('RGBA', (BW, BH + T))
for y in range(0, BH + T, T):
    strip.paste(tile, (0, y))

SCALE, STEP = 5, 2
frames = []
for i in range(T // STEP):
    off = (i * STEP) % T
    bg = strip.crop((0, off, BW, off + BH)).copy()   # floor scrolls up: truck heads down
    sp = build(i % 4).image(1)
    px, py = (BW - SW) // 2, 26
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))     # drop shadow
    for y in range(SH):
        for x in range(SW):
            if sp.getpixel((x, y))[3] and (x + y) % 2 == 0:
                sh.putpixel((px + x + 3, py + y + 2), (150, 154, 150, 255))
    bg.alpha_composite(sh)
    bg.alpha_composite(sp, (px, py))
    frames.append(bg.resize((BW * SCALE, BH * SCALE), Image.NEAREST))

frames[0].save('8210_topdown_aisle.gif', save_all=True, append_images=frames[1:], duration=120, loop=0, disposal=2)
frames[0].save('topdown_still.png')
sheet = Image.new('RGBA', (SW * 4, SH))
for f in range(4):
    sheet.alpha_composite(build(f).image(1), (SW * f, 0))
sheet.save('8210_topdown_spritesheet_1x.png')
sheet.resize((sheet.width * 6, sheet.height * 6), Image.NEAREST).save('check_top_sheet.png')
tile.save('grocery_aisle_topdown_tile_1x.png')
print('done')
