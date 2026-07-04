import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface YearBook {
  title: string;
  authors: string[];
  rating: number | null;
  genres: string[];
  is_favorite: boolean;
}

interface YearGroup {
  year: number;
  books: YearBook[];
}

export interface YearNarrative {
  year: number;
  nomeAnno: string;
  archetype: string;
  mood: string;
  narrative: string;
  libroSimbolo: { title: string; author: string; reason: string };
}

const TIMELINE_PROMPT = `Sei un narratore della vita umana attraverso i libri. Ricevi la lista dei libri letti ogni anno da un lettore e scrivi una narrazione personale profonda per ogni anno.

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Struttura richiesta:
{
  "chapters": [
    {
      "year": 2021,
      "nomeAnno": "L'anno della costruzione",
      "archetype": "Il Costruttore",
      "mood": "Determinazione",
      "narrative": "...",
      "libroSimbolo": {
        "title": "...",
        "author": "...",
        "reason": "..."
      }
    }
  ]
}

Regole:
- nomeAnno: 3-5 parole con articolo. Cattura il tema dominante dell'anno di lettura. Es: "L'anno della trasformazione", "Il grande risveglio", "L'anno dei sistemi".
- archetype: archetipo del lettore in quell'anno (2-3 parole con articolo). Es: "Il Costruttore", "L'Esploratore", "Lo Stratega", "Il Pensatore".
- mood: una parola sola che cattura l'atmosfera. Es: "Determinazione", "Meraviglia", "Consapevolezza".
- narrative: paragrafo di 3-5 frasi. Usa "tu" e il presente storico. Cita i libri specifici. Rivela cosa stava cercando il lettore in quel periodo. Mostra le connessioni invisibili tra i libri. Tono caldo, letterario, quasi confidenziale.
- libroSimbolo: il libro più significativo o emblematico di quell'anno, con reason (max 2 frasi) che spieghi perché rappresenta quell'anno.
- Se un anno ha un solo libro, rendilo comunque ricco di significato.
- Genera un capitolo per OGNI anno ricevuto in input, ordinato per anno crescente.
- Non essere generico: usa i titoli e autori reali dalla libreria.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
  }

  let body: { years: YearGroup[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }
  if (!body.years?.length) {
    return NextResponse.json({ error: "Nessun dato" }, { status: 400 });
  }

  const yearsText = body.years.map(y => {
    const bookList = y.books
      .map(b => `"${b.title}" di ${b.authors[0] ?? "Anonimo"}${b.rating ? ` (${b.rating}/10)` : ""}${b.is_favorite ? " ♥" : ""}`)
      .join("; ");
    const genreSet = new Set(y.books.flatMap(b => b.genres));
    const genres = Array.from(genreSet).slice(0, 5).join(", ");
    return `Anno ${y.year} (${y.books.length} libri, generi: ${genres || "vari"}): ${bookList}.`;
  }).join("\n");

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 4000,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: TIMELINE_PROMPT },
        { role: "user", content: `Crea la timeline narrativa:\n\n${yearsText}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { chapters?: YearNarrative[] };

    if (!parsed.chapters?.length) {
      return NextResponse.json({ error: "Risposta malformata" }, { status: 500 });
    }

    return NextResponse.json({ chapters: parsed.chapters });
  } catch (error) {
    console.error("OpenAI timeline error:", error);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
