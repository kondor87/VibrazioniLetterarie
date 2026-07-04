import { NextResponse } from "next/server";
import { findPersonSummary } from "@/lib/wikidata";

export const runtime = "nodejs";

// GET /api/author?name=John+Williams → bio dell'AUTORE giusto (disambiguato via
// Wikidata per occupazione = scrittore, così "Stoner" non porta al compositore).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const name = sp.get("name")?.trim();
  const title = sp.get("title")?.trim() || undefined; // il libro disambigua l'omonimo
  if (!name) return NextResponse.json({ error: "name mancante" }, { status: 400 });

  const r = await findPersonSummary(name, title);
  if (!r.found) return NextResponse.json({ found: false });
  return NextResponse.json({
    found: true,
    name: r.name ?? name,
    extract: r.extract,
    thumbnail: r.thumbnail ?? null,
    url: r.url ?? null,
  });
}
