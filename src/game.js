'use strict';
// ============================================================
// IDLA — shelf stocker prototype (two-screen DS layout)
// World units are feet. Store is 120 x 94 ft.
// ============================================================
const SPR = __SPRITES__;

// ---------- config + per-phone storage ----------
const CFG = window.IDLA_CONFIG || {};
const API = String(CFG.scoreApi || '').replace(/\/+$/, '');
function store(k, v) {
  try {
    if (v === undefined) { const s = localStorage.getItem('idla.' + k); return s === null ? null : JSON.parse(s); }
    localStorage.setItem('idla.' + k, JSON.stringify(v));
  } catch (e) { return null; }
}
let DEVICE = store('device');
if (!DEVICE) { DEVICE = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2); store('device', DEVICE); }
const todayUTC = () => new Date().toISOString().slice(0, 10);

// ---------- canvases ----------
const topC = document.getElementById('top'), botC = document.getElementById('bot');
const T = topC.getContext('2d'), B = botC.getContext('2d');
T.imageSmoothingEnabled = false; B.imageSmoothingEnabled = false;
const SW = 256, SH = 192;

// ---------- 3x5 pixel font ----------
const GL = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
  F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
  K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
  P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
  Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
  '4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111',
  '9':'111101111001110','-':'000000111000000','+':'000010111010000','.':'000000000000010',':':'000010000010000',
  '/':'001001010100100','%':'101001010100101','!':'010010010000010','?':'110001010000010','&':'010101010101011',
  '>':'100010001010100','<':'001010100010001','(':'010100100100010',')':'010001001001010',"'":'010010000000000',
  '*':'000101010101000',',':'000000000010100'
};
function text(ctx, s, x, y, col, sc = 1) {
  s = String(s).toUpperCase(); ctx.fillStyle = col; let cx = x;
  for (const ch of s) {
    const g = GL[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc);
    cx += 4 * sc;
  }
}
const tw = (s, sc = 1) => String(s).length * 4 * sc - sc;
function textC(ctx, s, cx, y, col, sc = 1) { text(ctx, s, Math.round(cx - tw(s, sc) / 2), y, col, sc); }

// ---------- palette ----------
const INK = '#18161e', PAPER = '#f6f4ec', UI = '#2c303c', UI2 = '#1e2028', LINE = '#5a6070', HI = '#f0c440',
  GOOD = '#6ebe5a', BAD = '#d63c34', MUTE = '#969ca6', FLOOR1 = '#cccec8', FLOOR2 = '#bec2bc';

// ---------- store data ----------
const AC = { PRODUCE:'#965aaa', BAKERY:'#3c78d2', CHOC:'#40c8c8', CHEESE:'#aa9c78', BEEF:'#b0463c', CHICKEN:'#e2be46',
  DAIRY:'#f08c32', FROZEN:'#96d2f0', CRACKERS:'#d2a05a', CHIPS:'#f0c440', SPECIAL:'#d63c34', DRY:'#b07846',
  CANNED:'#96a0aa', CEREAL:'#e67896', JUICE:'#fa9632', CONDIM:'#c8463c', BABY:'#a0c8e6', PAPER:'#ebebe1', BAKING:'#dcbe96' };
const ANAME = { PRODUCE:'PRODUCE', BAKERY:'BAKERY', CHOC:'CHOCOLATES', CHEESE:'CHEESES', BEEF:'BEEF', CHICKEN:'CHICKEN',
  DAIRY:'DAIRY', FROZEN:'FROZEN', CRACKERS:'CRACKERS', CHIPS:'CHIPS', SPECIAL:'SPECIAL BUYS', DRY:'DRY FOOD',
  CANNED:'CANNED GOODS', CEREAL:'CEREAL', JUICE:'JUICES', CONDIM:'CONDIMENTS', BABY:'BABY+TOILETRY', PAPER:'PAPER GOODS', BAKING:'BAKING' };
const PRODUCTS = {
  PRODUCE:['APPLES','BANANA','ONIONS','LETTUC','TOMATO','CARROT','LEMONS','GRAPES'],
  BAKERY:['BREAD','BAGELS','MUFFIN','ROLLS','DONUTS','CROISS','CAKE','PIES'],
  CHOC:['BARS','TRUFFL','MINTS','CARAML','DARK','HAZEL','WAFERS','KISSES'],
  CHEESE:['CHEDDR','SWISS','BRIE','MOZZ','GOUDA','FETA','PARM','JACK'],
  BEEF:['GRND B','STEAK','ROAST','RIBS','BRISKT','STEW','SIRLN','CHUCK'],
  CHICKEN:['BREAST','THIGHS','WINGS','DRUMS','WHOLE','TENDER','GRND C','SAUSG'],
  DAIRY:['MILK','YOGURT','BUTTER','EGGS','CREAM','SOUR C','KEFIR','COTTAG'],
  FROZEN:['PIZZA','PEAS','FRIES','ICECRM','WAFFLE','BURRTO','BERRY','DINNER'],
  CRACKERS:['SALTIN','WHEAT','CHEESY','GRAHAM','BUTTRY','RICE C','SEEDED','ROUNDS'],
  CHIPS:['POTATO','BBQ','TORTL','CORN C','PRETZ','PUFFS','POPCRN','SALSA'],
  SPECIAL:['TOOLS','TOYS','GRILL','LAMPS','BIKES','PLANTS','PILLOW','MUGS'],
  DRY:['PASTA','RICE','BEANS','OATS','LENTIL','QUINOA','NOODLE','COUSC'],
  CANNED:['SOUP','TUNA','CHILI','PEACH','CORN','GRN BN','SPAM','BROTH'],
  CEREAL:['FLAKES','OAT O','GRANOL','BRAN','RINGS','CRISP','MUESLI','PUFF C'],
  JUICE:['APPLE','ORANGE','GRAPE','CRANB','LEMONA','TOM J','PUNCH','MANGO'],
  CONDIM:['KETCHP','MUSTRD','MAYO','RELISH','HOT SC','BBQ SC','SOY SC','RANCH'],
  BABY:['DIAPER','WIPES','FORMUL','SOAP','SHAMPO','TPASTE','LOTION','RAZORS'],
  PAPER:['TOWELS','TISSUE','TP','NAPKIN','PLATES','CUPS','FOIL','BAGS'],
  BAKING:['FLOUR','SUGAR','YEAST','B SODA','VANILA','CHOC C','CAKE M','SALT'],
};
// product art: shape, main color, accent color (letters map to PCOL)
const PCOL = { R:'#d63c34', O:'#f48c32', Y:'#f0c440', G:'#3c9650', L:'#8cd25a', B:'#3c6ec8', C:'#78bed2', P:'#965aaa',
  M:'#e65a8c', W:'#f6f6f0', E:'#ecd2a8', T:'#d2a05a', K:'#a8703c', D:'#5c3a24', N:'#2c3c78', S:'#b4bac4', A:'#3a3a44', F:'#f0a0a0' };
