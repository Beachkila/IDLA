import contextlib, io, os
from PIL import Image, ImageDraw, ImageFont

with contextlib.redirect_stdout(io.StringIO()):
    import topanim, anim
from make import Sprite, P

SW_, SH_ = 256, 192
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 8)
FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 7)
INK = (24, 22, 30); PAPER = (246, 244, 236)
UI_BG = (44, 48, 60); UI_LINE = (90, 96, 112); UI_HI = (240, 196, 64)


def txt(d, xy, s, fill=PAPER, font=FONT):
    d.fontmode = '1'
    d.text(xy, s, fill=fill, font=font)


def panel(d, x0, y0, x1, y1, fill=UI_BG):
    d.rectangle((x0, y0, x1, y1), fill=fill, outline=INK)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), outline=UI_LINE)


def bar(d, x, y, w, frac, col):
    d.rectangle((x, y, x + w, y + 5), fill=INK)
    d.rectangle((x + 1, y + 1, x + 1 + int((w - 2) * frac), y + 4), fill=col)


# ---------------- store sections (generic, remappable) ----------------
SECTIONS = [  # name, color, rect on a 120x84 floor-plan grid (top screen map)
    ('BEV', (150, 90, 170), (0, 20, 6, 84)), ('BAKE', (230, 150, 60), (0, 0, 6, 20)),
    ('DAIRY', (120, 190, 210), (6, 0, 44, 6)), ('DELI', (230, 90, 140), (44, 0, 70, 6)),
    ('MEAT', (214, 60, 52), (70, 0, 100, 6)), ('CLEAN', (60, 150, 80), (100, 0, 120, 6)),
    ('PETS', (176, 132, 32), (114, 6, 120, 40)), ('PANTRY', (240, 196, 64), (114, 40, 120, 84)),
]
ISLANDS = [('FROZEN', (150, 200, 240), (20, 22, 30, 52)), ('PRODUCE', (110, 190, 90), (36, 14, 46, 44)),
           ('SPECIAL', (240, 128, 40), (54, 14, 64, 48)), ('HOUSE', (70, 140, 100), (78, 18, 90, 56)),
           ('HOUSE', (70, 140, 100), (96, 18, 106, 56))]


def top_map(d, ox, oy, sc=1.75, player=(70, 62), task_to='DAIRY'):
    def R(r):
        return (ox + r[0] * sc, oy + r[1] * sc, ox + r[2] * sc - 1, oy + r[3] * sc - 1)
    d.rectangle(R((0, 0, 120, 84)), fill=(196, 200, 194), outline=INK)
    for name, col, r in SECTIONS + ISLANDS:
        d.rectangle(R(r), fill=col, outline=INK)
    # registers + entry
    for i in range(4):
        d.rectangle(R((16 + i * 9, 66, 22 + i * 9, 72)), fill=(220, 224, 228), outline=INK)
    d.rectangle(R((100, 82, 112, 84)), fill=(214, 60, 52))
    txt(d, (ox + 100 * sc - 2, oy + 84 * sc - 11), 'IN', INK, FONT_S)
    # route line to the task section
    px, py = ox + player[0] * sc, oy + player[1] * sc
    path = [(px, py), (px, oy + 10 * sc), (ox + 26 * sc, oy + 10 * sc), (ox + 26 * sc, oy + 6 * sc)]
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)))
        for k in range(0, n, 3):
            d.point((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n), fill=INK)
    d.rectangle(R((22, 1, 30, 5)), outline=(255, 255, 255))
    # player + other truck + customers
    d.rectangle((px - 2, py - 2, px + 2, py + 2), fill=(214, 60, 52), outline=INK)
    d.rectangle((ox + 48 * sc - 2, oy + 54 * sc - 2, ox + 48 * sc + 2, oy + 54 * sc + 2), fill=(240, 196, 64), outline=INK)
    for cx, cy in ((30, 58), (50, 10), (108, 30)):
        d.ellipse((ox + cx * sc - 2, oy + cy * sc - 2, ox + cx * sc + 2, oy + cy * sc + 2), fill=(60, 110, 200), outline=INK)


