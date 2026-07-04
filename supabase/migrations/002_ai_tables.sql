-- ── AI Asset Tables ──────────────────────────────────────────────────────────
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Architecture:
--   books_ai_metadata  — vita vissuta per ogni libro, globale (un'analisi per tutti gli utenti)
--   user_ai_profiles   — profilo lettore per utente (generato ogni ~10 libri)
--   user_timeline_years — capitolo narrativo per anno per utente

-- 1. Catalogo globale: vita vissuta di ogni libro ─────────────────────────────
CREATE TABLE IF NOT EXISTS books_ai_metadata (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID UNIQUE NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  vita_vissuta   TEXT NOT NULL,
  mondo          TEXT NOT NULL,
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE books_ai_metadata ENABLE ROW LEVEL SECURITY;

-- Qualsiasi utente autenticato può leggere e scrivere (dati pubblici non sensibili)
CREATE POLICY "bam_read"   ON books_ai_metadata FOR SELECT TO authenticated USING (true);
CREATE POLICY "bam_insert" ON books_ai_metadata FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bam_update" ON books_ai_metadata FOR UPDATE TO authenticated USING (true);

-- 2. Profilo lettore per utente ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_ai_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype                 JSONB NOT NULL DEFAULT '{}',
  -- archetype shape: { name, motto, description, strengths[], blind_spots[] }
  book_count_at_generation  INT NOT NULL DEFAULT 0,
  generated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_ai_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_own" ON user_ai_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Timeline narrativa per anno per utente ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_timeline_years (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year          INT NOT NULL,
  nome_anno     TEXT NOT NULL DEFAULT '',
  archetype     TEXT NOT NULL DEFAULT '',
  mood          TEXT NOT NULL DEFAULT '',
  narrative     TEXT NOT NULL DEFAULT '',
  libro_simbolo JSONB NOT NULL DEFAULT '{}',
  -- libro_simbolo shape: { title, author, reason }
  book_count    INT NOT NULL DEFAULT 0,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, year)
);

ALTER TABLE user_timeline_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uty_own" ON user_timeline_years FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
