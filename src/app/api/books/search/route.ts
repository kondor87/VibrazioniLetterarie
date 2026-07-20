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

// ── SBN — Servizio Bibliotecario Nazionale (catalogo biblioteche italiane) ────
// Gateway JSON usato dall'app ufficiale: copertura italiana imbattibile (~10M record).
interface SBNRecord {
  isbn?: string; autorePrincipale?: string; titolo?: string;
  pubblicazione?: string; copertina?: string;
}

// "Eco, Umberto" → "Umberto Eco" (SBN dà Cognome, Nome)
function sbnAuthor(s?: string): string | null {
  if (!s) return null;
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : s.trim();
}

// "Il nome della rosa / Umberto Eco" → "Il nome della rosa"
function sbnTitle(t: string): string {
  return t.split(" / ")[0].replace(/\s+/g, " ").trim();
}

// "Milano : Bompiani, 1994" → { publisher: "Bompiani", year: "1994" }
function sbnPub(pub?: string): { publisher?: string; year?: string } {
  if (!pub) return {};
  const year = pub.match(/(1[0-9]{3}|20[0-9]{2})/)?.[1];
  const afterColon = pub.split(" : ")[1];
  // "Sansoni, c1961" / "Editrice Nord, [2005]" → taglio alla prima virgola, tolgo brackets/©
  const publisher = afterColon
    ? afterColon.split(",")[0].replace(/[[\]©]/g, "").trim() || undefined
    : undefined;
  return { publisher, year };
}

async function searchSBN(query: string, byIsbn: boolean): Promise<BookSearchResult[]> {
  const param = byIsbn
    ? `isbn=${encodeURIComponent(query.replace(/[^0-9Xx]/g, ""))}`
    : `any=${encodeURIComponent(query)}&type=0`;
  const url = `https://opac.sbn.it/opacmobilegw/search.json?${param}&start=0&rows=15`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VibrazioniLetterarie/1.0 (libreria personale)" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const recs = (data.briefRecords ?? []) as SBNRecord[];
    return recs
      .filter((r) => r.titolo)
      .map((r) => {
        const raw = (r.isbn ?? "").replace(/[^0-9Xx]/g, "");
        const isbn13 = raw.length === 13 ? raw : undefined;
        const isbn10 = raw.length === 10 ? raw : undefined;
        const { publisher, year } = sbnPub(r.pubblicazione);
        const author = sbnAuthor(r.autorePrincipale);
        // Lingua dell'edizione da dati di catalogo reali:
        // "traduzione di …" nel titolo = edizione tradotta in italiano;
        // luogo di pubblicazione italiano = edizione italiana.
        const place = (r.pubblicazione ?? "").split(" : ")[0].toLowerCase();
        const isTranslation = /traduzione|tradotto|trad\.\s*(di|it)/i.test(r.titolo ?? "");
        const italianPlace = /\b(milano|torino|roma|firenze|napoli|bologna|bari|venezia|ven(e|)zia|palermo|genova|padova|vicenza|verona|catania|modena|parma|brescia|trezzano|rimini|pisa|siena|trento|bergamo|italia)\b/.test(place);
        const language = isTranslation || italianPlace ? "it" : undefined;
        // Copertina: da ISBN via Open Library (dominio consentito, https)
        const cover = (isbn13 || isbn10)
          ? `https://covers.openlibrary.org/b/isbn/${isbn13 || isbn10}-M.jpg`
          : undefined;
        return {
          source: "sbn" as const,
          title: sbnTitle(r.titolo as string),
          authors: author ? [author] : [],
          isbn_13: isbn13,
          isbn_10: isbn10,
          publisher,
          year,
          language,
          cover_url: cover,
        } satisfies BookSearchResult;
      });
  } catch {
    return [];
  }
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
    const [gRes, oRes, sRes] = await Promise.allSettled([
      searchGoogleBooks(`isbn:${isbn}`, false),
      searchOpenLibrary(isbn),
      searchSBN(isbn, true),
    ]);
    const gb  = gRes.status === "fulfilled" ? gRes.value : [];
    const ol  = oRes.status === "fulfilled" ? oRes.value : [];
    const sbn = sRes.status === "fulfilled" ? sRes.value : [];
    return NextResponse.json({ results: merge(gb, [], [...ol, ...sbn]) });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  // Ricerca in parallelo: Google italiano + Open Library + SBN (catalogo italiano)
  const [gbItResult, olResult, sbnResult] = await Promise.allSettled([
    searchGoogleBooks(q, true),
    searchOpenLibrary(q),
    searchSBN(q, false),
  ]);

  const gbIt = gbItResult.status === "fulfilled" ? gbItResult.value : [];
  const ol   = olResult.status   === "fulfilled" ? olResult.value   : [];
  const sbn  = sbnResult.status  === "fulfilled" ? sbnResult.value  : [];

  // Se i risultati italiani sono scarsi (< 4), cerca anche senza restrizione lingua
  let gbAll: BookSearchResult[] = [];
  const itCount = gbIt.filter((b) => b.language === "it").length;
  if (itCount < 4) {
    gbAll = await searchGoogleBooks(q, false).catch(() => []);
  }

  // Priorità dedup: Google IT → Google intl → Open Library → SBN (riempie i buchi italiani)
  const results = merge(gbIt, gbAll, [...ol, ...sbn]);
  return NextResponse.json({ results });
}
