-- ── Censimento fisico della libreria ─────────────────────────────────────────
-- Modella la libreria reale di casa: Librerie (mobili/stanze) → Ripiani →
-- collocazione di ogni libro in una fila "davanti" o "dietro" (doppia profondità).

-- 1. Librerie (mobili) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookcases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Libreria',
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookcases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_own" ON bookcases FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Ripiani (dentro una libreria) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelves (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookcase_id  UUID NOT NULL REFERENCES bookcases(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Ripiano',
  sort_order   INT  NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sh_own" ON shelves FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Collocazione di ogni libro (un libro = una posizione) ─────────────────────
CREATE TABLE IF NOT EXISTS book_placements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_book_id  UUID NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
  shelf_id      UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  shelf_row     TEXT NOT NULL DEFAULT 'davanti' CHECK (shelf_row IN ('davanti','dietro')),
  position      INT  NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_book_id)
);
ALTER TABLE book_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_own" ON book_placements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_book_placements_shelf ON book_placements(shelf_id);
CREATE INDEX IF NOT EXISTS idx_shelves_bookcase ON shelves(bookcase_id);
