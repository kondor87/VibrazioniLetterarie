import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Sei un narratore di esperienze letterarie. Per ogni libro fornito, scrivi una descrizione vivida e specifica dell'avventura vissuta in prima persona attraverso i protagonisti.

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

CATEGORIE MONDO (scegli sempre la più precisa):
Medievale, Rinascimentale, Moderno-Storico (1800-1950), Contemporaneo (post 1950), Distopico, Spaziale, Fantastico, Guerra, Crime-Thriller, Filosofico, Biografico, Familiare, Psicologico, Avventura, Classico-Antico

IMPORTANTE: rispondi SOLO con JSON valido.
Output: { "vita_vissuta": "Hai...", "mondo": "categoria" }`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY mancante" }, { status: 503 });

  // Auth check
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  let body: { bookCatalogId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body non valido" }, { status: 400 }); }
  if (!body.bookCatalogId) return NextResponse.json({ error: "bookCatalogId mancante" }, { status: 400 });

  // Check if vita already exists in global catalog
  const { data: existing } = await sb
    .from("books_ai_metadata")
    .select("vita_vissuta, mondo")
    .eq("book_id", body.bookCatalogId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: true, vita_vissuta: existing.vita_vissuta, mondo: existing.mondo });
  }

  // Get book info from global catalog
  const { data: book, error: bookErr } = await sb
    .from("books")
    .select("title, authors, genres")
    .eq("id", body.bookCatalogId)
    .single();

  if (bookErr || !book) {
    return NextResponse.json({ error: "Libro non trovato" }, { status: 404 });
  }

  const prompt = `Titolo: "${book.title}" | Autore: ${(book.authors as string[])[0] ?? "Sconosciuto"} | Generi: ${((book.genres as string[]) ?? []).slice(0, 3).join(", ") || "vari"}`;

  try {
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.88,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { vita_vissuta?: string; mondo?: string };
    if (!parsed.vita_vissuta) return NextResponse.json({ error: "Risposta GPT malformata" }, { status: 500 });

    // Save to global catalog
    await sb.from("books_ai_metadata").upsert(
      { book_id: body.bookCatalogId, vita_vissuta: parsed.vita_vissuta, mondo: parsed.mondo ?? "Contemporaneo" },
      { onConflict: "book_id" }
    );

    return NextResponse.json({ vita_vissuta: parsed.vita_vissuta, mondo: parsed.mondo });
  } catch (e) {
    console.error("book-vita error:", e);
    return NextResponse.json({ error: "Errore GPT" }, { status: 500 });
  }
}
