import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  booksContext?: {
    totalBooks: number;
    readBooks: number;
    avgRating: number;
    topGenres: string[];
    favoriteAuthors: string[];
    topBooks: { title: string; author: string; rating: number }[];
  };
}

const SYSTEM_PROMPT = `Sei un assistente letterario esperto e appassionato chiamato "Vibrazioni AI". Hai accesso alla libreria personale dell'utente e sei specializzato in:
- Analisi del profilo di lettore basata sulle sue letture
- Suggerimenti personalizzati di libri
- Insights sui pattern di lettura
- Sfide di lettura creative
- Analisi tematiche della libreria

Rispondi sempre in italiano, con tono caldo, colto e appassionato. Usa il contesto della libreria fornito per dare risposte personalizzate. Sii conciso ma substantivo (max 3-4 paragrafi). Quando suggerisci libri, cita titolo in **grassetto** e autore.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY non configurata in .env.local" },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body non valido" }, { status: 400 });
  }

  const { messages, booksContext } = body;
  if (!messages?.length) {
    return NextResponse.json({ error: "messages è obbligatorio" }, { status: 400 });
  }

  const contextBlock = booksContext ? `
Libreria dell'utente:
- ${booksContext.totalBooks} libri totali, ${booksContext.readBooks} letti
- Rating medio: ${booksContext.avgRating}/10
- Generi preferiti: ${booksContext.topGenres.join(", ")}
- Autori più letti: ${booksContext.favoriteAuthors.join(", ")}
- Top libri: ${booksContext.topBooks.map(b => `"${b.title}" di ${b.author} (${b.rating}/10)`).join(", ")}
` : "";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + (contextBlock ? `\n\nContesto utente:\n${contextBlock}` : ""),
        },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Risposta vuota dall'API" }, { status: 500 });
    }

    return NextResponse.json({ message: content });
  } catch (error) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      return NextResponse.json({ error: "API key non valida" }, { status: 401 });
    }
    console.error("OpenAI API error:", error);
    return NextResponse.json({ error: "Errore nel contattare OpenAI API" }, { status: 500 });
  }
}
