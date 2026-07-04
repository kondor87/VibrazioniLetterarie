// ── Community: tipi e soglie condivise ───────────────────────────────────────
// Gli aggregati sono ANONIMI (nessun user_id). La soglia di k-anonimato evita
// che con pochissimi lettori una statistica riveli di fatto il singolo.

export const MIN_READERS = 2;          // social proof sul libro: serve ≥2 lettori
export const MIN_DEVOURED_SAMPLE = 2;  // most devoured: ≥2 completamenti cronometrati
export const MIN_ABANDON_READERS = 3;  // most abandoned: ≥3 lettori (tasso significativo)
export const MIN_PERCENTILE_SAMPLE = 4; // percentile velocità: ≥4 letture cronometrate
export const MIN_MY_BOOKS = 5;          // affinità: serve una libreria minima per confrontare
export const MIN_SHARED_FOR_TWIN = 3;   // affinità: ≥3 libri in comune per essere "anima gemella"
export const TWIN_LOVE_RATING = 8;      // soglia voto per cui un twin "ama" un libro

// Riga grezza della matview community_book_stats
export interface RawCommunityStat {
  book_id: string;
  title: string;
  authors: string[] | null;
  cover_url: string | null;
  isbn_13: string | null;
  page_count: number | null;
  readers: number;
  completed: number;
  abandoned: number;
  reading_now: number;
  added_7d: number;
  avg_rating: number | null;
  rating_count: number;
  avg_pages_per_day: number | null;
  avg_days_to_finish: number | null;
  velocity_sample: number;
}

// Statistiche di un singolo libro per il social proof
export interface CommunityBookStat {
  enough: boolean;            // true se ≥ MIN_READERS
  readers: number;
  completed: number;
  reading_now: number;
  abandoned: number;
  abandon_rate: number | null;   // 0..1
  avg_rating: number | null;
  rating_count: number;
  avg_days_to_finish: number | null;
  avg_pages_per_day: number | null;
  velocity_sample: number;            // quante letture cronometrate
  velocity_percentile: number | null; // 0..100: "più veloce del N% dei lettori" (null se pochi dati o lettura non cronometrata)
}

export interface LeaderboardEntry {
  book_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  readers: number;
  value: number;          // metrica della classifica
  label: string;          // valore formattato per la UI
}

// Risultato di ricerca community (comportamento di un libro tracciato)
export interface CommunitySearchResult {
  book_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  readers: number;
  reading_now: number;
  avg_rating: number | null;
  avg_days_to_finish: number | null;
  avg_pages_per_day: number | null;
  abandon_rate: number | null;
}

export interface CommunityLeaderboards {
  books_tracked: number;
  most_added: LeaderboardEntry[];     // ultimi 7 giorni
  most_devoured: LeaderboardEntry[];  // pagine/giorno (decrescente)
  most_abandoned: LeaderboardEntry[]; // tasso di abbandono (decrescente)
}

// Anime gemelle di lettura (taste-twins)
export interface AffinityRec {
  book_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  twin_count: number;        // quanti lettori affini l'hanno amato
  avg_twin_rating: number;   // voto medio dei twin
}

export interface AffinityResult {
  twins: number;             // numero di lettori affini trovati
  my_books: number;          // libri nella tua libreria (per messaggi cold-start)
  shared_sample: string[];   // titoli dei libri condivisi che definiscono l'affinità ("il perché")
  recommendations: AffinityRec[];
}

// Coercizione: PostgREST può restituire numeric come stringa
export function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
export function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export function toBookStat(r: RawCommunityStat): CommunityBookStat {
  const readers = num(r.readers);
  const abandoned = num(r.abandoned);
  const completed = num(r.completed);
  const reading = num(r.reading_now);
  // denom = chi ha realmente avuto un esito (finito o abbandonato o in corso)
  const denom = completed + abandoned + reading;
  return {
    enough: readers >= MIN_READERS,
    readers,
    completed,
    reading_now: reading,
    abandoned,
    abandon_rate: denom > 0 ? abandoned / denom : null,
    avg_rating: numOrNull(r.avg_rating),
    rating_count: num(r.rating_count),
    avg_days_to_finish: numOrNull(r.avg_days_to_finish),
    avg_pages_per_day: numOrNull(r.avg_pages_per_day),
    velocity_sample: num(r.velocity_sample),
    velocity_percentile: null,   // calcolato a parte dalla route (serve il ritmo dell'utente)
  };
}
