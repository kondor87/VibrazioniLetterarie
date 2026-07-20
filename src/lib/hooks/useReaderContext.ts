"use client";

import { useMemo } from "react";
import { useUserBooks } from "./useUserBooks";
import type { BookWithReading } from "@/types/book";

// ── Payload per /api/ai/identita ────────────────────────────────────────────────
export interface IdentitaPayload {
  totalBooks: number;
  readBooks: number;
  avgRating: number;
  totalPages: number;
  yearsActive: number;
  topGenres: { name: string; pct: number; count: number }[];
  topAuthors: string[];
  topRatedBooks: { title: string; author: string; rating: number }[];
  favoriteBooks: { title: string; author: string }[];
  readingByYear: Record<string, number>;
  allBooks: { title: string; author: string; rating: number | null; year: number | null }[];
}

// ── Payload per /api/ai/raccomandazioni ─────────────────────────────────────────
export interface RaccomandazioniPayload {
  totalRead: number;
  avgRating: number;
  topGenres: string[];
  topAuthors: string[];
  topRatedBooks: { title: string; author: string; rating: number }[];
  recentBooks: { title: string; author: string }[];
  alreadyRead: string[];
}

// ── Payload per /api/ai/insights e /api/ai/chat ─────────────────────────────────
export interface InsightsPayload {
  totalBooks: number;
  readBooks: number;
  avgRating: number;
  topGenres: string[];
  favoriteAuthors: string[];
  topBooks: { title: string; author: string; rating: number }[];
  totalPages: number;
  estHours: number;
  recentBooks: { title: string; author: string; rating: number; year: number }[];
  favoriteBooks: { title: string; author: string; rating: number }[];
  readingByYear: Record<string, number>;
  allBooks: { title: string; author: string; rating: number | null; year: number | null }[];
}

export interface ReaderContext {
  identita: IdentitaPayload;
  raccomandazioni: RaccomandazioniPayload;
  insights: InsightsPayload;
}

function build(books: BookWithReading[]): ReaderContext {
  const read = books.filter(b => b.status === "letto" || b.status === "rileggendo");

  const totalPages = read.reduce((s, b) => s + (b.page_count ?? 0), 0);
  const estHours = Math.round(totalPages / 30);

  const ratings = read.filter(b => b.rating != null).map(b => b.rating!);
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;

  // Generi
  const genreCount: Record<string, number> = {};
  books.forEach(b => b.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
  const genresSorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
  const topGenresDetailed = genresSorted.slice(0, 6).map(([name, count]) => ({
    name, count, pct: books.length > 0 ? Math.round((count / books.length) * 100) : 0,
  }));
  const topGenresFlat = genresSorted.slice(0, 5).map(([g]) => g);

  // Autori
  const authorCount: Record<string, number> = {};
  books.forEach(b => b.authors?.forEach(a => { authorCount[a] = (authorCount[a] || 0) + 1; }));
  const authorsSorted = Object.entries(authorCount).sort((a, b) => b[1] - a[1]);
  const topAuthors = authorsSorted.slice(0, 8).map(([a]) => a);
  const favoriteAuthors = authorsSorted.slice(0, 6).map(([a]) => a);

  // Top rated
  const topRated = [...read].filter(b => b.rating != null).sort((a, b) => b.rating! - a.rating!);
  const topRatedBooks = topRated.slice(0, 8).map(b => ({ title: b.title, author: b.authors[0] ?? "", rating: b.rating! }));
  const topBooks = topRated.slice(0, 6).map(b => ({ title: b.title, author: b.authors[0] ?? "", rating: b.rating! }));

  // Preferiti
  const favs = books.filter(b => b.is_favorite);
  const favoriteBooks = favs.slice(0, 4).map(b => ({ title: b.title, author: b.authors[0] ?? "" }));
  const favoriteBooksRated = favs.map(b => ({ title: b.title, author: b.authors[0] ?? "", rating: b.rating ?? 0 }));

  // Recenti
  const recentSorted = [...read].sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""));
  const recentBooks = recentSorted.slice(0, 5).map(b => ({ title: b.title, author: b.authors[0] ?? "" }));
  const recentBooksFull = recentSorted.slice(0, 6).map(b => ({
    title: b.title, author: b.authors[0] ?? "", rating: b.rating ?? 0,
    year: Number(b.finished_at?.slice(0, 4) ?? 0),
  }));

  // Per anno
  const readingByYear: Record<string, number> = {};
  read.forEach(b => {
    const year = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
    if (year) readingByYear[year] = (readingByYear[year] || 0) + 1;
  });
  const years = Object.keys(readingByYear).map(Number);
  const yearsActive = years.length > 0 ? (Math.max(...years) - Math.min(...years) + 1) : 1;

  const alreadyRead = books.map(b => b.title);

  // Lista COMPLETA dei libri letti (per far analizzare all'AI tutta la libreria, non solo il top-N)
  const allBooks = read.map(b => ({
    title: b.title,
    author: b.authors[0] ?? "",
    rating: b.rating ?? null,
    year: Number(b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4) ?? 0) || null,
  })).slice(0, 500); // tetto di sicurezza per librerie enormi

  return {
    identita: {
      totalBooks: books.length,
      readBooks: read.length,
      avgRating, totalPages, yearsActive,
      topGenres: topGenresDetailed,
      topAuthors, topRatedBooks, favoriteBooks, readingByYear, allBooks,
    },
    raccomandazioni: {
      totalRead: read.length,
      avgRating,
      topGenres: topGenresFlat,
      topAuthors, topRatedBooks, recentBooks, alreadyRead,
    },
    insights: {
      totalBooks: books.length,
      readBooks: read.length,
      avgRating,
      topGenres: topGenresFlat,
      favoriteAuthors,
      topBooks,
      totalPages, estHours,
      recentBooks: recentBooksFull,
      favoriteBooks: favoriteBooksRated,
      readingByYear, allBooks,
    },
  };
}

/**
 * Hook condiviso che produce i payload di contesto per le chiamate AI
 * (precedentemente buildContext() duplicato tra Identità, Scopri e AI).
 * Source of truth: useUserBooks().
 */
export function useReaderContext(): { context: ReaderContext; loading: boolean; totalBooks: number; totalRead: number } {
  const { books, loading } = useUserBooks();
  const context = useMemo(() => build(books), [books]);
  return {
    context,
    loading,
    totalBooks: books.length,
    totalRead: context.identita.readBooks,
  };
}