const ART = {
  APPLES:'fruit R G', BANANA:'banana Y D', ONIONS:'fruit E K', LETTUC:'leafy L G', TOMATO:'fruit R G', CARROT:'carrot O G', LEMONS:'fruit Y G', GRAPES:'grapes P G',
  BREAD:'loaf T K', BAGELS:'ring T K', MUFFIN:'muffin K C', ROLLS:'loaf E T', DONUTS:'ring T M', CROISS:'crescent T K', CAKE:'cake W M', PIES:'pie T S',
  BARS:'bar D R', TRUFFL:'box D Y', MINTS:'tin C W', CARAML:'bar K Y', DARK:'bar A D', HAZEL:'jar D K', WAFERS:'box T R', KISSES:'bag S D',
  CHEDDR:'wedge O Y', SWISS:'wedge Y E', BRIE:'wheel W E', MOZZ:'ball W G', GOUDA:'wheel Y R', FETA:'tub W B', PARM:'wedge E Y', JACK:'wedge W Y',
  'GRND B':'tray R M', STEAK:'tray R W', ROAST:'tray D R', RIBS:'tray R K', BRISKT:'tray K R', STEW:'tray R O', SIRLN:'tray M R', CHUCK:'tray D Y',
  BREAST:'tray F Y', THIGHS:'tray F O', WINGS:'tray F R', DRUMS:'tray F K', WHOLE:'bag F Y', TENDER:'tray F G', 'GRND C':'tray F M', SAUSG:'tray K R',
  MILK:'jug W B', YOGURT:'tub W M', BUTTER:'flatbox Y W', EGGS:'eggs E W', CREAM:'carton W C', 'SOUR C':'tub W G', KEFIR:'bottle W P', COTTAG:'tub W B',
  PIZZA:'flatbox R Y', PEAS:'bag G L', FRIES:'bag Y R', ICECRM:'tub M W', WAFFLE:'flatbox Y K', BURRTO:'flatbox O K', BERRY:'bag P M', DINNER:'flatbox N O',
  SALTIN:'box W R', WHEAT:'box K Y', CHEESY:'box O R', GRAHAM:'box T B', BUTTRY:'box Y R', 'RICE C':'bag W G', SEEDED:'box D G', ROUNDS:'box R Y',
  POTATO:'bag Y R', BBQ:'bag R K', TORTL:'bag O G', 'CORN C':'bag Y B', PRETZ:'bag K B', PUFFS:'bag O Y', POPCRN:'bag W R', SALSA:'jar R G',
  TOOLS:'toolbox R S', TOYS:'box B Y', GRILL:'grill A S', LAMPS:'lamp Y S', BIKES:'bike B A', PLANTS:'plant G K', PILLOW:'pillow W C', MUGS:'mug C W',
  PASTA:'box B Y', RICE:'bag W R', BEANS:'bag K R', OATS:'can T R', LENTIL:'bag O G', QUINOA:'bag E G', NOODLE:'box O R', COUSC:'box Y B',
  SOUP:'can R W', TUNA:'tin B Y', CHILI:'can R K', PEACH:'can O Y', CORN:'can Y G', 'GRN BN':'can G W', SPAM:'tin N Y', BROTH:'carton Y R',
  FLAKES:'box B Y', 'OAT O':'box Y R', GRANOL:'box K G', BRAN:'box D O', RINGS:'box R Y', CRISP:'box C R', MUESLI:'box E G', 'PUFF C':'box M Y',
  APPLE:'jug Y R', ORANGE:'carton O G', GRAPE:'bottle P G', CRANB:'bottle R W', LEMONA:'bottle Y G', 'TOM J':'can R G', PUNCH:'jug M R', MANGO:'carton O Y',
  KETCHP:'squeeze R W', MUSTRD:'squeeze Y W', MAYO:'jar W B', RELISH:'jar G W', 'HOT SC':'bottle R O', 'BBQ SC':'bottle K R', 'SOY SC':'bottle D R', RANCH:'bottle W G',
  DIAPER:'bag C W', WIPES:'flatbox W C', FORMUL:'can W B', SOAP:'pump M W', SHAMPO:'bottle C W', TPASTE:'tube W R', LOTION:'pump E C', RAZORS:'box N S',
  TOWELS:'roll W B', TISSUE:'tissue B W', TP:'roll W C', NAPKIN:'flatbox W G', PLATES:'plates W R', CUPS:'cups R W', FOIL:'box S B', BAGS:'box Y G',
  FLOUR:'bag W B', SUGAR:'bag W M', YEAST:'tin Y K', 'B SODA':'box O Y', VANILA:'bottle D W', 'CHOC C':'bag D K', 'CAKE M':'box M Y', SALT:'can B W',
};
const ICONS = {};
function shadeHex(h, k) {
  const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, v + k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function productIcon(name) {
  if (ICONS[name]) return ICONS[name];
  const [shape, a, b] = (ART[name] || 'box S B').split(' ');
  const c1 = PCOL[a], c2 = PCOL[b], W_ = PCOL.W, CAP = '#e6e8ec', STEM = '#6e4a2c';
  const N = 14, g = [...Array(N)].map(() => Array(N).fill(null));
  const S = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < N && y >= 0 && y < N) g[y][x] = c; };
  const R = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) S(x, y, c); };
  const O = (cx, cy, r, c) => { for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r * r + r * .6) S(cx + x, cy + y, c); };
  switch (shape) {
    case 'can': R(3, 2, 10, 12, c1); R(3, 5, 10, 9, c2); R(4, 1, 9, 1, CAP); R(3, 2, 10, 2, CAP); break;
    case 'tin': R(2, 5, 11, 11, c1); R(2, 7, 11, 9, c2); R(3, 4, 10, 4, CAP); break;
    case 'bottle': R(6, 0, 7, 1, c2); R(5, 2, 8, 3, c1); R(4, 4, 9, 12, c1); R(3, 5, 10, 12, c1); R(4, 7, 9, 10, c2); break;
    case 'pump': R(5, 0, 8, 0, A_(c2)); R(6, 1, 6, 3, CAP); R(4, 4, 9, 12, c1); R(3, 5, 10, 12, c1); R(4, 7, 9, 10, c2); break;
    case 'squeeze': R(6, 0, 7, 0, c2); R(5, 1, 8, 2, c2); R(4, 3, 9, 12, c1); R(3, 4, 10, 11, c1); R(4, 6, 9, 9, W_); R(5, 7, 8, 8, c2); break;
    case 'jug': R(3, 4, 10, 12, c1); R(5, 1, 7, 3, c1); R(5, 0, 7, 0, c2); R(8, 2, 10, 3, c1); S(9, 3, null); R(4, 7, 9, 10, c2); break;
    case 'carton': S(6, 0, c1); S(7, 0, c1); R(6, 1, 7, 1, c1); R(5, 2, 8, 2, c1); R(4, 3, 9, 12, c1); R(4, 6, 9, 10, c2); S(5, 4, W_); break;
    case 'box': R(3, 1, 10, 12, c1); R(4, 3, 9, 9, c2); R(5, 4, 6, 5, W_); R(3, 11, 10, 11, c2); break;
    case 'flatbox': R(1, 4, 12, 11, c1); R(3, 6, 10, 9, c2); R(4, 7, 5, 8, W_); break;
    case 'bag': R(3, 2, 10, 12, c1); R(2, 4, 11, 10, c1); for (let x = 3; x <= 10; x += 2) { S(x, 1, c1); S(x, 13, c1); } O(6.5, 7, 2, c2); S(5, 6, W_); break;
    case 'jar': R(3, 1, 10, 3, c2); R(2, 4, 11, 12, c1); R(3, 6, 10, 10, W_); R(5, 7, 8, 9, c2); break;
    case 'tub': R(2, 3, 11, 5, c2); R(3, 6, 10, 9, c1); R(4, 10, 9, 12, c1); R(4, 7, 9, 8, W_); break;
    case 'eggs': R(1, 7, 12, 12, c1); for (const x of [3, 6.5, 10]) O(x, 6, 1.5, c2); R(1, 10, 12, 10, shadeHex(c1, -40)); break;
    case 'tray': R(1, 5, 12, 12, W_); R(2, 6, 11, 11, c1); S(4, 8, W_); S(5, 9, W_); S(8, 7, W_); S(9, 10, W_); R(9, 5, 12, 7, c2); break;
    case 'wedge': for (let y = 3; y <= 12; y++) R(2, y, Math.min(12, 2 + Math.round((y - 3) * 1.2)), y, c1); R(2, 12, 12, 12, c2); S(4, 9, shadeHex(c1, -50)); S(6, 11, shadeHex(c1, -50)); S(3, 7, shadeHex(c1, -50)); break;
    case 'wheel': O(6.5, 7, 5.5, c2); O(6.5, 7, 4.2, c1); R(1, 7, 12, 7, c2); break;
    case 'ball': O(6.5, 7.5, 5, c1); R(5, 1, 8, 2, c2); S(4, 5, CAP); break;
    case 'fruit': O(6.5, 7.5, 5, c1); R(6, 1, 7, 2, STEM); R(8, 1, 9, 2, c2); S(4, 5, W_); break;
    case 'leafy': O(6.5, 7.5, 5.2, c1); O(6.5, 8, 3, c2); S(5, 4, W_); break;
    case 'banana': for (let x = 1; x <= 12; x++) { const y = Math.round(9 - Math.pow(x - 6.5, 2) * 0.17); R(x, y - 1, x, y + 1, c1); } S(1, 7, c2); S(12, 7, c2); S(1, 6, c2); break;
    case 'grapes': for (const [x, y] of [[4, 4], [7, 4], [10, 4], [5.5, 7], [8.5, 7], [7, 10]]) O(x, y, 1.6, c1); R(7, 0, 7, 2, c2); R(8, 1, 9, 1, c2); break;
    case 'carrot': for (let y = 4; y <= 13; y++) { const w = Math.max(0, Math.round((13 - y) * 0.4)); R(6 - w, y, 7 + w, y, c1); } R(5, 0, 5, 3, c2); R(7, 0, 7, 3, c2); R(9, 1, 9, 3, c2); S(6, 7, shadeHex(c1, -50)); S(7, 10, shadeHex(c1, -50)); break;
    case 'loaf': R(1, 5, 12, 12, c1); R(2, 4, 11, 4, c1); R(3, 3, 10, 3, c1); for (const x of [4, 7, 10]) { S(x, 5, c2); S(x - 1, 6, c2); } break;
    case 'ring': O(6.5, 7, 5.5, c1); for (const [x, y] of [[3, 5], [9, 4], [10, 9], [4, 10], [7, 2]]) S(x, y, c2); O(6.5, 7, 1.6, null); break;
    case 'muffin': R(3, 8, 10, 12, c2); for (let x = 4; x <= 10; x += 2) R(x, 8, x, 12, shadeHex(c2, -40)); O(6.5, 6, 4.6, c1); R(2, 8, 11, 8, c1); break;
    case 'crescent': for (let x = 1; x <= 12; x++) { const y = Math.round(5 + Math.pow(x - 6.5, 2) * 0.12); R(x, y, x, y + 3 - Math.round(Math.abs(x - 6.5) / 3), c1); } for (const x of [4, 7, 10]) S(x, 7, c2); break;
    case 'cake': R(2, 5, 11, 12, c1); R(2, 4, 11, 6, c2); S(3, 7, c2); S(7, 7, c2); S(10, 7, c2); R(6, 1, 7, 3, PCOL.R); break;
    case 'pie': R(1, 9, 12, 11, c2); R(2, 6, 11, 9, c1); R(3, 5, 10, 5, c1); for (const x of [3, 6, 9]) S(x, 7, shadeHex(c1, -50)); break;
    case 'bar': R(1, 5, 12, 10, c1); R(5, 5, 8, 10, c2); for (let y = 5; y <= 10; y += 2) { S(0, y, c1); S(13, y, c1); } break;
    case 'toolbox': R(2, 6, 11, 12, c1); R(5, 3, 8, 3, c2); R(5, 4, 5, 5, c2); R(8, 4, 8, 5, c2); R(2, 8, 11, 8, shadeHex(c1, -50)); R(6, 9, 7, 9, c2); break;
    case 'grill': O(6.5, 5, 4.5, c1); R(2, 5, 11, 5, c2); R(3, 9, 3, 13, c2); R(10, 9, 10, 13, c2); R(6, 9, 7, 12, c2); break;
    case 'lamp': for (let y = 1; y <= 6; y++) R(5 - Math.floor(y / 2), y, 8 + Math.floor(y / 2), y, c1); R(6, 7, 7, 11, c2); R(4, 12, 9, 12, c2); break;
    case 'bike': O(3.5, 9, 2.5, c2); O(10, 9, 2.5, c2); O(3.5, 9, 1, null); O(10, 9, 1, null); R(4, 6, 9, 6, c1); S(6, 7, c1); S(7, 8, c1); R(9, 4, 10, 5, c1); R(3, 5, 4, 5, c1); break;
    case 'plant': O(6.5, 5, 4, c1); S(3, 2, c1); S(10, 2, c1); R(4, 9, 9, 10, c2); R(5, 11, 8, 12, c2); break;
    case 'pillow': R(2, 4, 11, 11, c1); R(1, 5, 12, 10, c1); S(1, 4, c1); S(12, 4, c1); S(1, 11, c1); S(12, 11, c1); R(3, 7, 10, 8, c2); break;
    case 'mug': R(3, 3, 9, 12, c1); R(10, 5, 12, 10, c1); R(10, 6, 11, 9, null); R(3, 6, 9, 8, c2); break;
    case 'tube': R(2, 5, 10, 9, c1); R(11, 6, 12, 8, c2); R(1, 4, 1, 10, shadeHex(c1, -30)); R(5, 6, 8, 8, c2); break;
    case 'roll': R(1, 3, 6, 12, c1); R(7, 3, 12, 12, c1); R(1, 6, 12, 8, c2); O(3.5, 3, 1, CAP); O(9.5, 3, 1, CAP); break;
    case 'tissue': R(2, 5, 11, 12, c1); R(4, 7, 9, 10, c2); R(5, 2, 8, 4, W_); S(6, 1, W_); break;
    case 'plates': for (let i = 0; i < 4; i++) R(1, 5 + i * 2, 12, 5 + i * 2, i % 2 ? c2 : c1); R(1, 4, 12, 4, c1); R(1, 12, 12, 12, c1); break;
    case 'cups': for (let i = 0; i < 3; i++) { const y = 2 + i * 3; R(3 - i * 0, y, 10, y + 4, c1); R(3, y, 10, y, c2); } R(4, 11, 9, 12, c1); break;
    default: R(3, 2, 10, 12, c1); R(4, 5, 9, 9, c2);
  }
  function A_(c) { return c; }
  // shading + outline
  const out = [...Array(N)].map((_, y) => g[y].slice());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = g[y][x]; if (!c) continue;
    if (y === 0 || !g[y - 1][x] || x === 0 || !g[y][x - 1]) out[y][x] = shadeHex(c, 34);
    else if (y === N - 1 || !g[y + 1][x] || x === N - 1 || !g[y][x + 1]) out[y][x] = shadeHex(c, -42);
  }
  const cv = document.createElement('canvas'); cv.width = N + 2; cv.height = N + 2;
  const k = cv.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y][x]) {
    k.fillStyle = INK;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || !g[ny][nx]) k.fillRect(nx + 1, ny + 1, 1, 1); }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (out[y][x]) { k.fillStyle = out[y][x]; k.fillRect(x + 1, y + 1, 1, 1); }
  return (ICONS[name] = cv);
}
const LABEL_COLS = ['#d63c34','#f0c440','#3c9650','#3c6ec8','#e65a8c','#f48c32','#f6f6f0','#965aaa','#78bed2','#b07846'];

// faces: horizontal faces have y = the face edge line, side = +1 (aisle below) / -1 (aisle above)
// vertical faces have x = edge line, side -1 (aisle left)
const FACES = [
  { a:'PRODUCE', off:0, n:8,  ax:'h', x0:4,  y:5,  side:1, kind:'wall' },
  { a:'BAKERY',  off:0, n:14, ax:'h', x0:36, y:5,  side:1, kind:'wall' },
  { a:'CHOC',    off:0, n:6,  ax:'h', x0:92, y:5,  side:1, kind:'wall' },
  { a:'CHEESE',  off:0, n:12, ax:'v', y0:5,  x:115, side:-1, kind:'wall' },
  { a:'BEEF',    off:0, n:9,  ax:'v', y0:53, x:115, side:-1, kind:'wall' },
  { a:'FROZEN',  off:0, n:10, ax:'h', x0:0,  y:89, side:-1, kind:'wall' },
  { a:'DAIRY',   off:0, n:7,  ax:'h', x0:68, y:89, side:-1, kind:'wall' },
  { a:'CHICKEN', off:0, n:6,  ax:'h', x0:96, y:89, side:-1, kind:'wall' },
  { a:'CRACKERS',off:0, n:12, ax:'h', x0:51, y:19, side:-1 },
  { a:'CHIPS',   off:0, n:12, ax:'h', x0:51, y:24, side:1 },
  { a:'CHIPS',   off:12,n:12, ax:'h', x0:51, y:36, side:-1 },
  { a:'SPECIAL', off:0, n:12, ax:'h', x0:51, y:41, side:1 },
  { a:'SPECIAL', off:12,n:12, ax:'h', x0:51, y:53, side:-1 },
  { a:'DRY',     off:0, n:12, ax:'h', x0:51, y:58, side:1 },
  { a:'CANNED',  off:0, n:6,  ax:'h', x0:51, y:72, side:-1 },
  { a:'CEREAL',  off:0, n:6,  ax:'h', x0:75, y:72, side:-1 },
  { a:'JUICE',   off:0, n:12, ax:'h', x0:51, y:77, side:1 },
  { a:'CONDIM',  off:0, n:5,  ax:'h', x0:18, y:36, side:-1 },
  { a:'BABY',    off:0, n:5,  ax:'h', x0:18, y:41, side:1 },
  { a:'PAPER',   off:0, n:5,  ax:'h', x0:18, y:53, side:-1 },
  { a:'BAKING',  off:0, n:5,  ax:'h', x0:18, y:58, side:1 },
];
const SOLID = [[0,0,120,5],[0,89,120,94],[0,0,5,94],[115,0,120,94],
  [51,19,99,24],[51,36,99,41],[51,53,99,58],[51,72,99,77],[18,36,38,41],[18,53,38,58],[17,17,39,25],[17,71,39,79]];
