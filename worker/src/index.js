// IDLA scoreboard — Cloudflare Worker + D1
//
//   GET  /scores?mode=medium&range=today|week|all   -> { rows: [...] }   top 10
//   POST /scores   { mode, initials, score, time_s, placed, correct, pallets, helps, char, device, day }
//                                                     -> { id, rank }
//
// Scores come from a browser game, so they can be faked. The checks below reject results the game
// cannot produce and limit how often one phone can post. They keep the board sane, not secure.

const MODES = ['newhire', 'easy', 'medium', 'hard', 'daily'];
const CASES_PER_PALLET = 24;
const MAX_PER_CASE = 200;        // 100 base + combo bonus capped at 100
const HELP_BONUS = 150;
const MIN_SECONDS_PER_PALLET = 12;
const COOLDOWN_MS = 20_000;      // one post per phone every 20 s
const DAILY_POSTS = 40;          // per phone per 24 h

const today = () => new Date().toISOString().slice(0, 10);

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

function check(b) {
  if (!b || typeof b !== 'object') return 'bad request';
  if (!MODES.includes(b.mode)) return 'unknown mode';
  if (typeof b.initials !== 'string' || !/^[A-Z]{3}$/.test(b.initials)) return 'initials must be 3 letters';
  for (const k of ['score', 'time_s', 'placed', 'correct', 'pallets', 'helps', 'char']) {
    if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) return `bad ${k}`;
  }
  if (typeof b.device !== 'string' || b.device.length < 8 || b.device.length > 64) return 'bad device';
  if (b.pallets !== 4) return 'bad pallet count';
  const cases = b.pallets * CASES_PER_PALLET;
  if (b.placed !== cases || b.correct < 0 || b.correct > b.placed) return 'bad placement counts';
  if (b.time_s < b.pallets * MIN_SECONDS_PER_PALLET || b.time_s > 6 * 3600) return 'impossible time';
  if (b.helps < 0 || b.helps > 60 || (b.mode !== 'hard' && b.helps !== 0)) return 'bad help count';
  if (b.char !== 0 && b.char !== 1) return 'bad character';
  const timeBonus = Math.max(0, Math.round((150 + 45 * b.pallets - b.time_s) * 5));
  const ceiling = b.correct * MAX_PER_CASE + b.helps * HELP_BONUS + timeBonus;
  if (b.score > ceiling || b.score < -100000) return 'impossible score';
  if (b.mode === 'daily' && b.day !== today()) return 'daily shift has rolled over';
  return null;
}

async function top(env, mode, range) {
  let where = 'mode = ?1', args = [mode];
  if (mode === 'daily' || range === 'today') { where += ' AND day = ?2'; args.push(today()); }
  else if (range === 'week') { where += ' AND created_at >= ?2'; args.push(Date.now() - 7 * 864e5); }
  const { results } = await env.DB.prepare(
    `SELECT id, initials, score, time_s, char FROM scores WHERE ${where} ORDER BY score DESC, time_s ASC LIMIT 10`
  ).bind(...args).all();
  return results;
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (url.pathname !== '/scores') return json({ error: 'not found' }, 404, h);

    try {
      if (req.method === 'GET') {
        const mode = url.searchParams.get('mode') || 'newhire';
        const range = url.searchParams.get('range') || 'all';
        if (!MODES.includes(mode) || !['today', 'week', 'all'].includes(range)) return json({ error: 'bad query' }, 400, h);
        return json({ rows: await top(env, mode, range) }, 200, { ...h, 'Cache-Control': 'public, max-age=15' });
      }

      if (req.method === 'POST') {
        const origin = req.headers.get('Origin');
        if (origin && h['Access-Control-Allow-Origin'] !== origin) return json({ error: 'origin not allowed' }, 403, h);
        let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
        const err = check(b);
        if (err) return json({ error: err }, 422, h);

        const now = Date.now();
        const recent = await env.DB.prepare(
          'SELECT COUNT(*) AS n, MAX(created_at) AS last FROM scores WHERE device = ?1 AND created_at >= ?2'
        ).bind(b.device, now - 864e5).first();
        if (recent && recent.last && now - recent.last < COOLDOWN_MS) return json({ error: 'slow down' }, 429, h);
        if (recent && recent.n >= DAILY_POSTS) return json({ error: 'daily limit reached' }, 429, h);

        const day = today();
        const ins = await env.DB.prepare(
          `INSERT INTO scores (mode, initials, score, time_s, placed, correct, pallets, helps, char, day, device, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
        ).bind(b.mode, b.initials, Math.round(b.score), b.time_s, b.placed, b.correct, b.pallets, b.helps, b.char, day, b.device, now).run();
        const id = ins.meta.last_row_id;

        const rankSql = b.mode === 'daily'
          ? 'SELECT COUNT(*) AS n FROM scores WHERE mode = ?1 AND day = ?3 AND (score > ?2 OR (score = ?2 AND time_s < ?4))'
          : 'SELECT COUNT(*) AS n FROM scores WHERE mode = ?1 AND (score > ?2 OR (score = ?2 AND time_s < ?4))';
        const r = await env.DB.prepare(rankSql).bind(b.mode, Math.round(b.score), day, b.time_s).first();
        return json({ id, rank: (r ? r.n : 0) + 1 }, 201, h);
      }

      return json({ error: 'method not allowed' }, 405, h);
    } catch (e) {
      return json({ error: 'server error' }, 500, h);
    }
  },
};
