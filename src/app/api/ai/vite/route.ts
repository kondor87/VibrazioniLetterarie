import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 90;

interface BookInput {
  id: string;
  title: string;
  authors: string[];
  genres: string[];
}

export interface VitaVissuta {
  id: string;
  title: string;
  author: string;
  vita: string;
  mondo: string;
}

const VITE_PROMPT = `Sei un narratore di esperienze letterarie. Per ogni libro fornito, scrivi una descrizione vivida e specifica dell'avventura vissuta in prima persona attraverso i protagonisti.

REGOLE FONDAMENTALI:
- Inizia SEMPRE con "Hai..."
- Includi: luogo specifico + epoca/contesto storico + atmosfera o tensione dominante
- Max 2 frasi, max 40 parole totali — sii denso, non prolisso
- Sii specifico e poetico, MAI generico ("Hai vissuto un'avventura" è sbagliato)
- Usa il presente storico, tono letterario e immersivo

ESEMPI ECCELLENTI:
"Il nome della rosa" → "Hai indagato una serie di misteriosi omicidi in un'abbazia benedettina del 1327, tra monaci ossessionati dai libri proibiti, l'ombra dell'Inquisizione e un labirinto di conoscenza segreta."
"1984" → "Hai resistito al Grande Fratello in un'Oceania totalitaria dove la storia viene riscritta ogni giorno, il linguaggio stesso è strumento di controllo e il Pensiero Criminale si paga con la morte."
"Dune" → "Hai guidato i Fremen del pianeta deserto Arrakis nella guerra per il controllo della spezia più preziosa dell'universo, tra profezie messianiche, tradimenti imperiali e l'eco dei tuoi antenati."
"I pilastri della terra" → "Hai costruito una cattedrale gotica nell'Inghilterra medievale del XII secolo, navigando guerre feudali, intrighi ecclesiastici e la brutalità di un'epoca in cui la pietra era atto di fede."
"Se questo è un uomo" → "Hai sopravvissuto all'inferno del Lager nazista di Auschwitz, testimoniando la sistematica distruzione della dignità umana in un posto dove il tempo si misurava in sopravvivenza."
"Il conte di Montecristo" → "Hai atteso quattordici anni nel buio del Castello d'If per costruire una vendetta chirurgica contro chi ti aveva tradito, trasformandoti da marinaio innocente in mente di una trama raffinata e implacabile."

CATEGORIE MONDO (scegli sempre la più precisa):
Medievale, Rinascimentale, Moderno-Storico (1800-1950), Contemporaneo (post 1950), Distopico, Spaziale, Fantastico, Guerra, Crime-Thriller, Filosofico, Biografico, Familiare, Psicologico, Avventura, Classico-Antico

IMPORTANTE: rispondi SOLO con JSON valido, nessun testo prima o dopo.

Output:
{
  "vite": [
    { "id": "book-id-esatto", "vita": "Hai...", "mondo": "categoria" }
  ]
}`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
  }

  let body: { books: BookInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }
  if (!body.books?.length) {
    return NextResponse.json({ error: "Nessun libro" }, { status: 400 });
  }

  const booksList = body.books
    .map(b => `ID: "${b.id}" | Titolo: "${b.title}" | Autore: ${b.authors[0] ?? "Sconosciuto"} | Generi: ${b.genres.slice(0, 3).join(", ") || "vari"}`)
    .join("\n");

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 6000,
      temperature: 0.88,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VITE_PROMPT },
        { role: "user", content: `Genera le vite vissute per questi libri:\n\n${booksList}` },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { vite?: Array<{ id: string; vita: string; mondo: string }> };

    if (!parsed.vite?.length) {
      return NextResponse.json({ error: "Risposta malformata" }, { status: 500 });
    }

    return NextResponse.json({ vite: parsed.vite });
  } catch (error) {
    console.error("OpenAI vite error:", error);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