const BLOCKS = [{ y:17, kind:'PRODUCE' }, { y:71, kind:'FROZEN' }]; // 22 x 8 ft at x 17
const STAGE = [55, 79, 73, 89];  // pallet pickup at the warehouse door
const LANES_X = [11, 45, 107], LANES_Y = [12, 30, 47, 65, 83];

const MODES = {
  newhire: { name:'NEW HIRE', block:true,  hint:true,  carts:0, help:false },
  easy:    { name:'EASY',     block:false, hint:false, carts:0, help:false },
  medium:  { name:'MEDIUM',   block:false, hint:false, carts:3, help:false },
  hard:    { name:'HARD',     block:false, hint:false, carts:4, help:true },
  daily:   { name:'DAILY SHIFT', block:false, hint:false, carts:3, help:false, daily:true },
};
const PALLETS_PER_SHIFT = 4;
const MODE_KEYS = ['newhire', 'easy', 'medium', 'hard', 'daily'];
const MODE_SHORT = { newhire:'NEW', easy:'EASY', medium:'MED', hard:'HARD', daily:'DAILY' };

// ---------- helpers ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = n => (Math.random() * n) | 0;
const pick = a => a[ri(a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const overlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const inside = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
const pad2 = n => String(n).padStart(2, '0');
function hashCol(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return LABEL_COLS[h % LABEL_COLS.length]; }
const rri = n => ((G && G.rng ? G.rng() : Math.random()) * n) | 0;
const rpick = a => a[rri(a.length)];
const rshuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- images ----------
const IMG = {};
function loadImages() {
  return Promise.all(Object.entries(SPR).map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.src = src;
  })));
}

// ---------- audio (tiny blips) ----------
let AUD = null;
function audio() {
  try {
    if (!AUD) AUD = new (window.AudioContext || window.webkitAudioContext)();
    if (AUD.state === 'suspended') AUD.resume();
  } catch (e) {}
  return AUD;
}
document.addEventListener('pointerdown', audio, true);
document.addEventListener('keydown', audio, true);
function beep(freq, dur, type = 'square', vol = 0.06) {
  const A = audio(); if (!A) return;
  try {
    const o = A.createOscillator(), g = A.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(A.destination);
    const t = A.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}
// two-tone electric "beep-beep" like a walkie's button horn
function horn() {
  const A = audio(); if (!A) return;
  try {
    const out = A.createGain(); out.gain.value = 0.11;
    const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.7;
    lp.connect(out); out.connect(A.destination);
    const t0 = A.currentTime + 0.01;
    for (const start of [0, 0.19]) {
      const env = A.createGain(); env.gain.value = 0; env.connect(lp);
      const t = t0 + start, len = 0.14;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.006);
      env.gain.setValueAtTime(1, t + len - 0.03);
      env.gain.linearRampToValueAtTime(0, t + len);
      for (const [f, typ, v] of [[523, 'square', 0.5], [659, 'square', 0.42], [1046, 'triangle', 0.25]]) {
        const o = A.createOscillator(), g = A.createGain();
        o.type = typ; g.gain.value = v;
        o.frequency.setValueAtTime(f * 1.012, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
        o.connect(g); g.connect(env); o.start(t); o.stop(t + len + 0.02);
      }
    }
  } catch (e) {}
}
// ============================================================
// Pre-rendered world (8 px per ft) and map (1.6 px per ft)
// ============================================================
const PX = 8;
const world = document.createElement('canvas'); world.width = 120 * PX; world.height = 94 * PX;
const MAPS = 1.6, MOX = 6, MOY = 18;
const mapC = document.createElement('canvas'); mapC.width = SW; mapC.height = SH;

function dots(ctx, x, y, w, h, seed, palette) {
  const r = seeded(seed);
  for (let yy = y + 2; yy < y + h - 3; yy += 5) {
    const col = palette ? pick2(palette, r) : LABEL_COLS[(r() * LABEL_COLS.length) | 0];
    for (let xx = x + 2; xx < x + w - 3; xx += 5) {
      ctx.fillStyle = col; ctx.fillRect(xx, yy, 4, 4);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(xx, yy + 3, 4, 1); ctx.fillRect(xx + 3, yy, 1, 4);
    }
  }
}
function pick2(a, r) { return a[(r() * a.length) | 0]; }

function faceRect(f, s0 = 0, s1 = f.n) {
  // the shelf band of a face (inside the fixture), in feet
  if (f.ax === 'h') {
    const depth = f.kind === 'wall' ? 5 : 2.5;
    const y0 = f.side > 0 ? f.y - depth : f.y, y1 = f.side > 0 ? f.y : f.y + depth;
    return [f.x0 + s0 * 4, y0, f.x0 + s1 * 4, y1];
  }
  return [f.x, f.y0 + s0 * 4, f.x + 5, f.y0 + s1 * 4];
}
function zoneRect(f, s0, s1) {
  if (f.ax === 'h') {
    const y0 = f.side > 0 ? f.y : f.y - 6, y1 = f.side > 0 ? f.y + 6 : f.y;
    return [Math.max(5, f.x0 + s0 * 4), y0, Math.min(115, f.x0 + s1 * 4), y1];
  }
  return [f.x - 6, f.y0 + s0 * 4, f.x, f.y0 + s1 * 4];
}

function buildWorld() {
  const g = world.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let y = 0; y < world.height; y += 16) for (let x = 0; x < world.width; x += 16) {
    g.fillStyle = ((x + y) / 16) % 2 ? FLOOR1 : FLOOR2; g.fillRect(x, y, 16, 16);
  }
  // walls base
  g.fillStyle = '#8a8e96';
  for (const r of SOLID.slice(0, 4)) g.fillRect(r[0] * PX, r[1] * PX, (r[2] - r[0]) * PX, (r[3] - r[1]) * PX);
  // island bodies
  g.fillStyle = '#80848a';
  for (const r of SOLID.slice(4, 10)) g.fillRect(r[0] * PX, r[1] * PX, (r[2] - r[0]) * PX, (r[3] - r[1]) * PX);
  // faces: product dots, colored stripe with name, tag strip with section numbers
  FACES.forEach((f, i) => {
    const r = faceRect(f).map(v => v * PX);
    const [x0, y0, x1, y1] = r;
    dots(g, x0, y0, x1 - x0, y1 - y0, 1000 + i * 77);
    g.fillStyle = AC[f.a];
    if (f.ax === 'h') {
      const edge = f.side > 0 ? y1 : y0;
      const sy = f.side > 0 ? edge - 14 : edge + 7;   // name stripe
      const ty = f.side > 0 ? edge - 7 : edge;        // tag strip
      g.fillRect(x0, sy, x1 - x0, 7);
      g.fillStyle = '#fafaf4'; g.fillRect(x0, ty, x1 - x0, 7);
      g.fillStyle = INK; g.fillRect(x0, f.side > 0 ? edge - 1 : edge, x1 - x0, 1);
      for (let s = 0; s < f.n; s++) {
        const sx = x0 + s * 32;
        g.fillStyle = INK; g.fillRect(sx, ty, 1, 7);
        text(g, pad2(f.off + s + 1), sx + 3, ty + 1, BAD);
      }
      for (let cx = x0 + 64; cx < x1 - 20; cx += 128) textC(g, ANAME[f.a], cx, sy + 1, INK);
      if (x1 - x0 < 128) textC(g, ANAME[f.a], (x0 + x1) / 2, sy + 1, INK);
    } else {
      const edge = x0;
      g.fillRect(edge + 7, y0, 7, y1 - y0);
      g.fillStyle = '#fafaf4'; g.fillRect(edge, y0, 8, y1 - y0);
      g.fillStyle = INK; g.fillRect(edge, y0, 1, y1 - y0);
      for (let s = 0; s < f.n; s++) {
        const sy = y0 + s * 32;
        g.fillStyle = INK; g.fillRect(edge, sy, 8, 1);
        text(g, pad2(f.off + s + 1), edge + 1, sy + 3, BAD);
      }
      g.save(); g.translate(edge + 13, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      textC(g, ANAME[f.a], 0, -5, INK); g.restore();
    }
  });
  // island outlines + spine
  g.strokeStyle = INK; g.lineWidth = 1;
  for (const r of SOLID.slice(4, 10)) {
    g.strokeRect(r[0] * PX + .5, r[1] * PX + .5, (r[2] - r[0]) * PX - 1, (r[3] - r[1]) * PX - 1);
  }
  // freezer / produce blocks
  for (const b of BLOCKS) drawBlock(g, 17 * PX, b.y * PX, PX, b.kind);
  // doors
  door(g, 0, 0, 4, 5, '#5ac878', 'IN');
  door(g, 116, 0, 120, 5, BAD, 'EXIT');
  door(g, 60, 89, 68, 94, '#787c84', 'WH');
  // staging marks
  g.strokeStyle = HI; g.setLineDash([4, 4]); g.lineWidth = 2;
  g.strokeRect(STAGE[0] * PX, STAGE[1] * PX, (STAGE[2] - STAGE[0]) * PX, (STAGE[3] - STAGE[1]) * PX);
  g.setLineDash([]); g.lineWidth = 1;
  textC(g, 'PALLET PICKUP', (STAGE[0] + STAGE[2]) / 2 * PX, STAGE[1] * PX + 4, '#8a6a10');
}
function door(g, x0, y0, x1, y1, col, lab) {
  g.fillStyle = FLOOR1; g.fillRect(x0 * PX, y0 * PX, (x1 - x0) * PX, (y1 - y0) * PX);
  g.fillStyle = col; g.fillRect(x0 * PX, y0 * PX, (x1 - x0) * PX, 4); g.fillRect(x0 * PX, y1 * PX - 4, (x1 - x0) * PX, 4);
  textC(g, lab, (x0 + x1) / 2 * PX, (y0 + y1) / 2 * PX - 2, INK);
}
function drawBlock(g, x, y, s, kind) {
  const col = kind === 'FROZEN' ? '#96d2f0' : '#965aaa', lid = kind === 'FROZEN' ? '#d2f0fa' : '#c89ad6';
  const R = (a, b, w, h) => { g.fillStyle = INK; g.fillRect(x + a * s, y + b * s, w * s, h * s);
    g.fillStyle = col; g.fillRect(x + a * s + 1, y + b * s + 1, w * s - 2, h * s - 2);
    g.fillStyle = lid; g.fillRect(x + a * s + 2, y + b * s + 2, w * s - 4, Math.max(1, s / 2)); };
  R(0, 0, 3, 8); R(19, 0, 3, 8);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) R(3 + i * 8, 1 + j * 3, 8, 3);
  if (s >= 4) {
    const r = seeded(kind === 'FROZEN' ? 5 : 9);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = kind === 'FROZEN' ? pick2(['#ffffff', '#e65a8c', '#f0c440', '#3c6ec8'], r) : pick2(['#d63c34', '#f0c440', '#3c9650', '#f48c32'], r);
      g.fillRect(x + (3.5 + r() * 15) * s, y + (1.6 + r() * 5.2) * s, 3, 3);
    }
    textC(g, kind === 'FROZEN' ? 'FREEZERS' : 'PRODUCE', x + 11 * s, y - 7, INK);
  }
}

