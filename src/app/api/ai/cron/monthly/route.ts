/**
 * Cron mensile — aggiorna i dati AI per tutti gli utenti che hanno già
 * effettuato la prima generazione. Nessun utente può chiamare questa route.
 *
 * Chiamata: POST /api/ai/cron/monthly
 * Header:   Authorization: Bearer <CRON_SECRET>
 *
 * Aggiungi CRON_SECRET=<scegli-un-segreto-lungo> in .env.local
 * Poi schedula una chiamata mensile (es. cron-job.org o Vercel Cron).
 */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";
import { generateViteForBooks, type ViteBook } from "@/lib/ai/vite";
import type { YearNarrative } from "@/app/api/ai/timeline/route";

export const runtime = "nodejs";
export const maxDuration = 300;

// ── Auth ──────────────────────────────────────────────────────────────────────
function checkSecret(req: Request): boolean {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
interface BookRow {
  book_id: string;
  title: string;
  authors: string[];
  genres: string[];
  status: string;
  rating: number | null;
  is_favorite: boolean;
  finished_at: string | null;
  created_at: string;
  page_count: number | null;
  published_year: number | null;
  description: string | null;
}

function buildYearGroups(books: BookRow[]) {
  const map = new Map<number, BookRow[]>();
  books.forEach(b => {
    const raw = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
    if (!raw) return;
    const y = parseInt(raw);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(b);
  });
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, books]) => ({ year, books }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY mancante" }, { status: 503 });

  const sb     = createServiceClient();
  const openai = new OpenAI({ apiKey });
  const log: Record<string, unknown>[] = [];

  // Tutti gli utenti che hanno già fatto la prima generazione
  const { data: profiles } = await sb
    .from("user_ai_profiles")
    .select("user_id");

  if (!profiles?.length) return NextResponse.json({ message: "Nessun utente con profilo generato", log });

  for (const { user_id } of profiles) {
    const userLog: Record<string, unknown> = { user_id, refreshed: [] };
    log.push(userLog);

    // ── 1. Libri dell'utente ────────────────────────────────────────────────
    const { data: allBooks } = await sb
      .from("user_library")
      .select("book_id, title, authors, genres, status, rating, is_favorite, finished_at, created_at, page_count, published_year, description")
      .eq("user_id", user_id);

    if (!allBooks?.length) continue;
    const books    = allBooks as BookRow[];
    const readBooks = books.filter(b => b.status === "letto" || b.status === "rileggendo");

    // ── 2. Profilo lettore ──────────────────────────────────────────────────
    try {
      const ratings    = readBooks.filter(b => b.rating != null).map(b => b.rating!);
      const avgRating  = ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;
      const totalPages = readBooks.reduce((s, b) => s + (b.page_count ?? 0), 0);

      const genreCount: Record<string, number> = {};
      books.forEach(b => (b.genres as string[])?.forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; }));
      const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, count]) => `${name} ${Math.round((count / books.length) * 100)}% (${count} libri)`);
      const authorCount: Record<string, number> = {};
      books.forEach(b => (b.authors as string[])?.forEach(a => { authorCount[a] = (authorCount[a] ?? 0) + 1; }));
      const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => a);
      const topRated   = [...readBooks].filter(b => b.rating != null).sort((a, b) => b.rating! - a.rating!).slice(0, 5)
        .map(b => `"${b.title}" di ${(b.authors as string[])[0] ?? ""} (${b.rating}/10)`);
      const favorites  = books.filter(b => b.is_favorite).slice(0, 5)
        .map(b => `"${b.title}" di ${(b.authors as string[])[0] ?? ""}`);
      const byYear: Record<string, number> = {};
      readBooks.forEach(b => {
        const y = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
        if (y) byYear[y] = (byYear[y] ?? 0) + 1;
      });
      const years       = Object.keys(byYear).map(Number);
      const yearsActive = years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : 1;

      const ctx = `Libreria di ${books.length} libri totali, ${readBooks.length} completati, ${totalPages.toLocaleString("it")} pagine in ${yearsActive} anni.
Rating medio: ${avgRating}/10. Generi: ${topGenres.join(", ")}.
Autori frequenti: ${topAuthors.join(", ")}.
Libri meglio valutati: ${topRated.join(", ")}.
Preferiti: ${favorites.join(", ")}.
Letti per anno: ${Object.entries(byYear).sort().map(([y, n]) => `${y}: ${n}`).join(", ")}.`;

      const pRes = await openai.chat.completions.create({
        model: "gpt-4o-mini", max_tokens: 1024, temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Sei un profiler letterario. Crea un profilo del lettore in JSON con campi: name, motto, description, strengths (array 4), blind_spots (array 4). Tutto in italiano, specifico, NO cliché.` },
          { role: "user",   content: ctx },
        ],
      });
      const archetype = JSON.parse(pRes.choices[0]?.message?.content ?? "{}");
      if (archetype.name) {
        await sb.from("user_ai_profiles").upsert(
          { user_id, archetype, book_count_at_generation: readBooks.length, generated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        (userLog.refreshed as string[]).push("profile");
      }
    } catch (e) { userLog.profileError = String(e); }

    // ── 3. Timeline anni (solo anni con book_count cambiato) ────────────────
    try {
      const yearGroups = buildYearGroups(readBooks);
      const { data: existing } = await sb
        .from("user_timeline_years")
        .select("year, book_count")
        .eq("user_id", user_id);
      const existingMap = new Map((existing ?? []).map(e => [e.year, e.book_count]));
      const toRegen = yearGroups.filter(yg => existingMap.get(yg.year) !== yg.books.length);

      if (toRegen.length > 0) {
        const tRes = await openai.chat.completions.create({
          model: "gpt-4o-mini", max_tokens: 300 * toRegen.length, temperature: 0.85,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Sei uno storico personale. Per ogni anno fornito, crea un capitolo narrativo della vita del lettore basato sui libri letti.
Output JSON: { "chapters": [ { "year": 2024, "nomeAnno": "...", "archetype": "...", "mood": "...", "narrative": "...", "libroSimbolo": { "title": "...", "author": "...", "reason": "..." } } ] }
Regole: nomeAnno (max 5 parole poetiche), archetype (2-3 parole con articolo), mood (1 parola), narrative (3-4 frasi con "tu", cita libri specifici), libroSimbolo (il più rappresentativo). Tutto in italiano.` },
            { role: "user", content: JSON.stringify(toRegen.map(yg => ({
                year: yg.year,
                books: yg.books.map(b => ({ title: b.title, authors: b.authors, rating: b.rating, genres: b.genres, is_favorite: b.is_favorite })),
              }))) },
          ],
        });
        const tParsed = JSON.parse(tRes.choices[0]?.message?.content ?? "{}") as { chapters?: YearNarrative[] };
        if (tParsed.chapters?.length) {
          await sb.from("user_timeline_years").upsert(
            tParsed.chapters.map(c => ({
              user_id, year: c.year,
              nome_anno: c.nomeAnno ?? "", archetype: c.archetype ?? "", mood: c.mood ?? "",
              narrative: c.narrative ?? "", libro_simbolo: c.libroSimbolo ?? {},
              book_count: toRegen.find(yg => yg.year === c.year)?.books.length ?? 0,
              generated_at: new Date().toISOString(),
            })),
            { onConflict: "user_id,year" }
          );
          (userLog.refreshed as string[]).push(`timeline(${tParsed.chapters.length}anni)`);
        }
      }
    } catch (e) { userLog.timelineError = String(e); }

    // ── 4. Vite vissute (solo libri nuovi nel catalogo globale) ────────────
    try {
      const bookIds = readBooks.map(b => b.book_id).filter(Boolean);
      const { data: existing } = await sb
        .from("books_ai_metadata")
        .select("book_id")
        .in("book_id", bookIds);
      const alreadyDone = new Set((existing ?? []).map(r => r.book_id as string));
      const missing: ViteBook[] = readBooks
        .filter(b => b.book_id && !alreadyDone.has(b.book_id))
        .map(b => ({
          book_id: b.book_id, title: b.title, authors: b.authors,
          genres: b.genres, published_year: b.published_year, description: b.description,
        }));

      if (missing.length > 0) {
        const { generated } = await generateViteForBooks(sb, openai, missing);
        if (generated > 0) (userLog.refreshed as string[]).push(`vite(${generated})`);
      }
    } catch (e) { userLog.viteError = String(e); }
  }

  return NextResponse.json({ ok: true, users: profiles.length, log });
}

// Vercel Cron invoca con GET → stesso comportamento del POST
export async function GET(req: Request) {
  return POST(req);
}
