-- 0001_user_sync.sql
-- P3-2: Cross-device sync of P2 LS data (favorites/recent/history)
-- 3 tables: one row per user per collection
-- RLS: clerk_user_id must match auth.jwt() ->> 'sub'
-- Clerk JWT verification: configured in Supabase dashboard (Auth → JWT Settings → Clerk JWKS)
--   This is an operational step, not in code. See docs/superpowers/specs/2026-07-01-p3-2-sync-design.md §11 (R2).

CREATE TABLE IF NOT EXISTS user_favorites (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_recent (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_history (
  clerk_user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- Policy: users can only SELECT/INSERT/UPDATE/DELETE their own row.
-- clerk_user_id column must match the Clerk user ID from the verified JWT.
-- Supabase auth.jwt() ->> 'sub' extracts the "sub" claim from the JWT.
CREATE POLICY "favorites_self" ON user_favorites
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "recent_self" ON user_recent
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "history_self" ON user_history
  FOR ALL USING (clerk_user_id = auth.jwt() ->> 'sub');