function buildMap() {
  const g = mapC.getContext('2d'); g.imageSmoothingEnabled = false;
  const X = f => MOX + f * MAPS, Y = f => MOY + f * MAPS;
  const R = (r, col) => { g.fillStyle = col; g.fillRect(Math.round(X(r[0])), Math.round(Y(r[1])), Math.round((r[2] - r[0]) * MAPS), Math.round((r[3] - r[1]) * MAPS)); };
  g.fillStyle = UI; g.fillRect(0, 0, SW, SH);
  R([0, 0, 120, 94], INK); R([0.6, 0.6, 119.4, 93.4], '#cccec8');
  R([0, 0, 120, 5], '#8a8e96'); R([0, 89, 120, 94], '#8a8e96'); R([0, 0, 5, 94], '#8a8e96'); R([115, 0, 120, 94], '#8a8e96');
  for (const f of FACES) {
    const r = faceRect(f);
    R(r, AC[f.a]);
    for (let s = 1; s < f.n; s++) {
      g.fillStyle = 'rgba(0,0,0,.35)';
      if (f.ax === 'h') g.fillRect(Math.round(X(f.x0 + s * 4)), Math.round(Y(r[1])), 1, Math.round((r[3] - r[1]) * MAPS));
      else g.fillRect(Math.round(X(r[0])), Math.round(Y(f.y0 + s * 4)), Math.round(5 * MAPS), 1);
    }
  }
  for (const r of SOLID.slice(4, 10)) {
    g.strokeStyle = INK; g.strokeRect(Math.round(X(r[0])) + .5, Math.round(Y(r[1])) + .5, Math.round((r[2] - r[0]) * MAPS) - 1, Math.round((r[3] - r[1]) * MAPS) - 1);
  }
  for (const b of BLOCKS) drawBlock(g, Math.round(X(17)), Math.round(Y(b.y)), MAPS, b.kind);
  R([0, 0, 4, 5], '#5ac878'); R([116, 0, 120, 5], BAD); R([60, 89, 68, 94], '#cccec8');
}

// ============================================================
// Game state
// ============================================================
let state = 'title', mode = MODES.newhire, modeKey = 'newhire';
const CHARS = [
  { pre: '', por: 'por0', name: 'STOCKER 1', look: ['SHORT BROWN HAIR', 'NAVY SHIRT', 'BROWN WORK PANTS'] },
  { pre: 'f_', por: 'por1', name: 'STOCKER 2', look: ['BLACK PONYTAIL', 'DARK BLUE SHIRT', 'DENIM OVERALLS'] },
];
let charIdx = 0;
try { charIdx = Math.min(CHARS.length - 1, parseInt(localStorage.getItem('idla.char') || '0', 10) || 0); } catch (e) {}
function setChar(i) { charIdx = i; try { localStorage.setItem('idla.char', String(i)); } catch (e) {} }
let G = null; // per-shift data
const input = { jx:0, jy:0, kx:0, ky:0, a:false, b:false, aEdge:false, bEdge:false };

function newShift(k) {
  modeKey = k; mode = MODES[k];
  const day = todayUTC();
  G = {
    rng: mode.daily ? seeded(parseInt(day.replace(/-/g, ''), 10) * 2654435761) : Math.random, day,
    clock: 0, score: 0, palletNo: 1, pallets: PALLETS_PER_SHIFT, combo: 0, bestCombo: 0,
    placed: 0, correct: 0, auditErrors: 0, blocked: 0, bumps: 0, scrapes: 0, helpOk: 0, helpBad: 0,
    truck: { x: 64.5, y: 83, h: Math.PI, delta: 0, loaded: true, frame: 0, anim: 0, stun: 0, pulling: true, scrapeCd: 0 },
    task: null, toast: null, toastT: 0, popups: [], carts: [], helpT: rnd(18, 30), help: null, battle: null, honk: 0,
  };
  G.task = newTask();
  for (let i = 0; i < mode.carts; i++) G.carts.push(newCart(i));
  state = 'drive';
  toast('DRIVE THE PALLET TO ' + ANAME[G.task.face.a]);
}
function newTask() {
  const prev = G && G.task ? G.task.face.a : null;
  // pick a face + 3 sections at least ~30 ft from the pallet pickup, and not the same area twice in a row
  for (let tries = 0; tries < 200; tries++) {
    const f = rpick(FACES); if (f.a === prev) continue;
    const s = rri(f.n - 2), z = zoneRect(f, s, s + 3);
    const d = Math.hypot((z[0] + z[2]) / 2 - 64, (z[1] + z[3]) / 2 - 84);
    if (d < 30) continue;
    return { face: f, s, zone: z, tags: [f.off + s + 1, f.off + s + 3] };
  }
  const f = FACES[1]; return { face: f, s: 0, zone: zoneRect(f, 0, 3), tags: [1, 3] };
}
function tagStr(t) { return t.face.a + ' ' + pad2(t.tags[0]) + '-' + pad2(t.tags[1]); }
function toast(s, t = 2.2) { G.toast = s; G.toastT = t; }

// ---------- truck geometry ----------
// The truck pivots on its load wheels (near the fork tips). The drive wheel under the power unit
// is steered by the tiller. truck.x/y = drive wheel, truck.h = heading from load wheels toward the operator.
const WB = 3.5;                         // wheelbase: drive wheel -> load wheels (ft)
const PARTS = [                         // [from s, to s, width] along the heading, s measured from the drive wheel
  { s0: -4.25, s1: -0.9, w: 3.6, wE: 2.6, part: 'pallet' },
  { s0: -0.9,  s1: 1.0,  w: 2.8, part: 'unit' },
  { s0: 1.0,   s1: 5.0,  w: 1.6, part: 'operator' },
];
function fwdOf(h) { return [Math.cos(h), Math.sin(h)]; }
function truckCenter(t) { const f = fwdOf(t.h); return [t.x + f[0] * 0.5, t.y + f[1] * 0.5]; }
function palletCenter(t) { const f = fwdOf(t.h); return [t.x - f[0] * 2.6, t.y - f[1] * 2.6]; }
function partPoly(x, y, h, p, loaded) {
  const f = fwdOf(h), n = [-f[1], f[0]], w = (p.part === 'pallet' && !loaded ? p.wE : p.w) / 2;
  const P = (s, q) => [x + f[0] * s + n[0] * q, y + f[1] * s + n[1] * q];
  return [P(p.s0, -w), P(p.s1, -w), P(p.s1, w), P(p.s0, w)];
}
function polyHitsRect(poly, r) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, y] of poly) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  if (b <= r[0] || a >= r[2] || d <= r[1] || c >= r[3]) return false;
  const rc = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  for (let i = 0; i < 2; i++) {
    const ex = poly[i + 1][0] - poly[i][0], ey = poly[i + 1][1] - poly[i][1], ax = -ey, ay = ex;
    let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
    for (const [x, y] of poly) { const v = x * ax + y * ay; p0 = Math.min(p0, v); p1 = Math.max(p1, v); }
    for (const [x, y] of rc) { const v = x * ax + y * ay; q0 = Math.min(q0, v); q1 = Math.max(q1, v); }
    if (p1 <= q0 || q1 <= p0) return false;
  }
  return true;
}
function cartRect(c) { return c.horiz ? [c.x - 2.5, c.y - 1.25, c.x + 2.5, c.y + 1.25] : [c.x - 1.25, c.y - 2.5, c.x + 1.25, c.y + 2.5]; }
// what would the truck hit at this pose? -> { part, cart } or null
function collideAt(x, y, h, loaded) {
  for (const p of PARTS) {
    const poly = partPoly(x, y, h, p, loaded);
    for (const s of SOLID) if (polyHitsRect(poly, s)) return { part: p.part };
    for (const c of G.carts) if (polyHitsRect(poly, cartRect(c))) return { part: p.part, cart: c };
  }
  return null;
}
function truckAABB(t, pad = 0) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const p of PARTS) for (const [x, y] of partPoly(t.x, t.y, t.h, p, t.loaded)) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a - pad, c - pad, b + pad, d + pad];
}

// ---------- carts ----------
function newCart(i) {
  let x, y;
  do { x = pick(LANES_X); y = pick(LANES_Y); } while (Math.hypot(x - 64, y - 83) < 25);
  const c = { x, y, tx: x, ty: y, horiz: false, wait: 0, skin: 'c' + (i % 3), stopped: 0, help: false };
  chooseNext(c); return c;
}
function chooseNext(c) {
  const opts = [];
  const xi = LANES_X.indexOf(Math.round(c.x)), yi = LANES_Y.indexOf(Math.round(c.y));
  if (xi > 0) opts.push([LANES_X[xi - 1], c.y]); if (xi < LANES_X.length - 1) opts.push([LANES_X[xi + 1], c.y]);
  if (yi > 0) opts.push([c.x, LANES_Y[yi - 1]]); if (yi < LANES_Y.length - 1) opts.push([c.x, LANES_Y[yi + 1]]);
  const back = opts.filter(o => !(o[0] === c.px && o[1] === c.py));
  const o = pick(back.length ? back : opts);
  c.px = c.x; c.py = c.y; c.tx = o[0]; c.ty = o[1];
}
function updateCarts(dt) {
  const tr = truckAABB(G.truck, 0.6);
  for (const c of G.carts) {
    if (c.stopped > 0) { c.stopped -= dt; continue; }
    if (c.wait > 0) { c.wait -= dt; continue; }
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d < 0.05) { c.x = c.tx; c.y = c.ty; if (Math.random() < 0.3) c.wait = rnd(0.5, 2.5); chooseNext(c); continue; }
    const sp = 2.6 * dt, nx = c.x + dx / d * Math.min(sp, d), ny = c.y + dy / d * Math.min(sp, d);
    const horiz = Math.abs(dx) > Math.abs(dy);
    const nr = horiz ? [nx - 2.5, ny - 1.25, nx + 2.5, ny + 1.25] : [nx - 1.25, ny - 2.5, nx + 1.25, ny + 2.5];
    if (overlap(nr, tr)) { c.wait = 0.4; continue; }   // shoppers wait for the truck
    c.x = nx; c.y = ny; c.horiz = horiz; c.dir = horiz ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  }
}

// ---------- driving ----------
function updateDrive(dt) {
  const t = G.truck;
  G.clock += dt;
  if (G.toastT > 0) G.toastT -= dt;
  G.honk = Math.max(0, G.honk - dt);
  t.scrapeCd = Math.max(0, t.scrapeCd - dt);
  const [tcx, tcy] = truckCenter(t);
  if (input.bEdge) {
    G.honk = 0.45; horn();
    for (const c of G.carts) if (Math.hypot(c.x - tcx, c.y - tcy) < 24) c.stopped = 2.5;
  }
  if (mode.carts) updateCarts(dt);
  if (mode.help && !G.help) {
    G.helpT -= dt;
    if (G.helpT <= 0) {
      const c = G.carts.find(c => Math.hypot(c.x - tcx, c.y - tcy) < 16);
      if (c) startHelp(c); else G.helpT = 3;
    }
  }
  if (t.stun > 0) t.stun -= dt;
  else drive(t, dt);

  // zone checks: pallet over the zone and lined up with the shelf
  const [px, py] = palletCenter(t);
  const f = G.task.face;
  const parallel = f.ax === 'h' ? Math.abs(Math.cos(t.h)) > 0.94 : Math.abs(Math.sin(t.h)) > 0.94;
  G.canAct = null; G.hint = null;
  if (t.loaded && inside(px, py, G.task.zone.map((v, i) => v + (i < 2 ? -1.5 : 1.5)))) {
    if (parallel) { G.canAct = 'UNLOAD'; if (input.aEdge) startBattle(); }
    else G.hint = 'LINE THE PALLET UP WITH THE SHELF';
  } else if (!t.loaded && inside(tcx, tcy, STAGE)) {
    G.canAct = 'PICK UP';
    if (input.aEdge) {
      t.loaded = true; G.task = newTask(); beep(660, 0.1); beep(880, 0.12);
      toast('NEW PALLET: ' + tagStr(G.task));
    }
  }
}
// joystick = where the operator wants to walk. Within ~100 deg of the heading he pulls
// (walks ahead, pallet trails); behind that he pushes the forks first.
function drive(t, dt) {
  let jx = input.jx + input.kx, jy = input.jy + input.ky;
  const m = Math.min(1, Math.hypot(jx, jy));
  if (m < 0.18) { t.moving = false; return; }
  const a = Math.atan2(jy, jx);
  const wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
  let rel = wrap(a - t.h), rev = false;
  if (Math.abs(rel) > Math.PI * 0.58) { rev = true; rel = wrap(a - t.h - Math.PI); }
  if (rev !== !t.pulling) { t.pulling = !rev; t.delta = 0; }
  const MAXD = 1.4;                                   // ~80 deg tiller
  const target = Math.max(-MAXD, Math.min(MAXD, rel));
  t.delta += Math.max(-6 * dt, Math.min(6 * dt, target - t.delta));
  const speed = (rev ? 3.2 : (t.loaded ? 6 : 7.5)) * m;
  const ang = (rev ? t.h + Math.PI : t.h) + t.delta;
  const f = fwdOf(t.h), Lx = t.x - f[0] * WB, Ly = t.y - f[1] * WB;
  for (const frac of [1, 0.5, 0.25]) {
    const sp = speed * dt * frac;
    const nx = t.x + Math.cos(ang) * sp, ny = t.y + Math.sin(ang) * sp;
    const nh = Math.atan2(ny - Ly, nx - Lx);         // load wheels trail like a trailer hitch
    const hit = collideAt(nx, ny, nh, t.loaded);
    if (!hit) { t.x = nx; t.y = ny; t.h = nh; t.moving = true; t.anim += dt; t.frame = ((t.anim * 8) | 0) % 4; return; }
    if (hit.cart) {
      t.stun = 0.6; hit.cart.stopped = 1.5; G.bumps++; G.score -= 25; G.combo = 0;
      beep(120, 0.2, 'sawtooth', 0.08); toast('BUMPED A CART!  -25'); t.moving = false; return;
    }
    if (frac === 0.25) {
      t.moving = false;
      if (t.scrapeCd <= 0) {
        t.scrapeCd = 1.2; beep(70, 0.12, 'sawtooth', 0.06);
        if (hit.part === 'pallet') { G.scrapes++; G.score -= 10; toast('PALLET CLIPPED THE SHELF  -10', 1.2); }
        else toast('WATCH THE CORNER - SWING WIDER', 1);
      }
    }
  }
}


