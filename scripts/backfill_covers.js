/**
 * Backfill: arricchisce i libri nel DB con dati Google Books
 * - cover_url (thumbnail HD)
 * - google_books_id
 * - description
 * - isbn_13, isbn_10 (se mancanti)
 *
 * Usage: node scripts/backfill_covers.js
 */

const https = require("https");

const SUPABASE_URL     = "https://qshumouizyffkjquzcmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHVtb3VpenlmZmtqcXV6Y212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxMjc4OCwiZXhwIjoyMDk2ODg4Nzg4fQ.tw4FGRZMJigB2a-PdkaRE0zDWC0tSffeV00wi8Nuz6A";
const GOOGLE_BOOKS_KEY = "AIzaSyCGAY0WwEf2ErQTpr-fqTy8TUyxi-syBxU";

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "node/backfill" } }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { reject(new Error("Parse error: " + d.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    https.get({ hostname: url.hostname, path: url.pathname + url.search,
      headers: { "apikey": SERVICE_ROLE_KEY, "Authorization": `Bearer ${SERVICE_ROLE_KEY}` }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      method: "PATCH",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Prefer": "return=minimal"
      }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function searchGoogleBooks(title, author) {
  // Try with author first, then title-only if no results
  const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3&langRestrict=&key=${GOOGLE_BOOKS_KEY}`;
  const data = await get(url);

  if (!data.items?.length) {
    // Fallback: title only
    const q2 = encodeURIComponent(title);
    const data2 = await get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${q2}&maxResults=3&key=${GOOGLE_BOOKS_KEY}`);
    if (!data2.items?.length) return null;
    return pickBest(data2.items, title, author);
  }
  return pickBest(data.items, title, author);
}

function pickBest(items, title, author) {
  // Prefer items where title matches closely
  const titleLower = title.toLowerCase();
  const authorLower = author?.toLowerCase() ?? "";
  const scored = items.map(item => {
    const vol = item.volumeInfo;
    const t = (vol.title ?? "").toLowerCase();
    const a = (vol.authors ?? []).join(" ").toLowerCase();
    let score = 0;
    if (t.includes(titleLower) || titleLower.includes(t)) score += 3;
    if (authorLower && a.includes(authorLower.split(" ").pop())) score += 2;
    if (vol.imageLinks) score += 1;
    if (vol.description) score += 1;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

function extractCoverUrl(item) {
  const links = item.volumeInfo?.imageLinks;
  if (!links) return null;
  // Prefer large → medium → thumbnail, force https, remove zoom/edge params
  const raw = links.extraLarge ?? links.large ?? links.medium ?? links.thumbnail ?? links.smallThumbnail;
  if (!raw) return null;
  // Google Books thumbnails: upgrade to larger version by modifying zoom param
  return raw.replace("http://", "https://").replace("&zoom=1", "&zoom=3").replace("&edge=curl", "");
}

function extractISBNs(item) {
  const identifiers = item.volumeInfo?.industryIdentifiers ?? [];
  const isbn13 = identifiers.find(i => i.type === "ISBN_13")?.identifier ?? null;
  const isbn10 = identifiers.find(i => i.type === "ISBN_10")?.identifier ?? null;
  return { isbn13, isbn10 };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("Fetching books from Supabase...");
  const books = await supabaseGet("/rest/v1/books?select=id,title,authors,cover_url,google_books_id,description,isbn_13,isbn_10");

  const needsUpdate = books.filter(b => !b.google_books_id);
  console.log(`Total books: ${books.length} | Needs Google Books enrichment: ${needsUpdate.length}\n`);

  let updated = 0, failed = 0, skipped = 0;

  for (const book of needsUpdate) {
    const author = book.authors?.[0] ?? "";
    process.stdout.write(`[${updated + failed + skipped + 1}/${needsUpdate.length}] ${book.title.slice(0, 45).padEnd(45)} `);

    try {
      const item = await searchGoogleBooks(book.title, author);
      if (!item) {
        console.log("→ not found");
        skipped++;
        await sleep(300);
        continue;
      }

      const coverUrl = extractCoverUrl(item);
      const { isbn13, isbn10 } = extractISBNs(item);
      const description = item.volumeInfo?.description ?? null;
      const googleBooksId = item.id;

      const patch = {};
      if (googleBooksId) patch.google_books_id = googleBooksId;
      if (coverUrl && !book.cover_url) patch.cover_url = coverUrl;
      if (description && !book.description) patch.description = description.slice(0, 2000);
      if (isbn13 && !book.isbn_13) patch.isbn_13 = isbn13;
      if (isbn10 && !book.isbn_10) patch.isbn_10 = isbn10;

      if (Object.keys(patch).length === 0) {
        console.log("→ nothing to update");
        skipped++;
        await sleep(200);
        continue;
      }

      const res = await supabasePatch(`/rest/v1/books?id=eq.${book.id}`, patch);
      if (res.status >= 200 && res.status < 300) {
        const what = [
          patch.cover_url ? "cover" : (book.cover_url ? "cover(kept)" : "no cover"),
          patch.description ? "desc" : "",
          patch.isbn_13 ? "isbn13" : "",
        ].filter(Boolean).join("+");
        console.log(`→ ✓ ${what} [gbid: ${googleBooksId}]`);
        updated++;
      } else {
        console.log(`→ ✗ HTTP ${res.status}: ${res.body.slice(0, 80)}`);
        failed++;
      }
    } catch (e) {
      console.log(`→ ✗ error: ${e.message.slice(0, 60)}`);
      failed++;
    }

    await sleep(250); // Google Books API rate limit: 100 req/s, be polite
  }

  console.log(`\n✓ Done: ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
