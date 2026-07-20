import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface GBVolume {
  volumeInfo?: {
    description?: string;
    language?: string;
    title?: string;
  };
}

async function gbSearch(q: string, italian: boolean): Promise<GBVolume[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    q, maxResults: "10", key, country: "IT",
    ...(italian ? { langRestrict: "it" } : {}),
  });
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`,
      { next: { revalidate: 60 * 60 * 24 * 7 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GBVolume[] };
    return data.items ?? [];
  } catch { return []; }
}

// Fallback gratuito: descrizione da Open Library (per ISBN). Spesso in inglese,
// ma meglio di niente quando Google non ha la trama. Mai francese.
async function olDescription(isbn: string): Promise<string | null> {
  const pick = (d: unknown): string | null =>
    typeof d === "string" ? d : (d && typeof d === "object" && "value" in d ? String((d as { value: unknown }).value) : null);
  const opt = { headers: { "User-Agent": "VibrazioniLetterarie/1.0" }, signal: AbortSignal.timeout(6000), next: { revalidate: 60 * 60 * 24 * 7 } };
  try {
    const ed = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, opt).then(r => (r.ok ? r.json() : null));
    if (!ed) return null;
    const edDesc = pick(ed.description);
    if (edDesc) return edDesc;
    const workKey = ed.works?.[0]?.key as string | undefined;
    if (workKey) {
      const w = await fetch(`https://openlibrary.org${workKey}.json`, opt).then(r => (r.ok ? r.json() : null));
      const wDesc = pick(w?.description);
      if (wDesc) return wDesc;
    }
    return null;
  } catch { return null; }
}

// GET /api/synopsis?title=&author=&isbn=
// Sinossi UFFICIALE dal catalogo Google Books, preferendo l'edizione ITALIANA
// (la fonte primaria di metadati; niente fonti enciclopediche o inventate).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title")?.trim();
  const author = sp.get("author")?.trim();
  const isbn = sp.get("isbn")?.replace(/[^0-9Xx]/g, "");
  if (!title) return NextResponse.json({ error: "title mancante" }, { status: 400 });

  const byTitle = `intitle:"${title}"${author ? ` inauthor:"${author}"` : ""}`;

  // Raccolgo le descrizioni da PIÙ edizioni e scelgo la MIGLIORE (vera sinossi),
  // non la prima: molte edizioni hanno solo trafiletti di marketing.
  const items = [
    ...(await gbSearch(byTitle, true)),
    ...(await gbSearch(byTitle, false)),
    ...(isbn && isbn.length >= 10 ? await gbSearch(`isbn:${isbn}`, false) : []),
  ];

  type Cand = { desc: string; lang: string };
  const cands: Cand[] = items
    .map(v => ({ desc: (v.volumeInfo?.description ?? "").trim(), lang: v.volumeInfo?.language ?? "" }))
    .filter(c => c.desc.length > 0 && c.lang !== "fr");   // MAI francese

  // Priorità: edizioni italiane; se nessuna, inglesi
  const italian = cands.filter(c => c.lang === "it");
  const pool = italian.length ? italian : cands.filter(c => c.lang === "en");
  // "La migliore" = la più ricca: una vera sinossi è più lunga di un trafiletto.
  // Dedup e ordina per lunghezza decrescente.
  const seen = new Set<string>();
  const best = pool
    .filter(c => { const k = c.desc.slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.desc.length - a.desc.length)[0];

  const clip = (s: string) => (s.length > 1500 ? s.slice(0, 1500) + "…" : s);

  // 1) Google Books: la descrizione più ricca (anche breve va bene: è ufficiale, non inventata)
  if (best) {
    return NextResponse.json({ found: true, extract: clip(best.desc), language: best.lang || null, source: "google" });
  }
  // 2) Fallback gratuito: Open Library (quando Google non ha proprio la trama)
  if (isbn && isbn.length >= 10) {
    const ol = await olDescription(isbn);
    if (ol && !/\bà\b|les héros|c'est|dans le/i.test(ol.slice(0, 120))) {   // scarta l'occasionale francese
      return NextResponse.json({ found: true, extract: clip(ol.trim()), language: null, source: "openlibrary" });
    }
  }
  // 3) Nessuna fonte affidabile → niente trama (mai inventata)
  return NextResponse.json({ found: false });
}
