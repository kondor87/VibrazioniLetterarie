-- ── Profondità del ripiano + terza fila "centro" ─────────────────────────────
-- Le librerie profonde possono avere 3 file: davanti / centro / dietro.

-- Numero di file per ripiano (2 = davanti/dietro, 3 = davanti/centro/dietro)
ALTER TABLE shelves ADD COLUMN IF NOT EXISTS row_depth INT NOT NULL DEFAULT 2 CHECK (row_depth IN (1, 2, 3));

-- Consenti la fila "centro" nelle collocazioni
ALTER TABLE book_placements DROP CONSTRAINT IF EXISTS book_placements_shelf_row_check;
ALTER TABLE book_placements ADD CONSTRAINT book_placements_shelf_row_check CHECK (shelf_row IN ('davanti', 'centro', 'dietro'));
