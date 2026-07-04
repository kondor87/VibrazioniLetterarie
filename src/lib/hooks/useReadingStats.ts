"use client";

import { useMemo } from "react";
import { useUserBooks } from "./useUserBooks";
import type { BookWithReading } from "@/types/book";
import { GENRE_COLORS } from "@/types/book";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export interface GenreStat {
  name: string;
  count: number;
  pages: number;
  avgRating: number | null;
  color: string;
  topBook: BookWithReading | null;
  authors: string[];
  pct: number; // % sul totale dei libri
}

export interface BookWithDays extends BookWithReading {
  days: number;
}

export interface ReadingStats {
  // KPI
  totalRead: number;
  totalPages: number;
  avgRating: string;          // formattato "8.3" o "—"
  avgRatingNum: number;       // numerico, 0 se assente
  maxRating: number;
  avgSpeed: number;           // pagine/giorno medio
  maxStreak: number;          // mesi consecutivi con un libro finito (costanza)
  // Aggregati testuali
  topAuthor: [string, number] | null;
  topGenre: [string, number] | null;
  topRatedTitles: string;
  bestYearEntry: [string, number] | null;
  // Serie per grafici
  booksPerYear: { year: string; libri: number; pagine: number }[];
  pagesPerMonth: { month: string; pagine: number }[];
  timelineQuarterly: { quarter: string; libri: number }[];
  ratingData: { voto: number; count: number }[];
  radarData: { month: string; libri: number }[];
  formatData: { format: string; count: number }[];
  speedData: { month: string; speed: number }[];
  genreData: { name: string; count: number; color: string }[]; // top 6, per donut
  genres: GenreStat[];        // tutti, per le genre cards
  // Record / traguardi
  topRated: BookWithReading[];
  longestBook: BookWithReading | null;
  fastestRead: BookWithDays | null;
  longestReadBook: BookWithDays | null;
  firstBook: BookWithReading | null;
  busyMonth: { month: string; libri: number } | null;
  // Meta
  totalLibrary: number;       // include non letti
  booksThisYear: number;
}