// ---------- help requests (hard) ----------
function startHelp(c) {
  const areas = Object.keys(PRODUCTS);
  const count = {}; for (const a of areas) for (const p of PRODUCTS[a]) count[p] = (count[p] || 0) + 1;
  let a, p; do { a = pick(areas); p = pick(PRODUCTS[a]); } while (count[p] > 1);
  const wrong = shuffle(areas.filter(x => x !== a)).slice(0, 2);
  G.help = { cart: c, product: p, area: a, opts: shuffle([a, ...wrong]), t: 10, result: null, rt: 0 };
  c.stopped = 99; beep(520, 0.1); beep(620, 0.1);
}
function updateHelp(dt) {
  const h = G.help; G.clock += dt;
  if (h.result) { h.rt -= dt; if (h.rt <= 0) { h.cart.stopped = 1; G.help = null; G.helpT = rnd(20, 35); } return; }
  h.t -= dt;
  if (h.t <= 0) answerHelp(null);
}
function answerHelp(a) {
  const h = G.help;
  if (a === h.area) { G.score += 150; G.helpOk++; h.result = 'THANK YOU!  +150'; beep(784, 0.1); beep(1046, 0.15); }
  else { G.score -= 100; G.helpBad++; h.result = (a ? 'THAT\'S NOT IT...' : 'NEVER MIND...') + '  -100'; beep(150, 0.25, 'sawtooth', 0.06); }
  h.rt = 1.4;
}

// ---------- battle ----------
const SEC_W = 81, SHELF_H = 36, SX0 = 6, SY0 = 14, SLOT_W = 35, SLOT_H = 26;
function slotXY(sec, shelf, k) { return [SX0 + sec * (SEC_W + 1) + 3 + k * 39, SY0 + 2 + shelf * SHELF_H + 6]; }
function startBattle() {
  const a = G.task.face.a;
  const prods = rshuffle(PRODUCTS[a].slice()).map(n => ({ n, col: hashCol(n + a) }));
  const list = rshuffle([...prods, ...prods, ...prods]);
  const slots = [];
  let i = 0;
  for (let sec = 0; sec < 3; sec++) for (let shelf = 0; shelf < 4; shelf++) for (let k = 0; k < 2; k++) {
    const [x, y] = slotXY(sec, shelf, k);
    slots.push({ sec, shelf, k, x, y, want: list[i++], got: null, wrong: false });
  }
  const queue = rshuffle(slots.map(s => s.want));
  G.popups = [];
  G.battle = { slots, queue, total: queue.length, drag: null, shake: 0, flash: null, flashT: 0 };
  state = 'battle'; beep(440, 0.08); beep(660, 0.08);
}
function battlePointer(type, x, y) {
  const b = G.battle; if (!b.queue.length) return;
  if (type === 'down') {
    if (x >= 4 && x <= 44 && y >= 163 && y <= 191) b.drag = { x, y, ox: x - 6, oy: y - 165 };
  } else if (type === 'move' && b.drag) { b.drag.x = x; b.drag.y = y; }
  else if (type === 'up' && b.drag) {
    const cx = x - b.drag.ox + SLOT_W / 2, cy = y - b.drag.oy + SLOT_H / 2;
    const s = b.slots.find(s => !s.got && cx >= s.x - 3 && cx <= s.x + SLOT_W + 3 && cy >= s.y - 4 && cy <= s.y + SLOT_H + 4);
    b.drag = null;
    if (s) place(s);
  }
}
function place(s) {
  const b = G.battle, c = b.queue[0];
  const ok = s.want.n === c.n;
  if (!ok && mode.block) {
    G.blocked++; G.score -= 20; G.combo = 0; b.shake = 0.3; b.flash = 'WRONG SPOT  -20'; b.flashT = 1;
    beep(110, 0.2, 'sawtooth', 0.07); return;
  }
  b.queue.shift(); s.got = c; G.placed++;
  if (ok) {
    G.correct++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
    const pts = 100 + Math.min(G.combo, 10) * 10; G.score += pts;
    G.popups.push({ s: (G.combo >= 3 ? 'x' + G.combo + ' ' : '') + '+' + pts, t: 0.9 });
    beep(520 + Math.min(G.combo, 12) * 40, 0.07);
  } else {
    s.wrong = true; G.auditErrors++; G.combo = 0;
    G.popups.push({ s: 'PLACED', t: 0.6 }); beep(300, 0.07);
  }
  if (!b.queue.length) {
    setTimeout(() => {
      state = 'drive'; G.truck.loaded = false; G.battle = null;
      if (G.palletNo >= G.pallets) endShift();
      else { G.palletNo++; toast('EMPTY. RETURN TO PALLET PICKUP'); }
    }, 700);
    beep(660, 0.1); beep(880, 0.1); beep(1100, 0.18);
  }
}
function endShift() {
  const par = 150 + 45 * G.pallets;
  G.timeBonus = Math.max(0, Math.round((par - G.clock) * 5));
  G.auditPenalty = G.auditErrors * 150;
  G.final = G.score + G.timeBonus - G.auditPenalty;
  const key = 'best.' + modeKey + (mode.daily ? '.' + G.day : '');
  const best = store(key);
  G.newBest = !best || G.final > best.score;
  if (G.newBest) store(key, { score: G.final, time: Math.round(G.clock), date: todayUTC() });
  G.posted = false;
  state = 'results'; beep(523, 0.12); beep(659, 0.12); beep(784, 0.2);
}
// ============================================================
// Drawing
// ============================================================
function panel(ctx, x0, y0, x1, y1, fill = UI) {
  ctx.fillStyle = INK; ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  ctx.fillStyle = LINE; ctx.fillRect(x0 + 1, y0 + 1, x1 - x0 - 1, y1 - y0 - 1);
  ctx.fillStyle = fill; ctx.fillRect(x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3);
}
function bar(ctx, x, y, w, frac, col) {
  ctx.fillStyle = INK; ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, frac)))), 4);
}
const fmtClock = s => ((s / 60) | 0) + ':' + pad2((s % 60) | 0);
function header(ctx) {
  ctx.fillStyle = UI2; ctx.fillRect(0, 0, SW, 13);
  text(ctx, 'IDLA', 4, 4, HI); text(ctx, 'SHIFT  ' + mode.name, 26, 4, PAPER);
  text(ctx, 'PLT ' + G.palletNo + '/' + G.pallets, 150, 4, PAPER);
  text(ctx, fmtClock(G.clock), 230, 4, HI);
}

function drawTruck(ctx, t, sx, sy) {
  const im = IMG[CHARS[charIdx].pre + (t.loaded ? 'tl' : 'te') + (t.pulling ? 'p' : '') + t.frame];
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(t.h + Math.PI / 2);
  ctx.drawImage(im, -15, -38);
  ctx.restore();
}
function drawCart(ctx, c, x, y) {
  const ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][c.dir || 0];
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  ctx.drawImage(IMG[c.skin], -7, -13);
  ctx.restore();
}

function drawDriveTop() {
  T.drawImage(mapC, 0, 0);
  header(T);
  const X = f => MOX + f * MAPS, Y = f => MOY + f * MAPS;
  const blink = (G.clock * 3 | 0) % 2;
  const z = G.truck.loaded ? G.task.zone : STAGE;
  T.strokeStyle = blink ? '#ffffff' : HI; T.lineWidth = 1;
  T.strokeRect(Math.round(X(z[0])) + .5, Math.round(Y(z[1])) + .5, Math.round((z[2] - z[0]) * MAPS), Math.round((z[3] - z[1]) * MAPS));
  for (const c of G.carts) { T.fillStyle = INK; T.fillRect(Math.round(X(c.x)) - 2, Math.round(Y(c.y)) - 2, 5, 5); T.fillStyle = '#3c6ec8'; T.fillRect(Math.round(X(c.x)) - 1, Math.round(Y(c.y)) - 1, 3, 3); }
  for (const [col, grow] of [[INK, 0.7], [BAD, 0]]) {
    T.fillStyle = col;
    for (const p of PARTS) {
      const poly = partPoly(G.truck.x, G.truck.y, G.truck.h, { ...p, w: p.w + grow, wE: (p.wE || p.w) + grow, s0: p.s0 - grow / 2, s1: p.s1 + grow / 2 }, G.truck.loaded);
      T.beginPath(); poly.forEach(([x, y], i) => i ? T.lineTo(X(x), Y(y)) : T.moveTo(X(x), Y(y))); T.fill();
    }
  }
  // task panel
  panel(T, 203, 16, 254, 171);
  let y = 21;
  const L = (s, c = PAPER) => { text(T, s, 207, y, c); y += 9; };
  L('TASK', HI);
  if (G.truck.loaded) {
    const n = ANAME[G.task.face.a].split(/[ +]/);
    for (const w of n) L(w, AC[G.task.face.a] === '#ebebe1' ? PAPER : AC[G.task.face.a]);
    L(pad2(G.task.tags[0]) + '-' + pad2(G.task.tags[1]), HI);
  } else { L('RETURN', PAPER); L('TO', PAPER); L('PICKUP', HI); }
  y += 4; L('SCORE'); L(G.score, HI);
  L('COMBO'); L('X' + G.combo, GOOD);
  L('CLIPS'); L(G.scrapes, G.scrapes ? BAD : GOOD);
  if (mode.carts) { L('BUMPS'); L(G.bumps, G.bumps ? BAD : GOOD); }
  // message line
  T.fillStyle = UI; T.fillRect(0, 173, 202, 19);
  const msg = G.toastT > 0 ? G.toast : (G.truck.loaded ? 'DRIVE TO ' + tagStr(G.task) : 'RETURN TO PALLET PICKUP');
  text(T, msg, 6, 180, G.toastT > 0 ? HI : PAPER);
}

