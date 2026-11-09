-- IDLA scoreboard. Apply with:
--   npx wrangler d1 execute idla-scores --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mode       TEXT    NOT NULL,          -- newhire | easy | medium | hard | daily
  initials   TEXT    NOT NULL,          -- three letters A-Z
  score      INTEGER NOT NULL,
  time_s     REAL    NOT NULL,          -- shift length in seconds
  placed     INTEGER NOT NULL,
  correct    INTEGER NOT NULL,
  pallets    INTEGER NOT NULL,
  helps      INTEGER NOT NULL DEFAULT 0,
  char       INTEGER NOT NULL DEFAULT 0, -- which stocker was played
  day        TEXT    NOT NULL,          -- UTC date, YYYY-MM-DD
  device     TEXT    NOT NULL,          -- random id stored on the phone, used for rate limits
  created_at INTEGER NOT NULL           -- unix ms
);
CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores (mode, score DESC, time_s ASC);
CREATE INDEX IF NOT EXISTS idx_scores_mode_day   ON scores (mode, day, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_mode_time  ON scores (mode, created_at);
CREATE INDEX IF NOT EXISTS idx_scores_device     ON scores (device, created_at);
