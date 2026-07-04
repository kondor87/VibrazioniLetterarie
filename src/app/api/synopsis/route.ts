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

  // Preferenza lingua: italiano → inglese → qualsiasi MA MAI francese
  // (il francese era la causa delle sinossi sbagliate, es. Lonesome Dove)
  const pickByLang = (items: GBVolume[]): GBVolume | undefined => {
    const withDesc = items.filter(v => v.volumeInfo?.description);
    return withDesc.find(v => v.volumeInfo?.language === "it")
      ?? withDesc.find(v => v.volumeInfo?.language === "en")
      ?? withDesc.find(v => v.volumeInfo?.language !== "fr");
  };

  // 1) edizione italiana per titolo+autore
  let pick = pickByLang(await gbSearch(byTitle, true));
  // 2) se manca, prova per ISBN
  if (!pick && isbn && isbn.length >= 10) pick = pickByLang(await gbSearch(`isbn:${isbn}`, false));

  const description = pick?.volumeInfo?.description;
  if (!description) return NextResponse.json({ found: false });
  return NextResponse.json({
    found: true,
    extract: description.length > 1500 ? description.slice(0, 1500) + "…" : description,
    language: pick?.volumeInfo?.language ?? null,
  });
}