function drawDriveBottom() {
  const t = G.truck;
  const vw = SW, vh = SH;
  const [tcx, tcy] = truckCenter(t);
  let cx = tcx * PX - vw / 2, cy = tcy * PX - vh / 2;
  cx = Math.max(0, Math.min(world.width - vw, cx)); cy = Math.max(0, Math.min(world.height - vh, cy));
  cx = Math.round(cx); cy = Math.round(cy);
  B.drawImage(world, cx, cy, vw, vh, 0, 0, vw, vh);
  // target zone
  const z = t.loaded ? G.task.zone : STAGE;
  const blink = (G.clock * 4 | 0) % 2;
  B.strokeStyle = blink ? HI : '#ffffff'; B.lineWidth = 2; B.setLineDash([6, 4]);
  B.strokeRect(z[0] * PX - cx, z[1] * PX - cy, (z[2] - z[0]) * PX, (z[3] - z[1]) * PX); B.setLineDash([]); B.lineWidth = 1;
  // carts
  for (const c of G.carts) {
    const sx = c.x * PX - cx, sy = c.y * PX - cy;
    if (sx < -30 || sy < -30 || sx > vw + 30 || sy > vh + 30) continue;
    drawCart(B, c, sx, sy);
    if (c.stopped > 0 && c.stopped < 90) text(B, '!', sx - 1, sy - 22, BAD);
    if (G.help && G.help.cart === c) text(B, '?', sx - 1, sy - 22, HI);
  }
  // truck shadow + truck
  B.globalAlpha = .22; B.fillStyle = INK;
  for (const p of PARTS) {
    const poly = partPoly(t.x, t.y, t.h, p, t.loaded);
    B.beginPath(); poly.forEach(([x, y], i) => i ? B.lineTo(x * PX - cx + 3, y * PX - cy + 3) : B.moveTo(x * PX - cx + 3, y * PX - cy + 3)); B.fill();
  }
  B.globalAlpha = 1;
  drawTruck(B, t, Math.round(tcx * PX - cx), Math.round(tcy * PX - cy));
  // tiller / steering indicator: small arc showing where the drive wheel points
  if (t.moving) {
    const ang = (t.pulling ? t.h : t.h + Math.PI) + t.delta, dx = t.x * PX - cx, dy = t.y * PX - cy;
    B.strokeStyle = HI; B.lineWidth = 2; B.beginPath(); B.moveTo(dx, dy); B.lineTo(dx + Math.cos(ang) * 14, dy + Math.sin(ang) * 14); B.stroke(); B.lineWidth = 1;
  }
  if (G.honk > 0) {
    const hx = tcx * PX - cx, hy = tcy * PX - cy - 50;
    panel(B, hx - 22, hy - 4, hx + 22, hy + 8, UI2); textC(B, 'BEEP BEEP', hx, hy, HI);
  }
  // off-screen arrow toward target
  const zx = (z[0] + z[2]) / 2 * PX - cx, zy = (z[1] + z[3]) / 2 * PX - cy;
  if (zx < 0 || zy < 0 || zx > vw || zy > vh) {
    const ang = Math.atan2(zy - vh / 2, zx - vw / 2);
    const ax = vw / 2 + Math.cos(ang) * 100, ay = vh / 2 + Math.sin(ang) * 70;
    B.save(); B.translate(ax, ay); B.rotate(ang);
    B.fillStyle = INK; B.beginPath(); B.moveTo(9, 0); B.lineTo(-6, -7); B.lineTo(-6, 7); B.fill();
    B.fillStyle = HI; B.beginPath(); B.moveTo(6, 0); B.lineTo(-4, -5); B.lineTo(-4, 5); B.fill();
    B.restore();
  }
  // action prompt
  if (G.canAct) {
    panel(B, 70, 168, 186, 189, UI2);
    textC(B, 'PRESS A TO ' + G.canAct, 128, 176, HI);
  } else if (G.hint) {
    panel(B, 40, 168, 216, 189, UI2);
    textC(B, G.hint, 128, 176, PAPER);
  }
  if (G.help) drawHelp();
}

function drawHelp() {
  const h = G.help;
  panel(B, 10, 30, 245, 160, UI2);
  B.drawImage(IMG[h.cart.skin], 18, 40, 28, 52);
  text(B, 'EXCUSE ME!', 54, 42, HI);
  text(B, 'WHERE CAN I FIND', 54, 54, PAPER);
  text(B, h.product + '?', 54, 66, HI, 2);
  if (h.result) {
    textC(B, h.result, 128, 120, h.result.includes('+') ? GOOD : BAD);
    return;
  }
  h.btns = h.opts.map((a, i) => ({ a, r: [18 + i * 76, 100, 18 + i * 76 + 70, 132] }));
  for (const b of h.btns) {
    panel(B, b.r[0], b.r[1], b.r[2], b.r[3], UI);
    B.fillStyle = AC[b.a]; B.fillRect(b.r[0] + 3, b.r[1] + 3, b.r[2] - b.r[0] - 5, 3);
    const words = ANAME[b.a].split(/[ +]/);
    words.forEach((w, i) => textC(B, w, (b.r[0] + b.r[2]) / 2, b.r[1] + 11 + i * 8, PAPER));
  }
  bar(B, 18, 142, 218, h.t / 10, HI);
  text(B, 'TAP AN AREA', 18, 151, MUTE);
}

// ---------- battle drawing ----------
function caseIcon(ctx, x, y, w, h, c, ghost = 0, wrong = false) {
  const ic = productIcon(c.n), ix = Math.round(x + (w - 16) / 2), iy = y + 1;
  if (ghost) {
    ctx.fillStyle = '#a0a6b0';
    for (let i = x; i < x + w; i += 2) { ctx.fillRect(i, y, 1, 1); ctx.fillRect(i, y + h, 1, 1); }
    for (let j = y; j < y + h; j += 2) { ctx.fillRect(x, j, 1, 1); ctx.fillRect(x + w, j, 1, 1); }
    ctx.globalAlpha = ghost === 2 ? 0.75 : 0.4; ctx.drawImage(ic, ix, iy); ctx.globalAlpha = 1;
    textC(ctx, c.n, x + w / 2 + 1, y + h - 6, ghost === 2 ? '#e4e8ee' : '#6a7078');
    return;
  }
  ctx.fillStyle = INK; ctx.fillRect(x, y, w + 1, h + 1);
  ctx.fillStyle = '#c49660'; ctx.fillRect(x + 1, y + 1, w - 1, h - 1);
  ctx.fillStyle = '#e0b878'; ctx.fillRect(x + 1, y + 1, w - 1, 1);
  ctx.fillStyle = '#8c643c'; ctx.fillRect(x + 1, y + h - 1, w - 1, 1); ctx.fillRect(x + w - 1, y + 1, 1, h - 1);
  ctx.fillStyle = '#f4ecdc'; ctx.fillRect(ix, iy + 1, 16, 15);
  ctx.drawImage(ic, ix, iy + 1);
  textC(ctx, c.n, x + w / 2, y + h - 6, INK);
  if (wrong && state === 'results') { ctx.strokeStyle = BAD; ctx.strokeRect(x + .5, y + .5, w, h); }
}
function drawBattleTop() {
  const b = G.battle, a = G.task.face.a;
  // backdrop: the shelf section behind the pallet
  T.fillStyle = '#80848a'; T.fillRect(0, 13, SW, 110);
  const r = seeded(a.length * 97);
  for (let y = 17; y < 112; y += 6) {
    for (let x = 2; x < SW; x += 6) {
      if ((x / 6 | 0) % 8 === 0) { r(); continue; }
      T.fillStyle = LABEL_COLS[(r() * LABEL_COLS.length) | 0]; T.fillRect(x, y, 5, 5);
      T.fillStyle = 'rgba(0,0,0,.25)'; T.fillRect(x, y + 4, 5, 1);
    }
    if ((y - 17) % 24 === 18) { T.fillStyle = '#5c6068'; T.fillRect(0, y + 5, SW, 1); }
  }
  T.fillStyle = AC[a]; T.fillRect(0, 112, SW, 6);
  T.fillStyle = '#fafaf4'; T.fillRect(0, 118, SW, 7); T.fillStyle = INK; T.fillRect(0, 125, SW, 1);
  for (let i = 0; i < 3; i++) textC(T, a + '-' + pad2(G.task.tags[0] + i), 43 + i * 85, 119, BAD);
  T.fillStyle = '#c4c8c2'; T.fillRect(0, 126, SW, 66);
  // pallet as the opponent; the stack shrinks as cases come off
  const frac = b.queue.length / b.total, h = Math.round(23 * frac), sc = 4;
  const px = 136, top0 = 58;
  T.globalAlpha = .25; T.fillStyle = INK; T.fillRect(px + 8, 186, 27 * sc - 8, 6); T.globalAlpha = 1;
  T.drawImage(IMG.pal, 0, 24 - h, 27, 8 + h, px + (b.shake > 0 ? ri(5) - 2 : 0), top0 + (24 - h) * sc, 27 * sc, (8 + h) * sc);
  header(T);
  // next up
  panel(T, 4, 16, 113, 64);
  text(T, 'NEXT UP', 9, 20, HI);
  for (let i = 1; i <= 3; i++) if (b.queue[i]) caseIcon(T, 9 + (i - 1) * 34, 30, 30, 26, b.queue[i]);
  // status panel
  panel(T, 4, 130, 124, 189);
  text(T, ANAME[a], 9, 135, AC[a] === '#ebebe1' ? PAPER : AC[a]);
  text(T, pad2(G.task.tags[0]) + '-' + pad2(G.task.tags[1]), 92, 135, HI);
  text(T, 'CASES', 9, 147, PAPER); bar(T, 40, 146, 78, frac, BAD);
  text(T, b.queue.length + '/' + b.total, 9, 156, MUTE);
  text(T, 'SCORE ' + G.score, 50, 156, PAPER);
  text(T, 'COMBO X' + G.combo, 9, 172, G.combo >= 3 ? HI : PAPER, 2);
  // popups
  let py2 = 108;
  for (const p of G.popups.slice(-3)) {
    const al = Math.min(1, p.t * 2);
    T.globalAlpha = al;
    panel(T, 22, py2 - 4, 112, py2 + 10, UI2);
    textC(T, p.s, 67, py2, p.s === 'PLACED' ? PAPER : HI);
    T.globalAlpha = 1; py2 -= 18;
  }
}

function drawBattleBottom() {
  const b = G.battle, a = G.task.face.a;
  B.fillStyle = '#2c303c'; B.fillRect(0, 0, SW, SH);
  text(B, ANAME[a] + '  ' + a + '-' + pad2(G.task.tags[0]) + ' / ' + pad2(G.task.tags[0] + 1) + ' / ' + pad2(G.task.tags[1]), 6, 4, PAPER);
  const cur = b.queue[0];
  for (let sec = 0; sec < 3; sec++) {
    const x0 = SX0 + sec * (SEC_W + 1);
    B.fillStyle = INK; B.fillRect(x0, SY0, SEC_W + 1, SHELF_H * 4 + 5);
    B.fillStyle = '#aab0ba'; B.fillRect(x0 + 1, SY0 + 1, SEC_W - 1, SHELF_H * 4 + 3);
    for (let sh = 0; sh < 4; sh++) {
      const y0 = SY0 + 2 + sh * SHELF_H;
      B.fillStyle = '#6e7278'; B.fillRect(x0 + 1, y0 + SHELF_H - 3, SEC_W - 1, 3);
      B.fillStyle = '#fafaf4'; B.fillRect(x0 + 1, y0 + SHELF_H - 3, SEC_W - 1, 1);
    }
  }
  for (const s of b.slots) {
    if (s.got) caseIcon(B, s.x, s.y, SLOT_W, SLOT_H, s.got, 0, s.wrong);
    else caseIcon(B, s.x, s.y, SLOT_W, SLOT_H, s.want, mode.hint ? 2 : 1);
  }
  // new hire: highlight matching open spots while dragging
  if (b.drag && mode.hint && cur) {
    B.strokeStyle = GOOD; B.lineWidth = 2;
    for (const s of b.slots) if (!s.got && s.want.n === cur.n) B.strokeRect(s.x - 1, s.y - 1, SLOT_W + 3, SLOT_H + 3);
    B.lineWidth = 1;
  }
  // tray
  B.fillStyle = UI2; B.fillRect(0, 162, SW, 30);
  if (cur) {
    if (!b.drag) {
      const bob = Math.sin(G.clock * 6) > 0 ? 0 : 1;
      caseIcon(B, 6, 165 + bob, SLOT_W, SLOT_H - 2, cur);
    }
    text(B, 'DRAG THE CASE', 48, 168, HI);
    text(B, 'ONTO ITS SPOT', 48, 176, HI);
    text(B, mode.block ? 'WRONG SPOTS BLOCKED' : 'NO BLOCKING - AUDIT', 116, 168, MUTE);
    text(B, mode.block ? 'MATCHES GLOW GREEN' : 'AT END OF SHIFT', 116, 176, MUTE);
  } else textC(B, 'PALLET EMPTY!', 128, 172, GOOD, 2);
  if (b.drag && cur) {
    B.globalAlpha = .9; caseIcon(B, b.drag.x - b.drag.ox, b.drag.y - b.drag.oy, SLOT_W, SLOT_H, cur); B.globalAlpha = 1;
  }
  if (b.flashT > 0) { panel(B, 60, 70, 196, 92, UI2); textC(B, b.flash, 128, 78, BAD); }
}