# ---------------- small top-down sprites ----------------
def cart_customer():
    s = Sprite(14, 26)
    s.box(1, 0, 12, 12, 'S', 's', 'H')                 # cart basket (seen from above)
    for x in range(3, 12, 3): s.rect(x, 1, x, 11, 's')
    s.rect(3, 4, 6, 7, 'X'); s.rect(7, 2, 10, 5, 'Y'); s.rect(7, 7, 10, 10, 'Q')  # groceries
    s.rect(1, 13, 12, 13, 'g')                         # handle
    s.rect(3, 14, 10, 19, 'M'); s.rect(3, 14, 3, 19, 'y')  # shopper shirt
    s.rect(4, 19, 9, 23, 'F'); s.rect(4, 22, 9, 24, 'A')   # head from behind
    s.outline()
    return s


def shelf_strip(w, h, seed):
    import random
    rng = random.Random(seed)
    im = Image.new('RGBA', (w, h), (128, 132, 138, 255))
    cols = [(214, 60, 52), (240, 196, 64), (60, 150, 80), (60, 110, 200), (230, 90, 140), (244, 140, 50), (240, 240, 232)]
    y = 2
    while y < h - 4:
        c = rng.choice(cols); sz = rng.choice([3, 4])
        for x in range(2, w - 2, sz + 1):
            for yy in range(y, min(y + sz, h - 2)):
                for xx in range(x, min(x + sz, w - 2)):
                    edge = yy == y + sz - 1 or xx == x + sz - 1
                    im.putpixel((xx, yy), tuple(max(0, v - 45) for v in c) + (255,) if edge else c + (255,))
        y += sz + 1
    return im


