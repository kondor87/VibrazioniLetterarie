/**
 * Reclassificazione generi — assegna generi corretti a tutti i 78 libri
 * Tassonomia ampliata: Narrativa | Giallo | Thriller | Horror | Storico |
 *                      Avventura | Fantasy | Saggistica | Biografie |
 *                      Crescita Personale | Psicologia | Business
 *
 * Usage: node scripts/reclassify_genres.js
 */

const https = require("https");

const SUPABASE_URL     = "https://qshumouizyffkjquzcmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHVtb3VpenlmZmtqcXV6Y212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMxMjc4OCwiZXhwIjoyMDk2ODg4Nzg4fQ.tw4FGRZMJigB2a-PdkaRE0zDWC0tSffeV00wi8Nuz6A";

// ── Mappa definitiva: titolo → generi corretti ────────────────────────────────
// Fonte: conoscenza letteraria dei testi, non Google Books
const GENRE_MAP = {
  // ── Narrativa (fiction letteraria / contemporanea) ──────────────────────────
  "1984":                              ["Narrativa"],
  "Cecità":                            ["Narrativa"],
  "Cuore di tenebra":                  ["Narrativa"],
  "Delitto e castigo":                 ["Narrativa"],
  "Fahrenheit 451":                    ["Narrativa"],
  "Fedeltà":                           ["Narrativa"],
  "Fiori per Algernon":                ["Narrativa"],
  "Furore":                            ["Narrativa"],
  "Il bosco degli urogalli":           ["Narrativa"],
  "Il buio oltre la siepe":            ["Narrativa"],
  "Il cacciatore di aquiloni":         ["Narrativa"],
  "Il filo del rasoio":                ["Narrativa"],
  "Il grande Gatsby":                  ["Narrativa"],
  "Il lamento di Portnoy":             ["Narrativa"],
  "Il miglio verde":                   ["Narrativa"],
  "Il pastore d'Islanda":              ["Narrativa"],
  "Il vecchio e il mare":              ["Narrativa"],
  "Kafka sulla spiaggia":              ["Narrativa"],
  "L'ombra del vento":                 ["Narrativa"],
  "La felicità del lupo":              ["Narrativa"],
  "La strada":                         ["Narrativa"],
  "La trilogia della città di K.":     ["Narrativa"],
  "Le notti bianche":                  ["Narrativa"],
  "Le otto montagne":                  ["Narrativa"],
  "Non lasciarmi":                     ["Narrativa"],
  "Non ora, non qui":                  ["Narrativa"],
  "Norwegian Wood":                    ["Narrativa"],
  "Onesto":                            ["Narrativa"],
  "Resto qui":                         ["Narrativa"],
  "Revolutionary Road":                ["Narrativa"],
  "Stoner":                            ["Narrativa"],
  "Uomini e topi":                     ["Narrativa"],

  // ── Giallo (mystery / detective / noir) ────────────────────────────────────
  "Assassinio a bordo":                ["Giallo"],
  "Assassinio sull'Orient Express":    ["Giallo"],
  "Dieci piccoli indiani":             ["Giallo"],
  "Fiori sopra l'inferno":             ["Giallo"],
  "Il bosco degli urogalli":           ["Giallo"],   // solo se Mario Rigoni Stern non coincide
  "Il giorno della civetta":           ["Giallo"],
  "L'uomo di neve":                    ["Giallo"],
  "Uomini che odiano le donne":        ["Giallo"],

  // ── Thriller (psicologico / suspense) ──────────────────────────────────────
  "22/11/63":                          ["Thriller", "Storico"],
  "Cara bambina":                      ["Thriller"],
  "Follia":                            ["Thriller"],
  "Inferno":                           ["Thriller"],
  "La casa delle voci":                ["Thriller"],
  "La lunga marcia":                   ["Thriller"],
  "La terapia":                        ["Thriller"],
  "La verità sul caso Harry Quebert":  ["Thriller"],
  "Teddy":                             ["Thriller"],

  // ── Horror ─────────────────────────────────────────────────────────────────
  "Cimitero malefico":                 ["Horror"],
  "IT":                                ["Horror"],
  "Le notti di Salem":                 ["Horror"],
  "Misery":                            ["Horror"],

  // ── Storico (romanzo storico / narrativa di guerra) ────────────────────────
  "I pilastri della terra":            ["Storico"],
  "Il conte di Montecristo":           ["Storico", "Avventura"],
  "Il gattopardo":                     ["Storico"],
  "Il nome della rosa":                ["Storico", "Giallo"],
  "Il sergente nella neve":            ["Storico"],
  "La cruna dell'ago":                 ["Storico"],
  "Lo scudo di Talos":                 ["Storico"],
  "Mondo senza fine":                  ["Storico"],
  "Niente di nuovo sul fronte occidentale": ["Storico"],
  "Un anno sull'altipiano":            ["Storico"],
  "Una colonna di fuoco":              ["Storico"],

  // ── Avventura ──────────────────────────────────────────────────────────────
  "Endurance":                         ["Avventura"],
  "L'isola del tesoro":                ["Avventura"],
  "Lonesome Dove":                     ["Avventura"],
  "Moby Dick":                         ["Avventura"],
  "Shantaram":                         ["Avventura"],

  // ── Saggistica ─────────────────────────────────────────────────────────────
  "I tre giorni di Pompei":            ["Saggistica"],
  "L'avversario":                      ["Saggistica"],
  "L'ordine del tempo":                ["Saggistica"],
  "Se questo è un uomo":               ["Biografie", "Saggistica"],
  "Tra trent'anni saremo tutti morti": ["Saggistica"],

  // ── Biografie ──────────────────────────────────────────────────────────────
  "Il pane perduto":                   ["Biografie"],
  "Open":                              ["Biografie"],

  // ── Crescita Personale ─────────────────────────────────────────────────────
  "Il magico potere del riordino":     ["Crescita Personale"],
  "Il monaco che vendette la sua Ferrari": ["Crescita Personale"],
  "Il potere di adesso":               ["Crescita Personale"],
};