// ---------- title & results ----------
let BTN = [];
function drawTitleTop(t) {
  T.fillStyle = '#9ac8d8'; T.fillRect(0, 0, SW, SH);
  const r = seeded(42);
  for (let y = 70; y < 140; y += 6) for (let x = 2; x < SW; x += 6) { T.fillStyle = LABEL_COLS[(r() * 10) | 0]; T.fillRect(x, y, 5, 5); }
  T.fillStyle = '#80848a'; T.fillRect(0, 140, SW, 3);
  T.fillStyle = '#c4c8c2'; T.fillRect(0, 143, SW, 49);
  for (let x = 0; x < SW; x += 16) { T.fillStyle = '#b4b8b2'; T.fillRect(x, 143, 1, 49); }
  T.fillStyle = INK; T.fillRect(60, 10, 136, 46); T.fillStyle = UI2; T.fillRect(62, 12, 132, 42);
  text(T, 'IDLA', 79, 18, INK, 6); text(T, 'IDLA', 77, 16, HI, 6);
  textC(T, 'SHELF STOCKER', 128, 60, INK);
  const bx = ((t * 30) % (SW + 140)) - 120;
  T.drawImage(IMG[CHARS[charIdx].pre + 'side'], bx, 100, 120, 64);
  textC(T, 'STICK WALK   A ACT   B HORN', 128, 178, INK);
}
function bigButton(r, label, sub, col) {
  panel(B, r[0], r[1], r[2], r[3], UI);
  B.fillStyle = col; B.fillRect(r[0] + 3, r[1] + 3, 4, r[3] - r[1] - 5);
  const tight = r[3] - r[1] < 32;
  text(B, label, r[0] + 10, r[1] + (tight ? 5 : 8), PAPER, 2);
  if (sub) text(B, sub, r[0] + 10, r[1] + (tight ? 18 : 23), MUTE);
}
function drawTitle(t) {
  drawTitleTop(t);
  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  const c = CHARS[charIdx];
  BTN = [];
  const play = [12, 8, 244, 42], ch = [12, 48, 244, 120], sc = [12, 126, 244, 160];
  bigButton(play, 'PLAY', 'CHOOSE A MODE AND START A SHIFT', GOOD);
  panel(B, ch[0], ch[1], ch[2], ch[3], UI);
  B.fillStyle = '#3c78d2'; B.fillRect(ch[0] + 3, ch[1] + 3, 4, ch[3] - ch[1] - 5);
  text(B, 'CHARACTER', 22, 56, PAPER, 2);
  text(B, 'NOW PLAYING AS', 22, 72, MUTE); text(B, c.name, 22, 81, HI);
  text(B, 'TAP TO CHANGE', 22, 106, MUTE);
  B.drawImage(IMG[c.por + ((t % 3.2) < 0.12 ? 'b' : 'a')], 204, 52, 34, 62);
  bigButton(sc, 'SCORES', API ? 'LEADERBOARDS FOR EVERY MODE' : 'YOUR BESTS ON THIS PHONE', HI);
  BTN.push({ r: play, f: () => { state = 'modes'; } });
  BTN.push({ r: ch, f: () => { state = 'chars'; G_sel = charIdx; } });
  BTN.push({ r: sc, f: () => openBoard('title') });
  textC(B, '4 PALLETS PER SHIFT', 128, 176, LINE);
}
function drawModes(t) {
  drawTitleTop(t);
  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  textC(B, 'CHOOSE A MODE', 128, 5, HI);
  const rows = [['newhire', 'NEW HIRE', 'WRONG SPOTS ARE BLOCKED'], ['easy', 'EASY', 'NO BLOCKING. AUDIT AT END'],
    ['medium', 'MEDIUM', 'EASY + CARTS IN THE AISLES'], ['hard', 'HARD', 'MEDIUM + CUSTOMERS NEED HELP'],
    ['daily', 'DAILY SHIFT', 'SAME PALLETS FOR EVERYONE TODAY']];
  BTN = [];
  rows.forEach(([k, n, d], i) => {
    const y = 14 + i * 31, r = [12, y, 244, y + 28];
    bigButton(r, n, d, [GOOD, '#3c78d2', HI, BAD, '#965aaa'][i]);
    BTN.push({ r, f: () => newShift(k) });
  });
  const back = [12, 168, 80, 188];
  panel(B, back[0], back[1], back[2], back[3], UI); textC(B, '< BACK', 46, 176, PAPER);
  BTN.push({ r: back, f: () => { state = 'title'; } });
}
let G_sel = 0;
function drawChars(t) {
  const c = CHARS[G_sel];
  // top: spotlight on the highlighted stocker
  T.fillStyle = '#1e2028'; T.fillRect(0, 0, SW, SH);
  T.fillStyle = '#2c303c';
  T.beginPath(); T.moveTo(40, 0); T.lineTo(100, 0); T.lineTo(128, 170); T.lineTo(12, 170); T.fill();
  T.fillStyle = '#3a3e4a'; T.beginPath(); T.ellipse(70, 168, 52, 10, 0, 0, Math.PI * 2); T.fill();
  const bob = Math.sin(t * 2.4) > 0.6 ? 1 : 0;
  T.drawImage(IMG[c.por + ((t % 3.2) < 0.12 ? 'b' : 'a')], 30, 22 + bob * 4 - 4, 80, 144);
  text(T, c.name, 140, 24, HI, 2);
  T.fillStyle = LINE; T.fillRect(140, 38, 106, 1);
  c.look.forEach((l, i) => text(T, l, 140, 46 + i * 10, PAPER));
  text(T, '8210 OPERATOR', 140, 82, MUTE);
  T.drawImage(IMG[c.pre + 'side'], 140, 100, 105, 56);
  // bottom: the roster
  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  textC(B, 'CHOOSE YOUR STOCKER', 128, 5, HI);
  BTN = [];
  CHARS.forEach((ch, i) => {
    const r = [14 + i * 118, 16, 14 + i * 118 + 110, 150], sel = i === G_sel;
    panel(B, r[0], r[1], r[2], r[3], sel ? '#3a3e4a' : UI);
    if (sel) { B.strokeStyle = HI; B.lineWidth = 2; B.strokeRect(r[0] + 1, r[1] + 1, r[2] - r[0] - 1, r[3] - r[1] - 1); B.lineWidth = 1; }
    B.drawImage(IMG[ch.por + 'a'], r[0] + 35, r[1] + 10, 40, 72);
    textC(B, ch.name, (r[0] + r[2]) / 2, r[1] + 92, sel ? HI : PAPER);
    if (i === charIdx) textC(B, 'CURRENT', (r[0] + r[2]) / 2, r[1] + 104, GOOD);
    BTN.push({ r, f: () => { G_sel = i; beep(520 + i * 80, 0.05); } });
  });
  const back = [14, 160, 100, 186], ok = [142, 160, 242, 186];
  panel(B, back[0], back[1], back[2], back[3], UI); textC(B, '< BACK', 57, 170, PAPER);
  panel(B, ok[0], ok[1], ok[2], ok[3], '#3c9650'); textC(B, 'CHOOSE', 192, 170, PAPER);
  BTN.push({ r: back, f: () => { state = 'title'; } });
  BTN.push({ r: ok, f: () => { setChar(G_sel); state = 'title'; beep(660, 0.08); beep(880, 0.1); } });
}
function drawResults() {
  T.fillStyle = UI2; T.fillRect(0, 0, SW, SH);
  textC(T, 'SHIFT COMPLETE', 128, 10, HI, 2);
  textC(T, mode.name + (mode.daily ? '  ' + G.day : ''), 128, 26, MUTE);
  const L = [['TIME', fmtClock(G.clock)], ['PLACEMENTS', G.placed], ['CORRECT', G.correct], ['BEST COMBO', 'X' + G.bestCombo], ['SHELF CLIPS', G.scrapes]];
  if (mode.block) L.push(['BLOCKED TRIES', G.blocked]);
  if (mode.carts) L.push(['CART BUMPS', G.bumps]);
  if (mode.help) L.push(['HELPED', G.helpOk + ' OF ' + (G.helpOk + G.helpBad)]);
  L.forEach(([k, v], i) => { text(T, k, 40, 42 + i * 12, PAPER); text(T, String(v), 216 - tw(v), 42 + i * 12, HI); });
  if (G.newBest && (tt * 3 | 0) % 2) textC(T, 'NEW BEST ON THIS PHONE!', 128, 178, GOOD);

  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  textC(B, 'SCORE', 128, 6, HI);
  const R = [['FLOOR SCORE', G.score], ['TIME BONUS', '+' + G.timeBonus]];
  if (!mode.block) R.push(['AUDIT: ' + G.auditErrors + ' WRONG', '-' + G.auditPenalty]);
  R.forEach(([k, v], i) => { text(B, k, 30, 20 + i * 11, PAPER); text(B, String(v), 226 - tw(v), 20 + i * 11, String(v)[0] === '-' && v !== '-0' ? BAD : PAPER); });
  const fy = 22 + R.length * 11;
  B.fillStyle = LINE; B.fillRect(30, fy - 2, 196, 1);
  text(B, 'FINAL', 30, fy + 2, HI, 2); text(B, String(G.final), 226 - tw(G.final, 2), fy + 2, HI, 2);
  const stars = G.final > 9000 ? 3 : G.final > 6000 ? 2 : G.final > 3000 ? 1 : 0;
  textC(B, ['KEEP PRACTICING', 'GOOD SHIFT', 'GREAT SHIFT', 'STORE MANAGER MATERIAL'][stars], 128, 82, [MUTE, PAPER, GOOD, HI][stars]);
  for (let i = 0; i < 3; i++) text(B, '*', 104 + i * 18, 92, i < stars ? HI : LINE, 3);
  const post = [12, 116, 244, 146], again = [12, 154, 124, 186], menu = [132, 154, 244, 186];
  BTN = [];
  if (G.posted) { panel(B, post[0], post[1], post[2], post[3], UI); textC(B, 'SCORE POSTED', 128, 127, GOOD); }
  else {
    panel(B, post[0], post[1], post[2], post[3], API ? '#3c6ec8' : UI);
    textC(B, API ? 'POST TO SCOREBOARD' : 'SCOREBOARD NOT SET UP', 128, API ? 125 : 128, API ? PAPER : MUTE, API ? 1 : 1);
    if (API) textC(B, 'ENTER YOUR INITIALS', 128, 135, '#c8d8f0');
    if (API) BTN.push({ r: post, f: () => { state = 'initials'; INI = (store('initials') || 'AAA').split(''); } });
  }
  panel(B, again[0], again[1], again[2], again[3], UI); textC(B, 'AGAIN', 68, 166, PAPER, 2);
  panel(B, menu[0], menu[1], menu[2], menu[3], UI); textC(B, 'MENU', 188, 166, PAPER, 2);
  BTN.push({ r: again, f: () => newShift(modeKey) }, { r: menu, f: () => { state = 'title'; } });
}

