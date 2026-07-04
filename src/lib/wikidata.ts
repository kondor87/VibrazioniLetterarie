// ── Disambiguazione affidabile via Wikidata, testo da Wikipedia ──────────────
// Cercare "John Williams" su Wikipedia restituisce il compositore (più famoso).
// Wikidata ha dati STRUTTURATI (occupazione, istanza-di): li usiamo per scegliere
// l'entità giusta (lo scrittore, il romanzo) e poi prendiamo il riassunto Wikipedia.

const WD_API = "https://www.wikidata.org/w/api.php";
const UA = { "User-Agent": "VibrazioniLetterarie/1.0 (libreria personale)" };
const CACHE = { next: { revalidate: 60 * 60 * 24 * 30 } } as const; // 30 giorni

export interface EntitySummary {
  found: boolean;
  name?: string;
  extract?: string;
  thumbnail?: string | null;
  url?: string | null;
}

interface WdCandidate { id: string; label?: string; description?: string }
interface WikiSummary {
  type?: string; title?: string; extract?: string;
  thumbnail?: { source?: string }; content_urls?: { desktop?: { page?: string } };
}

// scrittori / opere — descrizioni Wikidata (en + it)
const WRITER_RE = /novelist|writer|author|poet|playwright|essayist|screenwriter|journalist|historian|philosopher|biographer|scrittor|scrittrice|romanzier|saggist|drammaturg|autore|autrice|giornalist|filosof|poeta|poetessa/i;
const WORK_RE = /novel|book|short story|literary work|written work|\bwork\b|memoir|autobiograph|poem|essay|play|diary|trilogy|romanzo|racconto|libro|opera|saggio|poema|poesia|raccolta|memorie|autobiografia|diario|trattato|trilogia/i;
// "di/by <autore>" nella descrizione → forte indizio di paternità dell'opera
const BY_RE = /\b(by|di|del|della|dello|de)\b/i;

async function wdSearch(query: string, lang = "en"): Promise<WdCandidate[]> {
  const url = `${WD_API}?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&uselang=${lang}&type=item&limit=15&format=json`;
  try {
    const res = await fetch(url, { headers: UA, ...CACHE });
    if (!res.ok) return [];
    const data = (await res.json()) as { search?: Array<{ id: string; label?: string; description?: string }> };
    return (data.search ?? []).map(s => ({ id: s.id, label: s.label, description: s.description }));
  } catch { return []; }
}

// Trova l'ID dell'opera (romanzo/libro) giusta per titolo + autore
async function findWorkEntity(title: string, authorHint?: string): Promise<string | null> {
  const surname = authorHint?.trim().split(/\s+/).pop()?.toLowerCase();
  for (const lang of ["en", "it"]) {
    const cands = await wdSearch(title, lang);
    // 1) descrizione che cita il cognome dell'autore + è un'opera o "di/by autore"
    let pick = surname
      ? cands.find(c => {
          const d = c.description?.toLowerCase();
          return d && d.includes(surname) && (WORK_RE.test(d) || BY_RE.test(d));
        })
      : undefined;
    // 2) prima opera letteraria plausibile
    if (!pick) pick = cands.find(c => c.description && WORK_RE.test(c.description));
    if (pick) return pick.id;
  }
  return null;
}

// Legge il primo valore-entità di una proprietà (es. P50 = autore)
async function entityClaimId(id: string, prop: string): Promise<string | null> {
  try {
    const res = await fetch(`${WD_API}?action=wbgetentities&ids=${id}&props=claims&format=json`, { headers: UA, ...CACHE });
    if (!res.ok) return null;
    const data = (await res.json()) as { entities?: Record<string, { claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: { id?: string } } } }>> }> };
    return data.entities?.[id]?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
  } catch { return null; }
}

async function wdSitelinkTitle(id: string, italianOnly = false): Promise<{ lang: "it" | "en"; title: string } | null> {
  try {
    const res = await fetch(`${WD_API}?action=wbgetentities&ids=${id}&props=sitelinks&sitefilter=itwiki|enwiki&format=json`, { headers: UA, ...CACHE });
    if (!res.ok) return null;
    const data = (await res.json()) as { entities?: Record<string, { sitelinks?: { itwiki?: { title?: string }; enwiki?: { title?: string } } }> };
    const links = data.entities?.[id]?.sitelinks ?? {};
    if (links.itwiki?.title) return { lang: "it", title: links.itwiki.title };
    if (!italianOnly && links.enwiki?.title) return { lang: "en", title: links.enwiki.title };
    return null;
  } catch { return null; }
}

async function wpSummary(lang: string, title: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: UA, ...CACHE });
    if (!res.ok) return null;
    return (await res.json()) as WikiSummary;
  } catch { return null; }
}

function toResult(s: WikiSummary | null, fallbackName: string): EntitySummary {
  if (!s || !s.extract || s.type === "disambiguation") return { found: false };
  return {
    found: true,
    name: s.title ?? fallbackName,
    extract: s.extract,
    thumbnail: s.thumbnail?.source ?? null,
    url: s.content_urls?.desktop?.page ?? null,
  };
}

async function summaryForEntity(id: string, name: string): Promise<EntitySummary> {
  const sl = await wdSitelinkTitle(id);
  if (!sl) return { found: false };
  let s = await wpSummary(sl.lang, sl.title);
  if ((!s || !s.extract) && sl.lang === "it") s = await wpSummary("en", sl.title);
  return toResult(s, name);
}

/** Bio dell'AUTORE giusto. Primario: via il LIBRO (P50 = autore dell'opera) → infallibile
 *  sugli omonimi. Fallback: per nome, solo se la descrizione indica uno scrittore. */
export async function findPersonSummary(name: string, workTitle?: string): Promise<EntitySummary> {
  // 1) Via il libro: l'autore DI QUESTO libro (niente omonimi)
  if (workTitle) {
    const workId = await findWorkEntity(workTitle, name);
    if (workId) {
      const authorId = await entityClaimId(workId, "P50");
      if (authorId) {
        const r = await summaryForEntity(authorId, name);
        if (r.found) return r;
      }
    }
  }
  // 2) Fallback per nome: SOLO se la descrizione dice chiaramente "scrittore"
  const cands = await wdSearch(name, "en");
  const pick = cands.find(c => c.description && WRITER_RE.test(c.description));
  if (!pick) return { found: false };
  return summaryForEntity(pick.id, name);
}
