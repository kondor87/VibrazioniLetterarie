import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import type { YearNarrative } from "@/app/api/ai/timeline/route";

export const runtime = "nodejs";
export const maxDuration = 300;

interface BookRow {
  title: string;
  authors: string[];
  genres: string[];
  rating: number | null;
  is_favorite: boolean;
  finished_at: string | null;
  created_at: string;
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
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([year, yBooks]) => ({ year, books: yBooks }));
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY mancante" }, { status: 503 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  let forceAll = false;
  try { const body = await req.json(); forceAll = !!body?.force; } catch { /* no body = ok */ }

  // Load all user books
  const { data: rows } = await sb
    .from("user_library")
    .select("title, authors, genres, rating, is_favorite, finished_at, created_at")
    .eq("user_id", user.id)
    .in("status", ["letto", "rileggendo"]);

  if (!rows?.length) return NextResponse.json({ refreshed: [] });

  const yearGroups = buildYearGroups(rows as BookRow[]);

  // Load existing DB narratives
  const { data: existing } = await sb
    .from("user_timeline_years")
    .select("year, book_count, nome_anno, archetype, mood, narrative, libro_simbolo")
    .eq("user_id", user.id);

  const existingMap = new Map<number, typeof existing extends (infer T)[] | null ? T : never>();
  (existing ?? []).forEach(e => existingMap.set(e.year, e));

  // Delta: only years whose book_count changed (or all if force)
  const yearsToRegen = forceAll
    ? yearGroups
    : yearGroups.filter(yg => {
        const ex = existingMap.get(yg.year);
        return !ex || ex.book_count !== yg.books.length;
      });

  if (yearsToRegen.length === 0) {
    return NextResponse.json({ refreshed: [], skipped: yearGroups.map(y => y.year) });
  }

  // Build AI prompt for changed years only
  const yearsPayload = yearsToRegen.map(yg => ({
    year: yg.year,
    books: yg.books.map(b => ({
      title: b.title,
      authors: b.authors,
      rating: b.rating,
      genres: b.genres ?? [],
      is_favorite: b.is_favorite,
    })),
  }));

  try {
    const openai = new OpenAI({ apiKey });

    // Reuse the existing timeline route prompt by calling it via fetch (keeps prompt in one place)
    // or inline it here for reliability
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300 * yearsToRegen.length,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sei uno storico personale e narratore letterario. Per ogni anno della lista, crea un capitolo narrativo della vita del lettore basato sui libri letti quell'anno.

IMPORTANTE: rispondi SOLO con JSON valido.

Output:
{
  "chapters": [
    {
      "year": 2024,
      "nomeAnno": "...",
      "archetype": "...",
      "mood": "...",
      "narrative": "...",
      "libroSimbolo": { "title": "...", "author": "...", "reason": "..." }
    }
  ]
}

Regole:
- nomeAnno: nome poetico dell'anno (es. "L'anno della scoperta", "Il grande salto") — max 5 parole
- archetype: archetipo del lettore per quell'anno (es. "Il Costruttore", "L'Esploratore") — 2-3 parole con articolo
- mood: una parola che cattura il tono dell'anno (es. "Trasformazione", "Resilienza", "Curiosità")
- narrative: paragrafo di 3-4 frasi. Usa "tu". Fai riferimento a libri specifici. Tono intimo e letterario.
- libroSimbolo: il libro più rappresentativo dell'anno con una frase sul perché
- Tutto in italiano.`,
        },
        {
          role: "user",
          content: `Genera i capitoli narrativi per questi anni:\n\n${JSON.stringify(yearsPayload, null, 2)}`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { chapters?: YearNarrative[] };
    if (!parsed.chapters?.length) return NextResponse.json({ error: "Risposta GPT malformata" }, { status: 500 });

    // Upsert refreshed years
    const upsertRows = parsed.chapters.map(c => {
      const yg = yearsToRegen.find(y => y.year === c.year);
      return {
        user_id: user.id,
        year: c.year,
        nome_anno: c.nomeAnno ?? "",
        archetype: c.archetype ?? "",
        mood: c.mood ?? "",
        narrative: c.narrative ?? "",
        libro_simbolo: c.libroSimbolo ?? {},
        book_count: yg?.books.length ?? 0,
        generated_at: new Date().toISOString(),
      };
    });

    await sb.from("user_timeline_years").upsert(upsertRows, { onConflict: "user_id,year" });

    return NextResponse.json({ refreshed: parsed.chapters.map(c => c.year) });
  } catch (e) {
    console.error("timeline-refresh error:", e);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
