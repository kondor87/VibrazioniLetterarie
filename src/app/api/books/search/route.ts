import { NextRequest, NextResponse } from "next/server";
import type { BookSearchResult } from "@/types/book";

// Mappa categorie Google Books → generi italiani usati nell'app
const CATEGORY_MAP: Record<string, string> = {
  // ── Narrativa ──────────────────────────────────────────────────────────────
  "Fiction":                "Narrativa",
  "Literary Fiction":       "Narrativa",
  "General Fiction":        "Narrativa",
  "Contemporary Fiction":   "Narrativa",
  "Science Fiction":        "Narrativa",  // SF → Narrativa (non abbiamo Fantasy/SF separato)
  "Dystopian":              "Narrativa",
  // ── Giallo ─────────────────────────────────────────────────────────────────
  "Mystery":                "Giallo",
  "Crime":                  "Giallo",
  "Detective":              "Giallo",
  "Cozy Mystery":           "Giallo",
  "Police Procedural":      "Giallo",
  "Noir":                   "Giallo",
  // ── Thriller ───────────────────────────────────────────────────────────────
  "Thriller":               "Thriller",
  "Suspense":               "Thriller",
  "Psychological Fiction":  "Thriller",
  "Psychological Thriller": "Thriller",
  "Legal Thriller":         "Thriller",
  "Political Thriller":     "Thriller",
  // ── Horror ─────────────────────────────────────────────────────────────────
  "Horror":                 "Horror",
  "Supernatural Fiction":   "Horror",
  "Gothic Fiction":         "Horror",
  // ── Storico ────────────────────────────────────────────────────────────────
  "Historical Fiction":     "Storico",
  "Historical":             "Storico",
  "War Fiction":            "Storico",
  "War":                    "Storico",
  // ── Avventura ──────────────────────────────────────────────────────────────
  "Adventure":              "Avventura",
  "Action & Adventure":     "Avventura",
  "Sea Stories":            "Avventura",
  "Travel":                 "Avventura",
  // ── Fantasy ────────────────────────────────────────────────────────────────
  "Fantasy":                "Fantasy",
  "Epic Fantasy":           "Fantasy",
  "Urban Fantasy":          "Fantasy",
  // ── Saggistica ─────────────────────────────────────────────────────────────
  "History":                "Saggistica",
  "Science":                "Saggistica",
  "Philosophy":             "Saggistica",
  "Nonfiction":             "Saggistica",
  "Non-fiction":            "Saggistica",
  "True Crime":             "Saggistica",
  "Nature":                 "Saggistica",
  "Essays":                 "Saggistica",
  "Social Science":         "Saggistica",
  "Political Science":      "Saggistica",
  // ── Biografie ──────────────────────────────────────────────────────────────
  "Biography & Autobiography": "Biografie",
  "Biography":              "Biografie",
  "Autobiography":          "Biografie",
  "Memoir":                 "Biografie",
  // ── Crescita Personale ─────────────────────────────────────────────────────
  "Self-Help":              "Crescita Personale",
  "Personal Development":   "Crescita Personale",
  "Motivational":           "Crescita Personale",
  "Spirituality":           "Crescita Personale",
  // ── Psicologia ─────────────────────────────────────────────────────────────
  "Psychology":             "Psicologia",
  "Mental Health":          "Psicologia",
  // ── Business ───────────────────────────────────────────────────────────────
  "Business & Economics":   "Business",
  "Business":               "Business",
  "Economics":              "Business",
  "Finance":                "Business",
  "Management":             "Business",
  // ── Italiano (Google Books langRestrict=it) ────────────────────────────────
  "Narrativa":              "Narrativa",
  "Narrativa italiana":     "Narrativa",
  "Narrativa straniera":    "Narrativa",
  "Gialli e thriller":      "Giallo",
  "Gialli":                 "Giallo",
  "Romanzi storici":        "Storico",
  "Narrativa storica":      "Storico",
  "Narrativa di guerra":    "Storico",
  "Avventura":              "Avventura",
  "Fantasy e fantascienza": "Fantasy",
  "Fantascienza":           "Narrativa",
  "Biografie e autobiografie": "Biografie",
  "Autobiografie":          "Biografie",
  "Memorie":                "Biografie",
  "Sviluppo personale":     "Crescita Personale",
  "Psicologia":             "Psicologia",
  "Economia e finanza":     "Business",
  "Saggistica":             "Saggistica",
  "Storia":                 "Saggistica",
  "Scienza":                "Saggistica",
  "Filosofia":              "Saggistica",
  "Narrativa di viaggio":   "Avventura",
};

function mapCategories(raw: string[]): string[] {
  const mapped = raw
    .flatMap(cat => {
      // Prova corrispondenza esatta
      if (CATEGORY_MAP[cat]) return [CATEGORY_MAP[cat]];
      // Prova corrispondenza parziale
      const key = Object.keys(CATEGORY_MAP).find(k =>
        cat.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(cat.toLowerCase())
      );
      return key ? [CATEGORY_MAP[key]] : [];
    });
  return Array.from(new Set(mapped)); // dedup
}

function improveGoogleCover(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^http:/, "https:")
    .replace(/zoom=\d/, "zoom=3")   // zoom=3 ≈ 300px, più nitido del default zoom=1
    .replace("&edge=curl", "");     // rimuove la piega angolare
}

