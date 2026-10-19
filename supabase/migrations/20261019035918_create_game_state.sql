/*
# Create game state table for Mounting Yard racing manager

1. New Tables
- `game_state`
  - `id` (text, primary key) — always "main" for the single save
  - `data` (jsonb) — the full save: week, cash, horses[], races[], bets[], sires cache, etc.
  - `updated_at` (timestamptz)
2. Security
- Enable RLS on `game_state`.
- Single-tenant, no sign-in screen: allow anon + authenticated full CRUD so the
  anon-key frontend can read and write its own save.
*/

CREATE TABLE IF NOT EXISTS game_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_game" ON game_state;
CREATE POLICY "anon_read_game"
ON game_state FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_game" ON game_state;
CREATE POLICY "anon_insert_game"
ON game_state FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_game" ON game_state;
CREATE POLICY "anon_update_game"
ON game_state FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_game" ON game_state;
CREATE POLICY "anon_delete_game"
ON game_state FOR DELETE
TO anon, authenticated USING (true);