# ---------------- MODE 1: driving ----------------
def drive_screens():
    top = Image.new('RGB', (SW_, SH_), UI_BG); d = ImageDraw.Draw(top)
    panel(d, 0, 0, 255, 14, (30, 32, 42))
    txt(d, (4, 3), 'IDLA', UI_HI); txt(d, (40, 3), 'SHIFT 2  MEDIUM'); txt(d, (200, 3), '04:12', UI_HI)
    top_map(d, 4, 20)
    panel(d, 218, 18, 253, 189)
    txt(d, (222, 22), 'TASK', UI_HI, FONT_S)
    txt(d, (222, 32), 'PLT', font=FONT_S); txt(d, (222, 41), '3/8', UI_HI)
    txt(d, (222, 56), 'TO', font=FONT_S); txt(d, (222, 65), 'DAIRY', (120, 190, 210), FONT_S)
    txt(d, (222, 82), 'SCORE', font=FONT_S); txt(d, (222, 91), '2480', UI_HI, FONT_S)
    txt(d, (222, 108), 'ACC', font=FONT_S); txt(d, (222, 117), '96%', (110, 190, 90), FONT_S)
    txt(d, (222, 134), 'BATT', font=FONT_S); bar(d, 222, 144, 28, .72, (110, 190, 90))
    txt(d, (222, 158), 'CARTS', font=FONT_S); txt(d, (222, 167), '3', (60, 110, 200))
    txt(d, (6, 174), 'ROUTE ... DAIRY BAY 2', PAPER, FONT_S)

    bot = Image.new('RGBA', (SW_, SH_), (0, 0, 0, 255))
    # floor
    for y in range(SH_):
        for x in range(SW_):
            c = (204, 206, 200) if (x // 8 + y // 8) % 2 else (190, 194, 188)
            bot.putpixel((x, y), c + (255,))
    # left and right gondolas, cross-aisle at top
    bot.paste(shelf_strip(40, 150, 3), (0, 42)); bot.paste(shelf_strip(40, 150, 9), (216, 42))
    db = ImageDraw.Draw(bot)
    db.rectangle((0, 0, 255, 22), fill=(120, 190, 210)); db.rectangle((0, 22, 255, 24), fill=INK)  # dairy wall
    for x in range(4, 252, 6): db.rectangle((x, 4, x + 3, 18), fill=(240, 240, 232), outline=(90, 140, 160))
    txt(db, (110, 8), 'DAIRY', INK)
    for x in (40, 215):
        db.line((x, 42, x, 191), fill=(88, 92, 98))
    # end-cap section signs
    for x, lab, col in ((2, 'BAKE', (230, 150, 60)), (218, 'FROZ', (150, 200, 240))):
        db.rectangle((x, 30, x + 35, 40), fill=col, outline=INK); txt(db, (x + 4, 31), lab, INK, FONT_S)
    # drop zone marker
    for i in range(0, 40, 4):
        db.line((100 + i, 28, 102 + i, 28), fill=(240, 196, 64)); db.line((100 + i, 34, 102 + i, 34), fill=(240, 196, 64))
    txt(db, (106, 26), 'DROP', (214, 60, 52), FONT_S)
    # player truck + a cart customer
    truck = topanim.build(1).image(1).rotate(180)  # heading up toward dairy
    shadow = Image.new('RGBA', truck.size, (0, 0, 0, 0))
    for y in range(truck.height):
        for x in range(truck.width):
            if truck.getpixel((x, y))[3] and (x + y) % 2 == 0: shadow.putpixel((x, y), (150, 154, 150, 255))
    bot.alpha_composite(shadow, (110, 64)); bot.alpha_composite(truck, (107, 62))
    bot.alpha_composite(cart_customer().image(1), (172, 100))
    # touch buttons
    for i, (lab, col) in enumerate((('MAP', UI_LINE), ('LIFT', (214, 60, 52)), ('HORN', (240, 196, 64)))):
        x = 4 + i * 44
        db.rectangle((x, 172, x + 38, 188), fill=UI_BG, outline=INK); db.rectangle((x + 1, 173, x + 37, 174), fill=col)
        txt(db, (x + 6, 177), lab, PAPER, FONT_S)
    db.rectangle((150, 172, 251, 188), fill=UI_BG, outline=INK)
    txt(db, (154, 177), 'TAIL SWING', PAPER, FONT_S); bar(db, 210, 178, 38, .35, (240, 196, 64))
    return top, bot.convert('RGB')


# ---------------- MODE 2: unloading "battle" ----------------
CASES = [('MILK', (240, 240, 232)), ('YOG', (230, 90, 140)), ('BUTR', (240, 196, 64)), ('CHZ', (244, 140, 50)),
         ('EGGS', (196, 150, 96)), ('OJ', (244, 160, 40)), ('CRM', (120, 190, 210)), ('SOUR', (60, 150, 80))]


def case_icon(d, x, y, w, h, name, col, ghost=False):
    if ghost:
        for i in range(x, x + w, 2):
            d.point((i, y), fill=(160, 166, 176)); d.point((i, y + h), fill=(160, 166, 176))
        for j in range(y, y + h, 2):
            d.point((x, j), fill=(160, 166, 176)); d.point((x + w, j), fill=(160, 166, 176))
        txt(d, (x + 3, y + h // 2 - 4), name, (150, 156, 166), FONT_S)
        return
    d.rectangle((x, y, x + w, y + h), fill=(196, 150, 96), outline=INK)
    d.rectangle((x + 1, y + 1, x + w - 1, y + 1), fill=(224, 184, 120))
    d.rectangle((x + 2, y + 3, x + w - 2, y + 10), fill=col, outline=INK)
    txt(d, (x + 3, y + 3), name, INK, FONT_S)


def battle_screens():
    top = Image.new('RGBA', (SW_, SH_), (0, 0, 0, 255))
    d = ImageDraw.Draw(top)
    # back-wall stage: dairy cooler doors behind the pallet
    d.rectangle((0, 0, 255, 120), fill=(96, 150, 172))
    for x in range(0, 256, 32):
        d.rectangle((x + 2, 8, x + 29, 112), fill=(150, 200, 220), outline=INK)
        d.line((x + 6, 14, x + 6, 104), fill=(220, 240, 248))
    d.rectangle((0, 120, 255, 191), fill=(196, 200, 194)); d.line((0, 120, 255, 120), fill=INK)
    # the pallet as the "enemy" (side-view sprite, scaled 2x)
    sp = anim.frame_sprite(0).image(1).crop((33, 0, 60, 32)).resize((54, 64), Image.NEAREST)
    big = sp.resize((108, 128), Image.NEAREST)
    top.alpha_composite(big, (128, 0))
    d = ImageDraw.Draw(top)
    # HUD
    panel(d, 4, 126, 120, 187)
    txt(d, (9, 130), 'PALLET  DAIRY-07', UI_HI, FONT_S)
    txt(d, (9, 142), 'CASES', font=FONT_S); bar(d, 44, 144, 70, 14 / 24, (214, 60, 52)); txt(d, (9, 152), '14/24', font=FONT_S)
    txt(d, (9, 164), 'TIME', font=FONT_S); bar(d, 44, 166, 70, .55, (110, 190, 90))
    txt(d, (9, 175), 'x6 COMBO', UI_HI, FONT)
    # next-up queue
    panel(d, 4, 4, 112, 52)
    txt(d, (9, 7), 'NEXT UP', UI_HI, FONT_S)
    for i, (n, c) in enumerate(CASES[1:4]):
        case_icon(d, 9 + i * 34, 20, 30, 26, n, c)
    # damage-style popup
    txt(d, (60, 92), '+120 PERFECT', (255, 255, 255))
    txt(d, (59, 91), '+120 PERFECT', UI_HI)

    bot = Image.new('RGB', (SW_, SH_), (44, 48, 60)); db = ImageDraw.Draw(bot)
    txt(db, (6, 3), 'DAIRY BAY 2  -  4FT SECTIONS x3', PAPER, FONT_S)
    # three 4-ft sections, 4 shelves each
    sx0, sy0, secw, shh = 6, 14, 81, 36
    filled = {(0, 0), (0, 1), (1, 0), (2, 0), (0, 2), (1, 2), (2, 1), (0, 3)}
    k = 0
    for sec in range(3):
        x0 = sx0 + sec * (secw + 1)
        db.rectangle((x0, sy0, x0 + secw, sy0 + shh * 4 + 4), fill=(170, 176, 186), outline=INK)
        for shelf in range(4):
            y0 = sy0 + 2 + shelf * shh
            db.rectangle((x0 + 1, y0 + shh - 3, x0 + secw - 1, y0 + shh - 1), fill=(110, 114, 120))
            for slot in range(2):
                n, c = CASES[(sec * 4 + shelf * 2 + slot) % len(CASES)]
                cx = x0 + 3 + slot * 39
                if (sec, shelf) in filled and not (sec == 1 and shelf == 0 and slot == 1):
                    case_icon(db, cx, y0 + 6, 35, 26, n, c)
                else:
                    case_icon(db, cx, y0 + 6, 35, 26, n, c, ghost=True)
    # the case being dragged by the stylus + target highlight
    tx, ty = sx0 + (secw + 1) + 3 + 39, sy0 + 2 + 6
    db.rectangle((tx - 1, ty - 1, tx + 36, ty + 27), outline=(110, 190, 90), width=2)
    case_icon(db, 150, 70, 35, 26, 'OJ', (244, 160, 40))
    db.line((168, 96, 178, 112), fill=INK, width=2)        # stylus
    db.polygon([(176, 108), (182, 116), (179, 106)], fill=(240, 240, 232), outline=INK)
    for i in range(0, 50, 4):                              # drag trail to target
        db.point((150 - i * .3, 70 - i * .9), fill=(240, 196, 64))
    db.rectangle((0, 168, 255, 191), fill=(30, 32, 42))
    txt(db, (6, 175), 'DRAG CASE TO SPOT', UI_HI, FONT_S)
    txt(db, (150, 175), 'GHOSTS: ON (NEW HIRE)', (150, 156, 166), FONT_S)
    return top.convert('RGB'), bot


# ---------------- DS shell ----------------
def ds_frame(top, bot, title, scale=3):
    m, gap = 18, 22
    W = SW_ + 2 * m; H = SH_ * 2 + gap + 2 * m + 14
    im = Image.new('RGB', (W, H), (36, 38, 44))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, W - 3, SH_ + m + 10), 10, fill=(70, 74, 84), outline=INK)
    d.rounded_rectangle((2, SH_ + m + gap - 6, W - 3, H - 3), 10, fill=(70, 74, 84), outline=INK)
    d.rectangle((m - 2, m - 2, m + SW_ + 1, m + SH_ + 1), fill=INK)
    im.paste(top, (m, m))
    by = SH_ + m + gap + 4
    d.rectangle((m - 2, by - 2, m + SW_ + 1, by + SH_ + 1), fill=INK)
    im.paste(bot, (m, by))
    d.fontmode = '1'; d.text((m, 5), title, fill=(200, 204, 214), font=FONT_S)
    return im.resize((W * scale, H * scale), Image.NEAREST)


t, b = drive_screens()
ds_frame(t, b, 'MODE 1  -  DRIVING THE FLOOR').save('idla_preview_driving.png')
t, b = battle_screens()
ds_frame(t, b, 'MODE 2  -  UNLOADING (BATTLE)').save('idla_preview_unloading.png')
print('ok')
