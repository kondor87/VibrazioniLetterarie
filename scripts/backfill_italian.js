/**
 * Backfill italiano — descrizioni e copertine edizioni italiane
 *
 * Strategia per ogni libro:
 *  1. Google Books con langRestrict=it  → descrizione IT + copertina edizione italiana
 *  2. Wikipedia IT API (fallback)        → extract in italiano
 *
 * Aggiorna solo se trova dati migliori (non sovrascrive italiano con inglese).
 *
 * Usage: node scripts/backfill_italian.js
 */

const https = require("https");

const SUPABASE_URL     = "https://qshumouizyffkjquzcmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHVtb3VpenlmZmtqcXV6Y212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxMjc4OCwiZXhwIjoyMDk2ODg4Nzg4fQ.tw4FGRZMJigB2a-PdkaRE0zDWC0tSffeV00wi8Nuz6A";
const GOOGLE_BOOKS_KEY = "AIzaSyCGAY0WwEf2ErQTpr-fqTy8TUyxi-syBxU";

// ── Utilità HTTP ─────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "node/backfill-italian" } }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error("Parse error: " + d.slice(0, 120))); }
      });
    }).on("error", reject);
  });
}

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(SUPABASE_URL + path);
    https.get({
      hostname: u.hostname, path: u.pathname + u.search,
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Prefer: "return=minimal",
      }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Rilevamento lingua ────────────────────────────────────────────────────────

const IT_WORDS = new Set([
  "il","la","le","gli","lo","del","della","dei","degli","dello","un","una",
  "che","con","per","non","si","ha","di","da","in","su","al","dal","nel",
  "alla","alle","agli","agli","ma","ed","anche","come","quando","dove","era",
  "sono","è","una","questo","questa","questi","queste","loro","lui","lei","noi",
]);

function isItalian(text) {
  if (!text || text.length < 30) return false;
  const words = text.toLowerCase().replace(/[^a-zàáèéìíòóùú\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 60);
  if (words.length < 5) return false;
  const itCount = words.filter(w => IT_WORDS.has(w)).length;
  return (itCount / words.length) > 0.08; // >8% parole funzione italiane
}

// ── Google Books IT ───────────────────────────────────────────────────────────

async function searchGoogleBooksIT(title, author) {
  const q  = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ""}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&langRestrict=it&maxResults=5&key=${GOOGLE_BOOKS_KEY}`;
  const data = await get(url);
  if (!data.items?.length) return null;
  return pickBestIT(data.items, title, author);
}

function pickBestIT(items, title, author) {
  const titleLow  = title.toLowerCase();
  const authorLow = (author ?? "").toLowerCase();
  const scored = items.map(item => {
    const v = item.volumeInfo;
    const t = (v.title ?? "").toLowerCase();
    const a = (v.authors ?? []).join(" ").toLowerCase();
    let score = 0;
    if (t.includes(titleLow) || titleLow.includes(t)) score += 3;
    if (authorLow && a.includes(authorLow.split(" ").pop())) score += 2;
    if (v.imageLinks) score += 1;
    // Bonus se la lingua dichiarata è italiano
    if (v.language === "it") score += 3;
    // Bonus se la descrizione sembra italiana
    if (isItalian(v.description ?? "")) score += 2;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score >= 3 ? scored[0].item : null;
}

function extractCoverUrl(item) {
  const links = item.volumeInfo?.imageLinks;
  if (!links) return null;
  const raw = links.extraLarge ?? links.large ?? links.medium ?? links.thumbnail ?? links.smallThumbnail;
  if (!raw) return null;
  return raw.replace("http://", "https://").replace("&zoom=1", "&zoom=3").replace("&edge=curl", "");
}

// ── Wikipedia IT ──────────────────────────────────────────────────────────────

async function searchWikipediaIT(title, author) {
  // Cerca su Wikipedia IT
  const query = encodeURIComponent(`${title}${author ? " " + author.split(" ").pop() : ""} romanzo`);
  const searchUrl = `https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&format=json&utf8=1&srlimit=3`;
  const searchData = await get(searchUrl);
  const results = searchData?.query?.search ?? [];
  if (!results.length) {
    // Riprova senza "romanzo"
    const q2 = encodeURIComponent(title);
    const data2 = await get(`https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q2}&format=json&utf8=1&srlimit=3`);
    results.push(...(data2?.query?.search ?? []));
  }
  if (!results.length) return null;

  // Prendi il primo risultato e recupera il summary
  for (const result of results.slice(0, 2)) {
    const pageTitle = encodeURIComponent(result.title);
    const summaryUrl = `https://it.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`;
    try {
      const summary = await get(summaryUrl);
      const extract = summary?.extract;
      if (extract && extract.length > 80 && isItalian(extract)) {
        return extract.slice(0, 2000);
      }
    } catch { /* skip */ }
    await sleep(150);
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching books from Supabase...");
  const books = await supabaseGet("/rest/v1/books?select=id,title,authors,description,cover_url,google_books_id&order=title");
  console.log(`Total books: ${books.length}\n`);

  let updatedDesc = 0, updatedCover = 0, skipped = 0, failed = 0;

  for (const book of books) {
    const title  = book.title;
    const author = book.authors?.[0] ?? "";
    const hasItDesc  = isItalian(book.description ?? "");
    const hasDesc    = !!book.description;
    const hasCover   = !!book.cover_url;

    const label = title.slice(0, 42).padEnd(42);
    process.stdout.write(`${label} `);

    // Se ha già descrizione italiana e copertina → skip
    if (hasItDesc && hasCover) {
      console.log("→ già ok (IT + cover)");
      skipped++;
      continue;
    }

    try {
      const patch = {};
      let source = "";

      // ── 1. Google Books IT ────────────────────────────────────────────────
      const gbItem = await searchGoogleBooksIT(title, author);
      await sleep(250);

      if (gbItem) {
        const gbDesc    = gbItem.volumeInfo?.description ?? null;
        const gbCover   = extractCoverUrl(gbItem);
        const gbDescIT  = gbDesc && isItalian(gbDesc);

        if (gbDescIT && (!hasDesc || !hasItDesc)) {
          patch.description = gbDesc.slice(0, 2000);
          source += "desc(GB) ";
        }
        if (gbCover && !hasCover) {
          patch.cover_url = gbCover;
          source += "cover(GB) ";
        }
      }

      // ── 2. Wikipedia IT (solo se ancora senza descrizione IT) ─────────────
      if (!patch.description && (!hasDesc || !hasItDesc)) {
        const wikiDesc = await searchWikipediaIT(title, author);
        await sleep(200);
        if (wikiDesc) {
          patch.description = wikiDesc;
          source += "desc(Wiki) ";
        }
      }

      if (Object.keys(patch).length === 0) {
        const reason = hasItDesc ? "desc IT già ok" : hasDesc ? "solo EN (nessuna IT trovata)" : "nessuna desc trovata";
        console.log(`→ skip (${reason})`);
        skipped++;
        continue;
      }

      // ── Aggiorna Supabase ─────────────────────────────────────────────────
      const res = await supabasePatch(`/rest/v1/books?id=eq.${book.id}`, patch);
      if (res.status >= 200 && res.status < 300) {
        if (patch.description) updatedDesc++;
        if (patch.cover_url)   updatedCover++;
        console.log(`→ ✓ ${source.trim()}`);
      } else {
        console.log(`→ ✗ HTTP ${res.status}`);
        failed++;
      }

    } catch (e) {
      console.log(`→ ✗ ${e.message.slice(0, 60)}`);
      failed++;
    }
  }

  console.log(`\n── Riepilogo ──────────────────────────────────────────`);
  console.log(`  Descrizioni aggiornate : ${updatedDesc}`);
  console.log(`  Copertine aggiornate   : ${updatedCover}`);
  console.log(`  Saltati                : ${skipped}`);
  console.log(`  Errori                 : ${failed}`);
}

main().catch(console.error);
