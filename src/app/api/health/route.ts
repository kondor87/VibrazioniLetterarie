import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Variabili env mancanti" }, { status: 500 });
  }

  try {
    const sb = createClient(url, key);
    // Conta le righe nella tabella books (nessun dato ancora, ma verifica la connessione)
    const { count, error } = await sb
      .from("books")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      supabase_url: url,
      books_count: count ?? 0,
      message: "Connessione Supabase OK",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 },
    );
  }
}
