import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 45;

// ── Types ─────────────────────────────────────────────────────────────────────

interface RaccomandazioniContext {
  totalRead: number;
  avgRating: number;
  topGenres: string[];
  topAuthors: string[];
  topRatedBooks: { title: string; author: string; rating: number }[];
  recentBooks: { title: string; author: string }[];
  alreadyRead: string[];
}

interface RawSuggestion {
  title: string;
  author: string;
  reason: string;
}

export interface Recommendation {
  title: string;
  author: string;
  reason: string;
  cover_url: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
  google_books_id: string | null;
  pages: number | null;
  description: string | null;
  categories: string[];
  year: string | null;
}

// ── Category mapping (same as /api/books/search) ─────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  Fiction: "Narrativa", "Literary Fiction": "Narrativa", "Historical Fiction": "Narrativa",
  "Science Fiction": "Narrativa", Mystery: "Narrativa", Thriller: "Narrativa",
  Crime: "Narrativa", Horror: "Narrativa", Fantasy: "Fantasy",
  "Biography & Autobiography": "Biografie", Biography: "Biografie",
  Autobiography: "Biografie", Memoir: "Biografie",
  "Self-Help": "Crescita Personale", "Personal Development": "Crescita Personale",
  Psychology: "Psicologia", "Business & Economics": "Business", Business: "Business",
  Economics: "Business", Finance: "Business", History: "Saggistica",
  Science: "Saggistica", Philosophy: "Saggistica", Nonfiction: "Saggistica",
  "Non-fiction": "Saggistica", Narrativa: "Narrativa", "Sviluppo personale": "Crescita Personale",
  Psicologia: "Psicologia", "Economia e finanza": "Business", Saggistica: "Saggistica",
  Storia: "Saggistica", Scienza: "Saggistica", Filosofia: "Saggistica",
};

// Normalizza un titolo per confronto robusto (accenti, maiuscole, punteggiatura, articoli)
function normTitle(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // rimuove accenti
    .replace(/[^a-z0-9\s]/g, " ")                        // via punteggiatura
    .replace(/\s+/g, " ")
    .trim();
}

function mapCategories(raw: string[]): string[] {
  const mapped = raw.flatMap(cat => {
    if (CATEGORY_MAP[cat]) return [CATEGORY_MAP[cat]];
    const key = Object.keys(CATEGORY_MAP).find(k =>
      cat.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cat.toLowerCase())
    );
    return key ? [CATEGORY_MAP[key]] : [];
  });
  return Array.from(new Set(mapped));
}

// ── Google Books enrichment ───────────────────────────────────────────────────

async function enrichWithGoogleBooks(
  suggestion: RawSuggestion,
  apiKey: string,
): Promise<Recommendation> {
  const q = `intitle:"${suggestion.title}" inauthor:"${suggestion.author}"`;
  const params = new URLSearchParams({ q, maxResults: "3", key: apiKey, country: "IT" });

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error("Google Books non disponibile");
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) throw new Error("Nessun risultato");

    const v = item.volumeInfo as Record<string, unknown>;
    const ids = (v.industryIdentifiers ?? []) as Array<{ type: string; identifier: string }>;
    const rawCover = (v.imageLinks as Record<string, string> | undefined)?.thumbnail;
    const cover = rawCover
      ? rawCover.replace(/^http:/, "https:").replace(/zoom=\d/, "zoom=3").replace("&edge=curl", "")
      : null;

    return {
      ...suggestion,
      cover_url: cover ?? null,
      isbn_13: ids.find(i => i.type === "ISBN_13")?.identifier ?? null,
      isbn_10: ids.find(i => i.type === "ISBN_10")?.identifier ?? null,
      google_books_id: item.id as string ?? null,
      pages: (v.pageCount as number | undefined) ?? null,
      description: ((v.description as string | undefined) ?? "").slice(0, 500) || null,
      categories: mapCategories((v.categories as string[] | undefined) ?? []),
      year: ((v.publishedDate as string | undefined) ?? "").slice(0, 4) || null,
    };
  } catch {
    return {
      ...suggestion,
      cover_url: null,
      isbn_13: null,
      isbn_10: null,
      google_books_id: null,
      pages: null,
      description: null,
      categories: [],
      year: null,
    };
  }
}

// ── GPT prompt ────────────────────────────────────────────────────────────────

const RACCOMANDAZIONI_PROMPT = `Sei un bibliotecario letterario esperto. Analizza la libreria dell'utente e suggerisci esattamente 8 libri che potrebbe amare, che NON ha ancora letto.

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Struttura:
{
  "suggestions": [
    { "title": "...", "author": "...", "reason": "..." },
    ...
  ]
}

Regole:
- Esattamente 8 suggerimenti
- I titoli devono essere REALI e verificabili (no invenzioni)
- reason: 1-2 frasi che spiegano il collegamento specifico con i libri e autori che l'utente ama. Cita titoli che ha letto. Tono personale e preciso.
- Varia i generi: almeno 2 diversi dalla sua zona di comfort
- NON suggerire libri già presenti nella lista "già letti"
- Tutto in italiano (anche reason), ma titoli e autori nell'originale`;

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const gbKey = process.env.GOOGLE_BOOKS_API_KEY;

  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });

  let ctx: RaccomandazioniContext;
  try {
    ctx = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const contextText = `
Libri completati: ${ctx.totalRead}. Rating medio: ${ctx.avgRating}/10.
Generi preferiti: ${ctx.topGenres.join(", ")}.
Autori più letti: ${ctx.topAuthors.slice(0, 6).join(", ")}.
Libri meglio valutati: ${ctx.topRatedBooks.slice(0, 6).map(b => `"${b.title}" di ${b.author} (${b.rating}/10)`).join("; ")}.
Ultimi letti: ${ctx.recentBooks.slice(0, 5).map(b => `"${b.title}" di ${b.author}`).join("; ")}.
Già letti (NON suggerire NESSUNO di questi): ${ctx.alreadyRead.slice(0, 150).join(", ")}.
`.trim();

  // Set normalizzato di tutti i titoli posseduti → filtro deterministico in uscita
  const ownedNorm = new Set((ctx.alreadyRead ?? []).map(normTitle));

  // 1. GPT genera i titoli raw
  let rawSuggestions: RawSuggestion[];
  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RACCOMANDAZIONI_PROMPT },
        { role: "user", content: contextText },
      ],
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
      suggestions?: RawSuggestion[];
    };
    rawSuggestions = parsed.suggestions ?? [];
    // Filtro HARD: scarta tutto ciò che l'utente ha già (GPT non è affidabile sull'esclusione)
    rawSuggestions = rawSuggestions.filter(s => !ownedNorm.has(normTitle(s.title))).slice(0, 6);
    if (rawSuggestions.length === 0) throw new Error("Nessun suggerimento generato");
  } catch (e) {
    console.error("GPT error:", e);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }

  // 2. Arricchisci in parallelo con Google Books
  const enriched = await Promise.all(
    rawSuggestions.map(s =>
      gbKey ? enrichWithGoogleBooks(s, gbKey) : Promise.resolve({ ...s, cover_url: null, isbn_13: null, isbn_10: null, google_books_id: null, pages: null, description: null, categories: [], year: null })
    )
  );

  return NextResponse.json({ recommendations: enriched });
}
