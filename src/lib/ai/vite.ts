import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

// Generazione delle "vite vissute" — logica condivisa tra la route on-demand
// (/api/ai/jobs/vite-refresh) e il cron mensile. Batch piccoli + fallback
// riga-per-riga per robustezza; prompt che chiede luoghi e date REALI.

export const VITE_SYSTEM_PROMPT = `Sei un narratore di esperienze letterarie. Per ogni libro fornito scrivi, in seconda persona, la vita che il lettore ha vissuto attraverso i protagonisti.

REGOLE FONDAMENTALI:
- Inizia SEMPRE con "Hai..."
- Indica il LUOGO reale e la DATA/EPOCA reale dell'ambientazione del libro, MA SOLO se davvero noti o stabiliti nell'opera.
  · Esempio: "La cruna dell'ago" → "Hai spiato per la Germania nazista nella Gran Bretagna del 1944, braccato dai servizi segreti mentre custodivi il segreto dello sbarco in Normandia."
- Se il luogo o la data NON sono noti/certi, NON inventarli: ometti quell'elemento. Meglio nessuna data che una data falsa.
- Attieniti a fatti VERI e REALI del libro (ambientazione, periodo storico, ruolo del protagonista). Non inventare eventi o dettagli estranei all'opera.
- Max 2 frasi, max 42 parole. Presente storico, tono letterario. Mai generico.

CATEGORIE MONDO (scegli sempre la più precisa):
Medievale, Rinascimentale, Moderno-Storico (1800-1950), Contemporaneo (post 1950), Distopico, Spaziale, Fantastico, Guerra, Crime-Thriller, Filosofico, Biografico, Familiare, Psicologico, Avventura, Classico-Antico

IMPORTANTE: rispondi SOLO con JSON valido.
Output: { "vite": [ { "book_id": "...", "vita_vissuta": "Hai...", "mondo": "categoria" } ] }`;

const BATCH_SIZE = 16;

export interface ViteBook {
  book_id: string;
  title: string;
  authors: string[] | null;
  genres: string[] | null;
  published_year: number | null;
  description: string | null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Recupera gli oggetti vita COMPLETI anche da un JSON troncato (max_tokens raggiunto):
// invece di perdere l'intero batch, salva quelli generati per intero prima del taglio.
function salvageVite(raw: string): Array<{ book_id: string; vita_vissuta: string; mondo: string }> {
  const out: Array<{ book_id: string; vita_vissuta: string; mondo: string }> = [];
  const re = /\{\s*"book_id"\s*:\s*"([^"]+)"\s*,\s*"vita_vissuta"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"mondo"\s*:\s*"([^"]*)"\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    try {
      out.push({ book_id: m[1], vita_vissuta: JSON.parse(`"${m[2]}"`), mondo: m[3] });
    } catch { /* oggetto malformato: salta */ }
  }
  return out;
}

/** Genera e salva (upsert) le vite per i libri forniti. Ritorna conteggi. */
export async function generateViteForBooks(
  sb: SupabaseClient,
  openai: OpenAI,
  books: ViteBook[],
): Promise<{ generated: number; errors: string[] }> {
  let generated = 0;
  const errors: string[] = [];

  for (const batch of chunk(books, BATCH_SIZE)) {
    const list = batch.map(b => {
      const year = b.published_year ? ` | Anno pubbl.: ${b.published_year}` : "";
      const desc = b.description ? ` | Trama: ${b.description.replace(/\s+/g, " ").slice(0, 280)}` : "";
      return `book_id: "${b.book_id}" | Titolo: "${b.title}" | Autore: ${(b.authors ?? [])[0] ?? "N/A"} | Generi: ${(b.genres ?? []).slice(0, 3).join(", ") || "vari"}${year}${desc}`;
    }).join("\n");

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 6000,
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: VITE_SYSTEM_PROMPT },
          { role: "user", content: `Genera le vite vissute per questi libri. Usa luogo e data SOLO se reali/noti:\n\n${list}` },
        ],
      });

      const raw = res.choices[0]?.message?.content ?? "{}";
      // JSON completo → parse normale; JSON troncato → recupero gli oggetti interi (niente batch perso)
      let viteRaw: Array<{ book_id: string; vita_vissuta: string; mondo: string }>;
      try {
        viteRaw = (JSON.parse(raw) as { vite?: typeof viteRaw }).vite ?? [];
      } catch {
        viteRaw = salvageVite(raw);
        if (viteRaw.length) errors.push(`batch troncato: recuperate ${viteRaw.length}/${batch.length}`);
      }
      const vite = viteRaw.filter(v => v.book_id && v.vita_vissuta);
      if (vite.length === 0) { errors.push("batch senza risultati"); continue; }

      const rows = vite.map(v => ({
        book_id:      v.book_id,
        vita_vissuta: v.vita_vissuta,
        mondo:        v.mondo ?? "Contemporaneo",
        generated_at: new Date().toISOString(),
      }));

      const { error: upErr } = await sb.from("books_ai_metadata").upsert(rows, { onConflict: "book_id" });
      if (upErr) {
        // un book_id non valido (FK) fa fallire l'intero batch → riprova riga per riga
        errors.push(`db: ${upErr.message}`);
        for (const row of rows) {
          const { error: rowErr } = await sb.from("books_ai_metadata").upsert(row, { onConflict: "book_id" });
          if (!rowErr) generated += 1;
        }
        continue;
      }
      generated += rows.length;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "errore batch");
    }
  }

  return { generated, errors };
}