// Conflitto "Il bosco degli urogalli": era nella sezione sia Narrativa che Giallo
// Il libro di Mario Rigoni Stern è narrativa/racconti di montagna, NON un giallo
// Quindi va solo Narrativa:
GENRE_MAP["Il bosco degli urogalli"] = ["Narrativa"];

// ── Utilità HTTP ─────────────────────────────────────────────────────────────

function sbGet(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: "qshumouizyffkjquzcmv.supabase.co",
      path,
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, Accept: "application/json" },
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

function sbPatch(id, genres) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ genres });
    const req = https.request({
      hostname: "qshumouizyffkjquzcmv.supabase.co",
      path: `/rest/v1/books?id=eq.${id}`,
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Prefer: "return=minimal",
      },
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject); req.write(data); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching books...");
  const books = await sbGet("/rest/v1/books?select=id,title,genres&order=title");
  console.log(`${books.length} books found\n`);

  let updated = 0, unchanged = 0, unknown = 0;

  for (const book of books) {
    const newGenres = GENRE_MAP[book.title];
    const label = book.title.slice(0, 48).padEnd(48);

    if (!newGenres) {
      console.log(`${label} → ⚠ NON IN MAPPA`);
      unknown++;
      continue;
    }

    const oldStr = (book.genres || []).sort().join(",");
    const newStr = newGenres.slice().sort().join(",");

    if (oldStr === newStr) {
      console.log(`${label} → = ${newGenres.join(", ")}`);
      unchanged++;
      continue;
    }

    const status = await sbPatch(book.id, newGenres);
    if (status >= 200 && status < 300) {
      const arrow = (book.genres?.length ? `[${book.genres.join(",")}]` : "[]").padEnd(22);
      console.log(`${label} → ✓  ${arrow} → [${newGenres.join(",")}]`);
      updated++;
    } else {
      console.log(`${label} → ✗ HTTP ${status}`);
    }
    await sleep(80);
  }

  console.log(`\n── Riepilogo ──────────────────────────────`);
  console.log(`  Aggiornati : ${updated}`);
  console.log(`  Invariati  : ${unchanged}`);
  console.log(`  Non in mappa: ${unknown}`);
}

main().catch(console.error);
