import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface IdentitaContext {
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
}

export interface IdentitaData {
  name: string;
  motto: string;
  description: string;
  strengths: string[];
  blind_spots: string[];
}

const IDENTITA_PROMPT = `Sei un esperto di psicologia della lettura e profiler letterario. Analizza la libreria dell'utente e crea un profilo del lettore profondo e personalizzato in formato JSON.

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Struttura richiesta:
{
  "archetype": {
    "name": "...",
    "motto": "...",
    "description": "...",
    "strengths": ["...", "...", "...", "..."],
    "blind_spots": ["...", "...", "...", "..."]
  }
}

Regole:
- name: archetipo del lettore, 2-3 parole, con articolo (es. "Lo Stratega", "Il Cercatore", "L'Architetto del Pensiero"). Deve essere sorprendente e preciso.
- motto: frase breve (max 15 parole) che cattura l'essenza di come questa persona legge. Deve sembrare scritta per lui/lei.
- description: paragrafo di 4-5 frasi. Usa "tu" e "sei". Fai riferimento a libri e autori specifici dalla libreria. Tono letterario, caldo, rivelatorio — come se lo conoscessi da anni.
- strengths: esattamente 4 punti di forza intellettuali o caratteriali emersi dalla libreria (max 8 parole ciascuno)
- blind_spots: esattamente 4 zone d'ombra o lacune nella libreria (max 10 parole ciascuno, con specificità — es. "Solo l'8% della libreria è narrativa di pura immaginazione")
- Tutto in italiano. NO cliché generici.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
  }

  let ctx: IdentitaContext;
  try {
    ctx = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const topGenresText = ctx.topGenres
    .map(g => `${g.name} ${g.pct}% (${g.count} libri)`)
    .join(", ");

  const contextText = `
Libreria di ${ctx.totalBooks} libri totali, ${ctx.readBooks} completati, ${ctx.totalPages.toLocaleString("it")} pagine lette in ${ctx.yearsActive} anni.
Rating medio: ${ctx.avgRating}/10.
Generi per percentuale: ${topGenresText}.
Autori più frequenti: ${ctx.topAuthors.slice(0, 6).join(", ")}.
Libri meglio valutati: ${ctx.topRatedBooks.slice(0, 5).map(b => `"${b.title}" di ${b.author} (${b.rating}/10)`).join(", ")}.
Libri preferiti (cuore): ${ctx.favoriteBooks.slice(0, 4).map(b => `"${b.title}" di ${b.author}`).join(", ")}.
Libri letti per anno: ${Object.entries(ctx.readingByYear).sort().map(([y, n]) => `${y}: ${n}`).join(", ")}.
  `.trim();

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IDENTITA_PROMPT },
        { role: "user", content: `Crea il profilo del lettore basato su questa libreria:\n\n${contextText}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { archetype?: IdentitaData };

    if (!parsed.archetype?.name) {
      return NextResponse.json({ error: "Risposta GPT malformata" }, { status: 500 });
    }

    return NextResponse.json({ archetype: parsed.archetype });
  } catch (error) {
    console.error("OpenAI identita error:", error);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
