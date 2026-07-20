export type ReadingStatus =
  | "da_leggere"
  | "in_corso"
  | "letto"
  | "abbandonato"
  | "rileggendo";

export type BookFormat = "ebook" | "cartaceo" | "audio";

export type BookSource =
  | "manual"
  | "kindle"
  | "goodreads"
  | "csv"
  | "readwise";

export interface Book {
  id: string;
  user_id: string;
  isbn_13: string | null;
  isbn_10: string | null;
  open_library_id: string | null;
  google_books_id: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  published_year: number | null;
  language: string;
  page_count: number | null;
  genres: string[];
  cover_url: string | null;
  description: string | null;
  cover_custom_url: string | null;
  edition_note: string | null;
  format: BookFormat;
  source: BookSource;
  created_at: string;
  updated_at: string;
}

export interface ReadingEntry {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  started_at: string | null;
  finished_at: string | null;
  reading_time_h: number | null;
  rating: number | null;
  review: string | null;
  is_favorite: boolean;
  reread_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookWithReading extends Book {
  book_id: string;            // FK to global books catalog (books.id)
  status: ReadingStatus | null;
  rating: number | null;
  review: string | null;
  is_favorite: boolean;
  started_at: string | null;
  finished_at: string | null;
  reading_time_h: number | null;
  reread_count: number;
  // reading_speed è SEMPRE calcolato da pagine/giorni → vedi classifyReadingSpeed()
}

// ── Velocità di lettura percepita: calcolata da pagine/giorni ──────────────────
export type ReadingSpeed = "lento" | "medio" | "veloce" | "divorato";

export const READING_SPEED_META: Record<ReadingSpeed, { label: string; color: string }> = {
  lento:    { label: "Lento",    color: "#8A6A4A" },
  medio:    { label: "Medio",    color: "#C89010" },
  veloce:   { label: "Veloce",   color: "#3D7A5A" },
  divorato: { label: "Divorato", color: "#d4a15e" },
};

// Pagine/giorno di un singolo libro (null se mancano i dati o è implausibile)
function bookPagesPerDay(book: BookWithReading): number | null {
  if (!book.started_at || !book.finished_at || !book.page_count) return null;
  const days = Math.max(1, Math.round(
    (new Date(book.finished_at).getTime() - new Date(book.started_at).getTime()) / 86400000));
  const ppd = book.page_count / days;
  return ppd > 0 && ppd <= 400 ? ppd : null; // oltre 400 p/g = quasi certamente date errate
}

/** Ritmo personale medio (pagine/giorno) sui libri completati con date valide.
 *  null se i dati sono troppo pochi → si useranno soglie assolute. */
export function personalPace(books: BookWithReading[]): number | null {
  const vals = books
    .map(bookPagesPerDay)
    .filter((v): v is number => v != null && v <= 200); // gli outlier non sporcano la media
  if (vals.length < 3) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Classifica la velocità: se è noto il ritmo personale (avgPpd), è RELATIVA al tuo ritmo;
 *  altrimenti ricade su soglie assolute. */
export function classifyReadingSpeed(book: BookWithReading, avgPpd?: number | null): ReadingSpeed | null {
  const ppd = bookPagesPerDay(book);
  if (ppd == null) return null;
  if (avgPpd && avgPpd > 0) {
    const r = ppd / avgPpd;            // >1 = più veloce della tua media
    if (r >= 1.6)  return "divorato";
    if (r >= 1.15) return "veloce";
    if (r >= 0.7)  return "medio";
    return "lento";
  }
  if (ppd >= 60)  return "divorato";
  if (ppd >= 35)  return "veloce";
  if (ppd >= 18)  return "medio";
  return "lento";
}

export interface Quote {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page_number: number | null;
  location: string | null;
  chapter: string | null;
  note: string | null;
  is_favorite: boolean;
  source: BookSource;
  created_at: string;
}

export interface UserGenre {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
}

// Ricerca libri (da API esterne o inserimento manuale)
export interface BookSearchResult {
  source: "openlibrary" | "google" | "manual" | "sbn";
  title: string;
  subtitle?: string;
  authors: string[];
  isbn_13?: string;
  isbn_10?: string;
  publisher?: string;
  year?: number | string;
  pages?: number;
  language?: string;
  cover_url?: string;
  open_library_id?: string;
  google_books_id?: string;
  categories?: string[];   // Generi da Google Books (già mappati in italiano)
  description?: string;    // Quarta di copertina
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  da_leggere:  "Da leggere",
  in_corso:    "In corso",
  letto:       "Letto",
  abbandonato: "Abbandonato",
  rileggendo:  "Rileggendo",
};

export const STATUS_COLORS: Record<ReadingStatus, string> = {
  da_leggere:  "text-text-sec border-text-sec/30",
  in_corso:    "text-amber border-amber/30",
  letto:       "text-gold border-gold/30",
  abbandonato: "text-text-muted border-text-muted/30",
  rileggendo:  "text-genre-crescita border-genre-crescita/30",
};

export const GENRE_COLORS: Record<string, string> = {
  Narrativa:            "#7B3F8A",
  Giallo:               "#8A7010",
  Thriller:             "#3A2A6A",
  Horror:               "#7A1A1A",
  Storico:              "#6B3D1A",
  Avventura:            "#1A5A3A",
  Fantasy:              "#2A6B3A",
  Saggistica:           "#2A5080",
  Biografie:            "#7A3020",
  "Crescita Personale": "#3D7A5A",
  Psicologia:           "#5A3080",
  Business:             "#8A5020",
  Altro:                "#5A5A5A",
};