function compute(books: BookWithReading[]): ReadingStats {
  const read = books.filter(b => b.status === "letto" || b.status === "rileggendo");
  const totalPages = read.reduce((s, b) => s + (b.page_count ?? 0), 0);

  // Rating
  const ratings = read.filter(b => b.rating != null).map(b => b.rating!);
  const avgRatingNum = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
  const avgRating = ratings.length ? avgRatingNum.toFixed(1) : "—";
  const maxRating = ratings.reduce((m, r) => Math.max(m, r), 0);

  // Autori
  const authorCount: Record<string, number> = {};
  read.forEach(b => b.authors.forEach(a => { authorCount[a] = (authorCount[a] || 0) + 1; }));
  const topAuthorEntry = (Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;

  // Generi (conteggi)
  const genreCount: Record<string, number> = {};
  read.forEach(b => b.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
  const topGenreEntry = (Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;

  // Per anno
  const byYear: Record<string, number> = {};
  const pagesByYear: Record<string, number> = {};
  read.forEach(b => {
    if (b.finished_at) {
      const y = b.finished_at.slice(0, 4);
      byYear[y] = (byYear[y] || 0) + 1;
      pagesByYear[y] = (pagesByYear[y] || 0) + (b.page_count ?? 0);
    }
  });
  const booksPerYear = Object.entries(byYear).sort()
    .map(([year, libri]) => ({ year, libri, pagine: pagesByYear[year] ?? 0 }));
  const bestYearEntry = (Object.entries(byYear).sort((a, b) => b[1] - a[1])[0] ?? null) as [string, number] | null;

  // Pagine per mese (ultimi 12)
  const byMonth: Record<string, number> = {};
  read.forEach(b => {
    if (b.finished_at && b.page_count) {
      const m = parseInt(b.finished_at.slice(5, 7)) - 1;
      const key = `${b.finished_at.slice(0, 4)}-${MONTHS[m]}`;
      byMonth[key] = (byMonth[key] || 0) + b.page_count;
    }
  });
  const pagesPerMonth = Object.entries(byMonth).slice(-12).map(([key, pagine]) => ({
    month: key.split("-")[1], pagine,
  }));

  // Timeline trimestrale
  const quarterData: Record<string, number> = {};
  read.forEach(b => {
    if (!b.finished_at) return;
    const d = new Date(b.finished_at);
    const q = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
    quarterData[q] = (quarterData[q] || 0) + 1;
  });
  const timelineQuarterly = Object.entries(quarterData).sort().map(([quarter, libri]) => ({ quarter, libri }));

  // Distribuzione voti
  const ratingDist: Record<number, number> = {};
  read.forEach(b => { if (b.rating) ratingDist[b.rating] = (ratingDist[b.rating] || 0) + 1; });
  const ratingData = Object.entries(ratingDist).sort(([a], [b]) => Number(a) - Number(b))
    .map(([voto, count]) => ({ voto: Number(voto), count }));

  // Radar stagionalità
  const monthCount = new Array(12).fill(0);
  read.forEach(b => { if (b.finished_at) monthCount[new Date(b.finished_at).getMonth()]++; });
  const radarData = MONTHS.map((m, i) => ({ month: m, libri: monthCount[i] }));
  const busyMonth = radarData.reduce<{ month: string; libri: number } | null>(
    (best, m) => (!best || m.libri > best.libri ? m : best), null);

  // Formato (su tutta la libreria)
  const formatCount: Record<string, number> = {};
  books.forEach(b => { formatCount[b.format] = (formatCount[b.format] || 0) + 1; });
  const formatData = Object.entries(formatCount).map(([format, count]) => ({ format, count }));

  // Velocità di lettura — con guard-rail anti-artefatto.
  // Date da import di massa o placeholder (es. start===finish su libri lunghi) possono
  // produrre velocità irreali: scartiamo i valori oltre una soglia plausibile.
  const READ_SPEED_CAP = 200;     // p/giorno: oltre è quasi certamente un errore di date
  const MAX_PLAUSIBLE_DAYS = 730; // 2 anni: durate maggiori sono probabili date errate
  const daysBetween = (b: BookWithReading) =>
    Math.max(1, Math.round((new Date(b.finished_at!).getTime() - new Date(b.started_at!).getTime()) / 86400000));

  const speedData = read
    .filter(b => b.started_at && b.finished_at && b.page_count)
    .map(b => ({ month: b.finished_at!.slice(0, 7), speed: Math.round(b.page_count! / daysBetween(b)) }))
    .filter(d => d.speed > 0 && d.speed <= READ_SPEED_CAP)
    .sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  const avgSpeed = speedData.length
    ? Math.round(speedData.reduce((s, d) => s + d.speed, 0) / speedData.length) : 0;

  // Costanza: la più lunga sequenza di MESI consecutivi con almeno un libro finito.
  // Nota: una streak giornaliera non è derivabile dai dati (manca un log di lettura
  // quotidiano; abbiamo solo started_at/finished_at per libro). Il mese è la
  // granularità onesta e robusta.
  const finishedMonths = Array.from(
    new Set(read.filter(b => b.finished_at).map(b => b.finished_at!.slice(0, 7)))
  ).sort();
  let maxStreak = 0, run = 0, prevIdx: number | null = null;
  for (const m of finishedMonths) {
    const [y, mo] = m.split("-").map(Number);
    const idx = y * 12 + (mo - 1);
    run = (prevIdx !== null && idx === prevIdx + 1) ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    prevIdx = idx;
  }

  // Record
  const topRated = [...read].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);
  const longestBook = [...read].sort((a, b) => (b.page_count ?? 0) - (a.page_count ?? 0))[0] ?? null;
  const withDays = read
    .filter(b => b.started_at && b.finished_at)
    .map(b => ({ ...b, days: daysBetween(b) }));
  // "Letto più in fretta": solo libri di lunghezza significativa e velocità plausibile,
  // così opuscoli o date errate non falsano il record.
  const fastestRead = [...withDays]
    .filter(b => b.page_count != null && b.page_count >= 100 && Math.round(b.page_count / b.days) <= READ_SPEED_CAP)
    .sort((a, b) => a.days - b.days)[0] ?? null;
  // "Lettura più lunga": esclude outlier oltre 2 anni (probabili date errate).
  const longestReadBook = [...withDays]
    .filter(b => b.days <= MAX_PLAUSIBLE_DAYS)
    .sort((a, b) => b.days - a.days)[0] ?? null;
  const firstBook = [...read].sort((a, b) => (a.started_at ?? "").localeCompare(b.started_at ?? ""))[0] ?? null;

  const maxRatedBooks = read.filter(b => b.rating === maxRating);
  const topRatedTitles = maxRating > 0
    ? maxRatedBooks.slice(0, 2).map(b => b.title.split(" ").slice(0, 3).join(" ")).join(", ")
      + (maxRatedBooks.length > 2 ? "…" : "")
    : "";

  // Donut top 6
  const genreData = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => ({ name, count, color: GENRE_COLORS[name] || "#5A5A5A" }));

  // Genre cards (su tutta la libreria, come in /generi)
  const genreMap = new Map<string, BookWithReading[]>();
  books.forEach(b => b.genres?.forEach(g => {
    if (!genreMap.has(g)) genreMap.set(g, []);
    genreMap.get(g)!.push(b);
  }));
  const totalLibrary = books.length;
  const genres: GenreStat[] = Array.from(genreMap.entries()).map(([name, gBooks]) => {
    const rated = gBooks.filter(b => b.rating);
    const authorSet = new Set<string>();
    gBooks.forEach(b => b.authors.forEach(a => authorSet.add(a)));
    return {
      name,
      count: gBooks.length,
      pages: gBooks.reduce((s, b) => s + (b.page_count ?? 0), 0),
      avgRating: rated.length ? parseFloat((rated.reduce((s, b) => s + b.rating!, 0) / rated.length).toFixed(1)) : null,
      color: GENRE_COLORS[name] ?? "#5A5A5A",
      topBook: [...gBooks].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null,
      authors: Array.from(authorSet).slice(0, 3),
      pct: totalLibrary > 0 ? Math.round((gBooks.length / totalLibrary) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);

  const currentYear = new Date().getFullYear();
  const booksThisYear = read.filter(b => b.finished_at?.startsWith(String(currentYear))).length;

  return {
    totalRead: read.length, totalPages, avgRating, avgRatingNum, maxRating, avgSpeed, maxStreak,
    topAuthor: topAuthorEntry, topGenre: topGenreEntry, topRatedTitles, bestYearEntry,
    booksPerYear, pagesPerMonth, timelineQuarterly, ratingData, radarData, formatData, speedData,
    genreData, genres,
    topRated, longestBook, fastestRead, longestReadBook, firstBook, busyMonth,
    totalLibrary, booksThisYear,
  };
}

/**
 * Hook condiviso che combina tutta la logica di calcolo statistiche
 * (precedentemente duplicata tra Dashboard, Statistiche e Generi).
 * Source of truth: useUserBooks().
 */
export function useReadingStats(): { stats: ReadingStats; loading: boolean; totalBooks: number } {
  const { books, loading } = useUserBooks();
  const stats = useMemo(() => compute(books), [books]);
  return { stats, loading, totalBooks: books.length };
}