async function searchGoogleBooks(q: string, italianOnly: boolean): Promise<BookSearchResult[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    q,
    maxResults: "15",
    key,
    ...(italianOnly ? { langRestrict: "it", country: "IT" } : { country: "IT" }),
  });

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return ((data.items || []) as Record<string, unknown>[]).map((item) => {
    const v = (item.volumeInfo || {}) as Record<string, unknown>;
    const ids = (v.industryIdentifiers || []) as Array<{ type: string; identifier: string }>;
    const rawCats = (v.categories || []) as string[];

    return {
      source: "google" as const,
      google_books_id: item.id as string,
      title: v.title as string,
      subtitle: v.subtitle as string | undefined,
      authors: (v.authors as string[] | undefined) || [],
      isbn_13: ids.find((i) => i.type === "ISBN_13")?.identifier,
      isbn_10: ids.find((i) => i.type === "ISBN_10")?.identifier,
      publisher: v.publisher as string | undefined,
      year: (v.publishedDate as string | undefined)?.substring(0, 4),
      pages: v.pageCount as number | undefined,
      language: v.language as string | undefined,
      cover_url: improveGoogleCover(
        (v.imageLinks as Record<string, string> | undefined)?.thumbnail
      ),
      categories: mapCategories(rawCats),
      description: (v.description as string | undefined)?.substring(0, 2000),
    };
  });
}

async function searchOpenLibrary(q: string): Promise<BookSearchResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=key,title,subtitle,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i,language&lang=ita`;
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.docs || []).slice(0, 10).map((b: Record<string, unknown>) => ({
    source: "openlibrary" as const,
    title: b.title as string,
    subtitle: b.subtitle as string | undefined,
    authors: (b.author_name as string[] | undefined) || [],
    isbn_13: (b.isbn as string[] | undefined)?.find((i) => i.length === 13),
    isbn_10: (b.isbn as string[] | undefined)?.find((i) => i.length === 10),
    publisher: (b.publisher as string[] | undefined)?.[0],
    year: b.first_publish_year as number | undefined,
    pages: b.number_of_pages_median as number | undefined,
    language: (b.language as string[] | undefined)?.[0],
    cover_url: b.cover_i
      ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
      : undefined,
    open_library_id: b.key as string,
  }));
}

function merge(
  gbIt: BookSearchResult[],
  gbAll: BookSearchResult[],
  ol: BookSearchResult[],
): BookSearchResult[] {
  const seen = new Set<string>();
  const out: BookSearchResult[] = [];

  function add(book: BookSearchResult) {
    const key =
      book.isbn_13 ||
      book.isbn_10 ||
      `${book.title.toLowerCase().trim()}::${(book.authors[0] || "").toLowerCase().trim()}`;

    if (seen.has(key)) {
      // Già presente: aggiorna cover se Google ha una migliore
      if (book.source === "google" && book.cover_url) {
        const existing = out.find(
          (b) =>
            (b.isbn_13 && b.isbn_13 === book.isbn_13) ||
            (b.isbn_10 && b.isbn_10 === book.isbn_10) ||
            b.title.toLowerCase() === book.title.toLowerCase()
        );
        if (existing && !existing.cover_url) existing.cover_url = book.cover_url;
        if (existing && !existing.categories?.length && book.categories?.length)
          existing.categories = book.categories;
      }
      return;
    }
    seen.add(key);
    out.push(book);
  }

  // Ordine di priorità: Google italiano → Google internazionale → Open Library
  for (const b of gbIt)  add(b);
  for (const b of gbAll) add(b);
  for (const b of ol)    add(b);

  return out.slice(0, 20);
}

export async function GET(req: NextRequest) {
  // ── Lookup per ISBN/codice a barre (esatto, sulle stesse fonti) ──────────────
  const isbnRaw = req.nextUrl.searchParams.get("isbn");
  if (isbnRaw) {
    const isbn = isbnRaw.replace(/[^0-9Xx]/g, "");
    if (isbn.length < 10) return NextResponse.json({ results: [] });
    const [gRes, oRes] = await Promise.allSettled([
      searchGoogleBooks(`isbn:${isbn}`, false),
      searchOpenLibrary(isbn),
    ]);
    const gb = gRes.status === "fulfilled" ? gRes.value : [];
    const ol = oRes.status === "fulfilled" ? oRes.value : [];
    return NextResponse.json({ results: merge(gb, [], ol) });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // Ricerca in parallelo: Google italiano + Open Library (con hint lingua ita)
  const [gbItResult, olResult] = await Promise.allSettled([
    searchGoogleBooks(q, true),
    searchOpenLibrary(q),
  ]);

  const gbIt = gbItResult.status === "fulfilled" ? gbItResult.value : [];
  const ol   = olResult.status   === "fulfilled" ? olResult.value   : [];

  // Se i risultati italiani sono scarsi (< 4), cerca anche senza restrizione lingua
  let gbAll: BookSearchResult[] = [];
  const itCount = gbIt.filter((b) => b.language === "it").length;
  if (itCount < 4) {
    gbAll = await searchGoogleBooks(q, false).catch(() => []);
  }

  const results = merge(gbIt, gbAll, ol);
  return NextResponse.json({ results });
}
