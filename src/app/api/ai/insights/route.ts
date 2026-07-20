import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface BooksContext {
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
  allBooks?: { title: string; author: string; rating: number | null; year: number | null }[];
}

export interface InsightData {
  type: "profile" | "suggestion" | "pattern" | "challenge";
  title: string;
  body: string;
}

const INSIGHTS_PROMPT = `Sei un critico letterario ed esperto di psicologia della lettura. Analizza la libreria dell'utente e genera esattamente 4 insights personalizzati in formato JSON.

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Struttura richiesta:
{
  "insights": [
    {
      "type": "profile",
      "title": "...",
      "body": "..."
    },
    {
      "type": "pattern",
      "title": "...",
      "body": "..."
    },
    {
      "type": "suggestion",
      "title": "...",
      "body": "..."
    },
    {
      "type": "challenge",
      "title": "...",
      "body": "..."
    }
  ]
}

Regole:
- type "profile": analisi del carattere/personalità del lettore basata sui libri
- type "pattern": pattern di lettura (ritmo, stagionalità, generi, autori ricorrenti)
- type "suggestion": 3 libri specifici da leggere dopo (con titolo in **grassetto** e autore)
- type "challenge": sfida di lettura creativa e personalizzata per il prossimo mese
- Ogni body: 3-5 frasi, tono caldo e letterario, in italiano
- Usa dati concreti dalla libreria (titoli veri, autori veri, anni, rating)
- NO cliché generici — sii specifico e sorprendente`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
  }

  let ctx: BooksContext;
  try {
    ctx = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const contextText = `
Libreria di ${ctx.totalBooks} libri (${ctx.readBooks} letti, ${ctx.totalPages.toLocaleString("it")} pagine totali, ~${ctx.estHours} ore stimate).
Rating medio: ${ctx.avgRating}/10.
Generi più letti: ${ctx.topGenres.join(", ")}.
Autori più frequenti: ${ctx.favoriteAuthors.join(", ")}.
Libri meglio valutati: ${ctx.topBooks.map(b => `"${b.title}" di ${b.author} (${b.rating}/10)`).join(", ")}.
Libri preferiti (cuore): ${ctx.favoriteBooks.map(b => `"${b.title}" di ${b.author}`).join(", ")}.
Ultimi letti: ${ctx.recentBooks.slice(0, 5).map(b => `"${b.title}" di ${b.author} (${b.year}, ${b.rating}/10)`).join(", ")}.
Libri per anno: ${Object.entries(ctx.readingByYear).sort().map(([y, n]) => `${y}: ${n}`).join(", ")}.
${ctx.allBooks?.length ? `\nLIBRERIA COMPLETA (${ctx.allBooks.length} libri — ANALIZZALI TUTTI, non solo gli esempi):\n${ctx.allBooks.map(b => `• "${b.title}" — ${b.author}${b.rating ? ` (${b.rating}/10)` : ""}${b.year ? ` [${b.year}]` : ""}`).join("\n")}` : ""}
`.trim();

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: INSIGHTS_PROMPT },
        { role: "user", content: `Analizza questa libreria:\n\n${contextText}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { insights?: InsightData[] };

    if (!parsed.insights || parsed.insights.length !== 4) {
      return NextResponse.json({ error: "Risposta GPT malformata" }, { status: 500 });
    }

    return NextResponse.json({ insights: parsed.insights });
  } catch (error) {
    console.error("OpenAI insights error:", error);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
