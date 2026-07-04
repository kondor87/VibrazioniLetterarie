-- ── Public Shelf ─────────────────────────────────────────────────────────────
-- Tabella che mappa user_id → username pubblico + flag di visibilità.
-- La pagina /u/[username] è pubblica e server-rendered; usa service role.

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT UNIQUE NOT NULL,
  public_shelf_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere (il server-side check di public_shelf_enabled è nel codice)
CREATE POLICY "up_select" ON user_profiles FOR SELECT USING (true);

-- Solo il proprietario può scrivere
CREATE POLICY "up_own_write" ON user_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
