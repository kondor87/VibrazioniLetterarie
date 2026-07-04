import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Sei un esperto di psicologia della lettura e profiler letterario. Analizza la libreria dell'utente e crea un profilo del lettore profondo e personalizzato in formato JSON.

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Struttura richiesta:
{
  "name": "...",
  "motto": "...",
  "description": "...",
  "strengths": ["...", "...", "...", "..."],
  "blind_spots": ["...", "...", "...", "..."]
}

Regole:
- name: archetipo del lettore, 2-3 parole, con articolo (es. "Lo Stratega", "Il Cercatore", "L'Architetto del Pensiero"). Deve essere sorprendente e preciso.
- motto: frase breve (max 15 parole) che cattura l'essenza di come questa persona legge. Deve sembrare scritta per lui/lei.
- description: paragrafo di 4-5 frasi. Usa "tu" e "sei". Fai riferimento a libri e autori specifici dalla libreria. Tono letterario, caldo, rivelatorio — come se lo conoscessi da anni.
- strengths: esattamente 4 punti di forza intellettuali o caratteriali emersi dalla libreria (max 8 parole ciascuno)
- blind_spots: esattamente 4 zone d'ombra o lacune nella libreria (max 10 parole ciascuno, con specificità — es. "Solo l'8% della libreria è narrativa di pura immaginazione")
- Tutto in italiano. NO cliché generici.`;

interface BookRow {
  title: string;
  authors: string[];
  genres: string[];
  status: string;
  rating: number | null;
  is_favorite: boolean;
  finished_at: string | null;
  created_at: string;
  page_count: number | null;
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY mancante" }, { status: 503 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  // Load user's full library
  const { data: rows, error } = await sb
    .from("user_library")
    .select("title, authors, genres, status, rating, is_favorite, finished_at, created_at, page_count")
    .eq("user_id", user.id);

  if (error || !rows?.length) {
    return NextResponse.json({ error: "Nessun libro trovato" }, { status: 400 });
  }

  const books = rows as BookRow[];
  const read = books.filter(b => b.status === "letto" || b.status === "rileggendo");
  const ratings = read.filter(b => b.rating != null).map(b => b.rating!);
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;
  const totalPages = read.reduce((s, b) => s + (b.page_count ?? 0), 0);

  const genreCount: Record<string, number> = {};
  books.forEach(b => (b.genres as string[])?.forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; }));
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => `${name} ${Math.round((count / books.length) * 100)}% (${count} libri)`);

  const authorCount: Record<string, number> = {};
  books.forEach(b => (b.authors as string[])?.forEach(a => { authorCount[a] = (authorCount[a] ?? 0) + 1; }));
  const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => a);

  const topRated = [...read].filter(b => b.rating != null)
    .sort((a, b) => b.rating! - a.rating!).slice(0, 5)
    .map(b => `"${b.title}" di ${(b.authors as string[])[0] ?? ""} (${b.rating}/10)`);

  const favorites = books.filter(b => b.is_favorite).slice(0, 5)
    .map(b => `"${b.title}" di ${(b.authors as string[])[0] ?? ""}`);

  const readingByYear: Record<string, number> = {};
  read.forEach(b => {
    const y = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
    if (y) readingByYear[y] = (readingByYear[y] ?? 0) + 1;
  });
  const years = Object.keys(readingByYear).map(Number);
  const yearsActive = years.length > 0 ? Math.max(...years) - Math.min(...years) + 1 : 1;

  const contextText = `
Libreria di ${books.length} libri totali, ${read.length} completati, ${totalPages.toLocaleString("it")} pagine lette in ${yearsActive} anni.
Rating medio: ${avgRating}/10.
Generi: ${topGenres.join(", ")}.
Autori più frequenti: ${topAuthors.join(", ")}.
Libri meglio valutati: ${topRated.join(", ")}.
Libri preferiti (cuore): ${favorites.join(", ")}.
Libri letti per anno: ${Object.entries(readingByYear).sort().map(([y, n]) => `${y}: ${n}`).join(", ")}.
  `.trim();

  try {
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Crea il profilo del lettore basato su questa libreria:\n\n${contextText}` },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const archetype = JSON.parse(raw);
    if (!archetype.name) return NextResponse.json({ error: "Risposta GPT malformata" }, { status: 500 });

    await sb.from("user_ai_profiles").upsert(
      { user_id: user.id, archetype, book_count_at_generation: read.length, generated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ archetype });
  } catch (e) {
    console.error("profile-refresh error:", e);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
