import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { generateViteForBooks, type ViteBook } from "@/lib/ai/vite";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY mancante" }, { status: 503 });

  // force=true → rigenera TUTTI i libri letti (sovrascrive la cache)
  let force = false;
  try { force = (await req.json())?.force === true; } catch { /* nessun body */ }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { data: rows } = await sb
    .from("user_library")
    .select("book_id, title, authors, genres, published_year, description")
    .eq("user_id", user.id)
    .in("status", ["letto", "rileggendo"]);

  if (!rows?.length) return NextResponse.json({ generated: 0 });
  const allBooks = (rows as ViteBook[]).filter(r => r.book_id);

  // Determina i libri da generare (tutti se force, altrimenti solo i mancanti)
  let target = allBooks;
  if (!force) {
    const { data: existing } = await sb
      .from("books_ai_metadata")
      .select("book_id")
      .in("book_id", allBooks.map(b => b.book_id));
    const done = new Set((existing ?? []).map(r => r.book_id as string));
    target = allBooks.filter(b => !done.has(b.book_id));
  }

  if (target.length === 0) return NextResponse.json({ generated: 0, skipped: allBooks.length });

  const openai = new OpenAI({ apiKey });
  const { generated, errors } = await generateViteForBooks(sb, openai, target);

  if (generated === 0) {
    return NextResponse.json({ error: `Generazione fallita: ${errors[0] ?? "errore sconosciuto"}` }, { status: 500 });
  }
  return NextResponse.json({ generated, failed: errors.length, ...(errors.length ? { warning: errors[0] } : {}) });
}
