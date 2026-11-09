from make import Sprite, floor_bg, operator, Image

def line(s, x0, y0, x1, y1, c, thick=1):
    n = max(abs(x1-x0), abs(y1-y0))
    for i in range(n+1):
        x = round(x0 + (x1-x0)*i/n); y = round(y0 + (y1-y0)*i/n)
        for t in range(thick): s.set(x, y+t, c)

def side(ox=0, op=False, load=False, w=40, h=24):
    s = Sprite(w, h)
    # tiller arm angled back from the pivot, two-tone
    line(s, ox+10, 10, ox+3, 3, 'g', 2)
    line(s, ox+10, 10, ox+3, 3, 'G', 1)
    # handle head (contoured grip with red butterfly control)
    s.box(ox+0, 1, ox+5, 3, 'B', 'B', 'b'); s.set(ox+2, 1, 'R'); s.set(ox+3, 1, 'R')
    # compact drive unit
    s.box(ox+8, 10, ox+17, 19, 'R', 'r', 'L')
    s.box(ox+8, 8, ox+17, 10, 'G', 'g', 'H')        # accessory bar / tray on top
    s.rect(ox+9, 13, ox+16, 13, 'r'); s.rect(ox+10, 15, ox+12, 16, 'Y')
    s.rect(ox+13, 11, ox+15, 11, 'W')
    # load backrest + forks
    s.box(ox+18, 12, ox+19, 19, 'G', 'g', 'H')
    fe = w - 2
    s.rect(ox+18, 18, fe, 19, 'S'); s.rect(ox+18, 19, fe, 19, 's'); s.set(fe, 18, 's')
    s.wheel(ox+12, 20, 2); s.wheel(fe-3, 20, 1)
    if load:
        px0 = ox + 21
        s.box(px0, 16, fe-1, 17, 'C', 'c', 'T')
        for bx in range(px0+2, fe-2, 4): s.rect(bx, 17, bx+1, 17, 'c')
        s.box(px0+1, 9, px0+7, 15, 'C', 'c', 'T'); s.box(px0+8, 9, fe-2, 15, 'C', 'c', 'T')
        s.box(px0+3, 3, px0+11, 8, 'C', 'c', 'T'); s.rect(px0+3, 5, px0+11, 5, 'c')
    if op:
        # walking operator behind the truck, hand on the grip
        x, y = ox-8, 2
        s.rect(x+1, y, x+4, y+1, 'Y'); s.rect(x, y+2, x+5, y+2, 'y')
        s.rect(x+1, y+3, x+4, y+5, 'F'); s.set(x+4, y+4, 'K'); s.set(x+1, y+5, 'f')
        s.rect(x+1, y+6, x+4, y+11, 'O'); s.rect(x+1, y+9, x+4, y+9, 'Y'); s.rect(x+4, y+6, x+4, y+11, 'o')
        line(s, x+4, y+7, x+8, y+1, 'F')  # arm up to handle
        # legs mid-stride
        s.rect(x+1, y+12, x+2, y+17, 'n'); s.rect(x+0, y+18, x+2, y+18, 'B')
        s.rect(x+3, y+12, x+4, y+16, 'N'); s.rect(x+5, y+16, x+5, y+17, 'N'); s.rect(x+5, y+18, x+7, y+18, 'B')
    s.outline()
    return s

def topdown():
    s = Sprite(24, 44)
    # tiller arm extends back (up the screen) to the handle
    s.rect(10, 4, 13, 13, 'g'); s.rect(11, 4, 12, 13, 'G')
    s.box(5, 0, 18, 4, 'B', 'B', 'b'); s.rect(10, 1, 13, 2, 'R')
    # drive unit: accessory tray on top, red body front
    s.box(3, 12, 20, 20, 'H', 'G', 'W'); s.rect(5, 14, 18, 18, 'G'); s.rect(5, 18, 18, 18, 'g')
    s.box(3, 20, 20, 26, 'R', 'r', 'L')
    s.rect(5, 22, 18, 22, 'r'); s.rect(5, 24, 8, 25, 'Y'); s.rect(14, 21, 18, 21, 'W')
    s.rect(1, 20, 2, 24, 'B'); s.rect(21, 20, 22, 24, 'B')
    s.box(3, 27, 20, 28, 'G', 'g', 'H')
    for x0 in (4, 15):
        s.box(x0, 29, x0+4, 41, 'S', 's', 'H'); s.rect(x0+1, 41, x0+3, 42, 'B')
    s.outline()
    return s

def preview(sp, name, shadow=False):
    sp.image(1).save(f'{name}_1x.png')
    bg = floor_bg(sp.w + 12, sp.h + 8)
    im = sp.image(1)
    if shadow:
        sh = Image.new('RGBA', bg.size, (0,0,0,0))
        for y in range(sp.h):
            for x in range(sp.w):
                if im.getpixel((x,y))[3]: sh.putpixel((x+8,y+4),(96,100,98,255))
        bg.alpha_composite(sh)
    bg.alpha_composite(im, (6, 2))
    out = bg.resize((bg.width*10, bg.height*10), Image.NEAREST)
    out.save(f'{name}_preview.png'); return out

ims = [preview(side(), '8210_option1_side'),
       preview(side(ox=10, op=True, load=True, w=52, h=24), '8210_option2_walker_load'),
       preview(topdown(), '8210_option3_overhead', shadow=True)]
W = sum(i.width for i in ims) + 40; H = max(i.height for i in ims)
c = Image.new('RGBA', (W, H), (30,30,36,255)); x = 0
for i in ims: c.paste(i, (x, 0)); x += i.width + 20
c.save('8210_all_options.png')