// ---------- initials entry (arcade style) ----------
let INI = ['A', 'A', 'A'];
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function cycle(i, d) { INI[i] = ABC[(ABC.indexOf(INI[i]) + d + 26) % 26]; beep(440 + d * 40, 0.04); }
function drawInitials() {
  T.fillStyle = UI2; T.fillRect(0, 0, SW, SH);
  textC(T, 'POST YOUR SCORE', 128, 30, HI, 2);
  textC(T, mode.name + (mode.daily ? '  ' + G.day : ''), 128, 50, MUTE);
  textC(T, String(G.final), 128, 72, PAPER, 5);
  textC(T, 'TIME ' + fmtClock(G.clock) + '   ' + CHARS[charIdx].name, 128, 110, MUTE);
  textC(T, 'SCORES ARE PUBLIC: INITIALS ONLY', 128, 160, LINE);
  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  textC(B, 'ENTER YOUR INITIALS', 128, 8, HI);
  BTN = [];
  for (let i = 0; i < 3; i++) {
    const x = 46 + i * 60, up = [x, 22, x + 44, 44], box = [x, 48, x + 44, 100], dn = [x, 104, x + 44, 126];
    panel(B, up[0], up[1], up[2], up[3], UI); textC(B, '+', x + 22, 30, PAPER);
    panel(B, box[0], box[1], box[2], box[3], '#3a3e4a'); textC(B, INI[i], x + 23, 62, HI, 5);
    panel(B, dn[0], dn[1], dn[2], dn[3], UI); textC(B, '-', x + 22, 112, PAPER);
    BTN.push({ r: up, f: () => cycle(i, -1) }, { r: box, f: () => cycle(i, 1) }, { r: dn, f: () => cycle(i, 1) });
  }
  const back = [12, 150, 116, 184], ok = [140, 150, 244, 184];
  panel(B, back[0], back[1], back[2], back[3], UI); textC(B, '< BACK', 64, 164, PAPER);
  panel(B, ok[0], ok[1], ok[2], ok[3], '#3c9650'); textC(B, 'POST', 192, 162, PAPER, 2);
  BTN.push({ r: back, f: () => { state = 'results'; } }, { r: ok, f: submitScore });
}

// ---------- scoreboard client ----------
const BOARD = {};
let BV = { mode: 'newhire', range: 'all', back: 'title', highlight: null, note: null };
async function submitScore() {
  const ini = INI.join(''); store('initials', ini);
  BV = { mode: modeKey, range: mode.daily ? 'today' : 'all', back: 'results', highlight: null, note: 'SENDING...' };
  state = 'board';
  try {
    const res = await fetch(API + '/scores', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: modeKey, initials: ini, score: G.final, time_s: Math.round(G.clock * 10) / 10,
        placed: G.placed, correct: G.correct, pallets: G.pallets, helps: G.helpOk, char: charIdx, device: DEVICE, day: G.day }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { BV.note = (j.error || 'COULD NOT POST').toUpperCase(); return; }
    G.posted = true; BV.highlight = j.id;
    BV.note = 'RANK #' + j.rank + (mode.daily ? ' TODAY' : ' ALL TIME');
    beep(784, 0.1); beep(1046, 0.15);
  } catch (e) { BV.note = 'OFFLINE - SAVED ON THIS PHONE'; }
  loadBoard(BV.mode, BV.range, true);
}
function boardKey(m, r) { return m + ':' + (m === 'daily' ? 'today' : r); }
async function loadBoard(m, r, force) {
  const k = boardKey(m, r), b = BOARD[k];
  if (!API) { BOARD[k] = { status: 'offline', rows: [] }; return; }
  if (b && !force && (b.status === 'loading' || Date.now() - b.at < 20000)) return;
  BOARD[k] = { status: 'loading', rows: b ? b.rows : [], at: Date.now() };
  try {
    const res = await fetch(`${API}/scores?mode=${m}&range=${m === 'daily' ? 'today' : r}`);
    const j = await res.json();
    BOARD[k] = { status: res.ok ? 'ok' : 'err', rows: j.rows || [], at: Date.now() };
  } catch (e) { BOARD[k] = { status: 'err', rows: [], at: Date.now() }; }
}
function openBoard(from) { BV = { mode: modeKey || 'newhire', range: 'all', back: from, highlight: null, note: null }; state = 'board'; }
function drawBoard() {
  const m = BV.mode, r = m === 'daily' ? 'today' : BV.range;
  loadBoard(m, r);
  const b = BOARD[boardKey(m, r)] || { status: 'loading', rows: [] };
  // top: header + this phone's bests
  T.fillStyle = UI2; T.fillRect(0, 0, SW, SH);
  textC(T, 'SCOREBOARD', 128, 10, HI, 2);
  textC(T, MODES[m].name + '  -  ' + (m === 'daily' ? todayUTC() : { today: 'TODAY', week: 'THIS WEEK', all: 'ALL TIME' }[r]), 128, 28, PAPER);
  if (BV.note) { panel(T, 30, 44, 226, 62, UI); textC(T, BV.note, 128, 51, BV.note.startsWith('RANK') ? GOOD : HI); }
  panel(T, 30, 74, 226, 150, UI);
  text(T, 'YOUR BESTS ON THIS PHONE', 38, 80, MUTE);
  MODE_KEYS.forEach((k, i) => {
    const best = store('best.' + k + (k === 'daily' ? '.' + todayUTC() : ''));
    text(T, MODES[k].name, 38, 94 + i * 11, k === m ? HI : PAPER);
    text(T, best ? String(best.score) : '-', 218 - tw(best ? best.score : '-'), 94 + i * 11, k === m ? HI : PAPER);
  });
  const msg = { offline: 'SCOREBOARD NOT SET UP YET', err: 'SCOREBOARD OFFLINE', loading: 'LOADING...' }[b.status];
  if (msg) textC(T, msg, 128, 168, b.status === 'loading' ? MUTE : BAD);
  // bottom: tabs + list
  B.fillStyle = UI2; B.fillRect(0, 0, SW, SH);
  BTN = [];
  MODE_KEYS.forEach((k, i) => {
    const t = [4 + i * 50, 3, 4 + i * 50 + 47, 19], on = k === m;
    panel(B, t[0], t[1], t[2], t[3], on ? '#3a3e4a' : UI);
    if (on) { B.fillStyle = HI; B.fillRect(t[0] + 2, t[3] - 2, t[2] - t[0] - 3, 2); }
    textC(B, MODE_SHORT[k], (t[0] + t[2]) / 2, 8, on ? HI : PAPER);
    BTN.push({ r: t, f: () => { BV.mode = k; BV.note = null; } });
  });
  if (m !== 'daily') ['today', 'week', 'all'].forEach((rg, i) => {
    const t = [40 + i * 60, 23, 40 + i * 60 + 56, 37], on = rg === r;
    panel(B, t[0], t[1], t[2], t[3], on ? '#3a3e4a' : UI2);
    textC(B, { today: 'TODAY', week: 'WEEK', all: 'ALL' }[rg], (t[0] + t[2]) / 2, 28, on ? HI : MUTE);
    BTN.push({ r: t, f: () => { BV.range = rg; } });
  });
  else textC(B, 'SAME PALLETS FOR EVERYONE TODAY', 128, 28, MUTE);
  text(B, '#', 10, 42, MUTE); text(B, 'NAME', 28, 42, MUTE); text(B, 'SCORE', 150 - tw('SCORE'), 42, MUTE); text(B, 'TIME', 200, 42, MUTE);
  if (!b.rows.length && b.status === 'ok') textC(B, 'NO SCORES YET - BE THE FIRST', 128, 90, MUTE);
  b.rows.slice(0, 10).forEach((row, i) => {
    const y = 52 + i * 11, me = row.id === BV.highlight;
    if (me) { B.fillStyle = '#3a3e4a'; B.fillRect(4, y - 2, 248, 10); }
    const col = me ? HI : i === 0 ? '#f0d878' : PAPER;
    text(B, String(i + 1), 10, y, col); text(B, row.initials, 28, y, col);
    B.fillStyle = row.char === 1 ? '#5280c8' : '#8a6040'; B.fillRect(46, y, 4, 5);
    text(B, String(row.score), 150 - tw(row.score), y, col); text(B, fmtClock(row.time_s), 200, y, col);
  });
  const back = [12, 166, 100, 188], ref = [156, 166, 244, 188];
  panel(B, back[0], back[1], back[2], back[3], UI); textC(B, '< BACK', 56, 174, PAPER);
  panel(B, ref[0], ref[1], ref[2], ref[3], UI); textC(B, 'REFRESH', 200, 174, PAPER);
  BTN.push({ r: back, f: () => { state = BV.back; } }, { r: ref, f: () => loadBoard(m, r, true) });
}
// ============================================================
// Loop & input
// ============================================================
let last = 0, tt = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; tt += dt;
  if (state === 'drive') {
    if (G.help) updateHelp(dt); else updateDrive(dt);
    drawDriveTop(); drawDriveBottom();
  } else if (state === 'battle') {
    G.clock += dt;
    const b = G.battle;
    if (b) {
      b.shake = Math.max(0, b.shake - dt); b.flashT = Math.max(0, b.flashT - dt);
      G.popups = G.popups.filter(p => (p.t -= dt) > 0);
      drawBattleTop(); drawBattleBottom();
    }
  } else if (state === 'title') drawTitle(tt);
  else if (state === 'modes') drawModes(tt);
  else if (state === 'initials') drawInitials();
  else if (state === 'board') drawBoard();
  else if (state === 'chars') drawChars(tt);
  else if (state === 'results') drawResults();
  input.aEdge = input.bEdge = false;
  requestAnimationFrame(frame);
}

function botXY(e) {
  const r = botC.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * SW, (e.clientY - r.top) / r.height * SH];
}
botC.addEventListener('pointerdown', e => {
  e.preventDefault(); botC.setPointerCapture(e.pointerId);
  const [x, y] = botXY(e);
  if (state === 'battle') return battlePointer('down', x, y);
  if (state === 'drive' && G.help && G.help.btns && !G.help.result) {
    const b = G.help.btns.find(b => inside(x, y, b.r)); if (b) answerHelp(b.a); return;
  }
  const b = BTN.find(b => inside(x, y, b.r)); if (b && ['title', 'modes', 'chars', 'results', 'initials', 'board'].includes(state)) { if (state !== 'initials') beep(660, 0.06); b.f(); }
});
botC.addEventListener('pointermove', e => { if (state === 'battle') { const [x, y] = botXY(e); battlePointer('move', x, y); } });
botC.addEventListener('pointerup', e => { if (state === 'battle') { const [x, y] = botXY(e); battlePointer('up', x, y); } });
botC.addEventListener('pointercancel', () => { if (G && G.battle) G.battle.drag = null; });

function bindBtn(id, key) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); if (!input[key]) { if (key === 'a') input.aEdge = true; if (key === 'b') input.bEdge = true; } input[key] = true; el.classList.add('on'); };
  const off = e => { e.preventDefault(); input[key] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
}
(function stick() {
  const base = document.getElementById('stick'), knob = document.getElementById('knob');
  let id = null;
  const set = e => {
    const r = base.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / (R * 0.75), dy = (e.clientY - (r.top + R)) / (R * 0.75);
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    input.jx = dx; input.jy = dy;
    knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  };
  base.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; base.setPointerCapture(id); set(e); });
  base.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; input.jx = input.jy = 0; knob.style.transform = ''; };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
})();
[['bA', 'a'], ['bB', 'b']].forEach(([i, k]) => bindBtn(i, k));
const KEYS = { z: 'a', ' ': 'a', x: 'b' };
const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const held = new Set();
function keyVec() { input.kx = 0; input.ky = 0; for (const k of held) { input.kx += ARROWS[k][0]; input.ky += ARROWS[k][1]; } }
addEventListener('keydown', e => { if (ARROWS[e.key]) { e.preventDefault(); held.add(e.key); keyVec(); return; } const k = KEYS[e.key]; if (!k) return; e.preventDefault(); if (!input[k]) { if (k === 'a') input.aEdge = true; if (k === 'b') input.bEdge = true; } input[k] = true; });
addEventListener('keyup', e => { if (ARROWS[e.key]) { held.delete(e.key); keyVec(); return; } const k = KEYS[e.key]; if (k) input[k] = false; });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

function fit() {
  const ctrlH = 150;
  const availH = innerHeight - ctrlH - 40, availW = innerWidth - 24;
  const s = Math.max(1, Math.min(availW / SW, availH / (SH * 2 + 10)));
  for (const c of [topC, botC]) { c.style.width = Math.floor(SW * s) + 'px'; c.style.height = Math.floor(SH * s) + 'px'; }
}
addEventListener('resize', fit);

loadImages().then(() => { buildWorld(); buildMap(); fit(); requestAnimationFrame(frame); });
