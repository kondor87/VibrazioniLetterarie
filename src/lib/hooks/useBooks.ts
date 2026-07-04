"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { BookWithReading } from "@/types/book";
import type { NewBookData } from "@/components/books/AddBookDialog";

// Converte una riga di user_library → BookWithReading
function rowToBook(row: Record<string, unknown>): BookWithReading {
  return {
    id:               row.id as string,
    book_id:          (row.book_id as string) ?? (row.id as string),
    user_id:          row.user_id as string,
    isbn_13:          (row.isbn_13 as string) ?? null,
    isbn_10:          (row.isbn_10 as string) ?? null,
    open_library_id:  (row.open_library_id as string) ?? null,
    google_books_id:  (row.google_books_id as string) ?? null,
    title:            row.title as string,
    subtitle:         (row.subtitle as string) ?? null,
    authors:          (row.authors as string[]) ?? [],
    publisher:        (row.publisher as string) ?? null,
    published_year:   (row.published_year as number) ?? null,
    language:         (row.language as string) ?? "it",
    page_count:       (row.page_count as number) ?? null,
    genres:           (row.genres as string[]) ?? [],
    cover_url:        (row.cover_url as string) ?? null,
    description:      (row.description as string) ?? null,
    cover_custom_url: null,
    edition_note:     null,
    format:           (row.format as "ebook" | "cartaceo" | "audio") ?? "ebook",
    source:           "manual",
    created_at:       row.created_at as string,
    updated_at:       row.updated_at as string,
    status:           row.status as BookWithReading["status"],
    rating:           (row.rating as number) ?? null,
    review:           (row.review as string) ?? null,
    is_favorite:      (row.is_favorite as boolean) ?? false,
    started_at:       (row.started_at as string) ?? null,
    finished_at:      (row.finished_at as string) ?? null,
    reading_time_h:   (row.reading_time_h as number) ?? null,
    reread_count:     (row.reread_count as number) ?? 0,
  };
}

// ── Hook: leggi la libreria dell'utente ──────────────────────────────────────
export function useLibrary(userId: string | null) {
  const sb = createClient();

  return useQuery<BookWithReading[]>({
    queryKey: ["library", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("user_library")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToBook);
    },
  });
}

// ── Hook: aggiungi un libro ──────────────────────────────────────────────────
export function useAddBook() {
  const sb = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      userId,
    }: {
      data: NewBookData;
      userId: string;
    }) => {
      const b = data.book;

      // 1. Se il libro è già nel catalogo, preserva description e cover_url
      //    arricchite (backfill italiano, Wikipedia) — non sovrascrivere con dati
      //    più corti o in inglese provenienti dalla ricerca.
      let savedDesc:  string | null = null;
      let savedCover: string | null = null;
      const conflictCol = b.google_books_id ? "google_books_id" : "isbn_13";
      const conflictVal = b.google_books_id ?? b.isbn_13 ?? null;
      if (conflictVal) {
        const { data: prev } = await sb
          .from("books")
          .select("description, cover_url")
          .eq(conflictCol, conflictVal)
          .maybeSingle();
        savedDesc  = prev?.description  ?? null;
        savedCover = prev?.cover_url    ?? null;
      }

      // 1. Upsert nel catalogo globale (dedup per google_books_id o isbn_13)
      const bookPayload = {
        google_books_id: b.google_books_id ?? null,
        open_library_id: b.open_library_id ?? null,
        isbn_13:         b.isbn_13 ?? null,
        isbn_10:         b.isbn_10 ?? null,
        title:           b.title,
        subtitle:        b.subtitle ?? null,
        authors:         b.authors,
        publisher:       b.publisher ?? null,
        published_year:  b.year ? Number(b.year) : null,
        language:        b.language ?? "it",
        page_count:      b.pages ?? null,
        genres:          b.categories ?? [],
        cover_url:       savedCover ?? b.cover_url ?? null,
        description:     savedDesc  ?? b.description ?? null,
      };

      const onConflict = b.google_books_id ? "google_books_id" : "isbn_13";

      const { data: book, error: bookErr } = await sb
        .from("books")
        .upsert(bookPayload, { onConflict, ignoreDuplicates: false })
        .select("id")
        .single();

      if (bookErr) throw new Error(bookErr.message);

      // 2. Inserisci entry di lettura
      const { error: entryErr } = await sb.from("user_books").insert({
        user_id:     userId,
        book_id:     book.id,
        status:      data.status,
        format:      data.format,
        rating:      data.rating ?? null,
        review:      data.review || null,
        is_favorite: data.isFavorite,
        started_at:  data.startedAt || null,
        finished_at: data.finishedAt || null,
      });

      if (entryErr) throw new Error(entryErr.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["library", userId] });
    },
  });
}

// ── Hook: aggiorna stato / rating / preferito ────────────────────────────────
export function useUpdateBook() {
  const sb = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userBookId,
      userId,
      patch,
    }: {
      userBookId: string;
      userId: string;
      patch: Partial<{
        status: BookWithReading["status"];
        rating: number | null;
        is_favorite: boolean;
        review: string | null;
        started_at: string | null;
        finished_at: string | null;
      }>;
    }) => {
      const { error } = await sb
        .from("user_books")
        .update(patch)
        .eq("id", userBookId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["library", userId] });
    },
  });
}

// ── Hook: quotes ─────────────────────────────────────────────────────────────
export interface QuoteRow {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page_number: number | null;
  location: string | null;
  chapter: string | null;
  note: string | null;
  is_favorite: boolean;
  source: string;
  created_at: string;
  books: {
    title: string;
    authors: string[];
    genres: string[];
  } | null;
}

export function useQuotes(userId: string | null) {
  const sb = createClient();
  return useQuery<QuoteRow[]>({
    queryKey: ["quotes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await sb
        .from("quotes")
        .select("*, books(title, authors, genres)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as QuoteRow[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useAddQuote() {
  const sb = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: Omit<QuoteRow, "id" | "created_at" | "books">) => {
      const { error } = await sb.from("quotes").insert(quote);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotes", vars.user_id] });
    },
  });
}

export function useToggleQuoteFavorite() {
  const sb = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, is_favorite }: { id: string; userId: string; is_favorite: boolean }) => {
      const { error } = await sb.from("quotes").update({ is_favorite }).eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["quotes", userId] });
    },
  });
}

export function useRemoveQuote() {
  const sb = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await sb.from("quotes").delete().eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["quotes", userId] });
    },
  });
}

// ── Hook: elimina libro dalla libreria ───────────────────────────────────────
export function useRemoveBook() {
  const sb = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userBookId, userId }: { userBookId: string; userId: string }) => {
      const { error } = await sb
        .from("user_books")
        .delete()
        .eq("id", userBookId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["library", userId] });
    },
  });
}
