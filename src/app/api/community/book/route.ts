import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toBookStat, MIN_PERCENTILE_SAMPLE, type RawCommunityStat } from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Percentile di velocità: % di lettori più LENTI dell'utente (myPpd in pagine/giorno).
// Calcolato on-demand dal comportamento reale di tutti i lettori del libro.
async function velocityPercentile(
  sb: ReturnType<typeof createServiceClient>,
  bookId: string,
  pageCount: number | null,
  myPpd: number,
): Promise<number | null> {
  if (!pageCount || pageCount <= 0) return null;
  const { data, error } = await sb
    .from("user_books")
    .select("started_at, finished_at")
    .eq("book_id", bookId)
    .not("started_at", "is", null)
    .not("finished_at", "is", null);
  if (error || !data) return null;

  const ppds: number[] = [];
  for (const r of data as { started_at: string; finished_at: string }[]) {
    const days = Math.max(1, Math.round(
      (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 86400000));
    const ppd = pageCount / days;
    if (ppd > 0 && ppd <= 400) ppds.push(ppd);
  }
  if (ppds.length < MIN_PERCENTILE_SAMPLE) return null;
  const slower = ppds.filter(p => p < myPpd).length;
  return Math.round((slower / ppds.length) * 100);
}

// GET /api/community/book?bookId=<books.id>&myPpd=<pagine/giorno>
// Statistiche community ANONIME per un singolo libro (social proof).
export async function GET(req: NextRequest) {
  const bookId = req.nextUrl.searchParams.get("bookId");
  const myPpdRaw = req.nextUrl.searchParams.get("myPpd");
  if (!bookId) return NextResponse.json({ error: "bookId mancante" }, { status: 400 });

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("community_book_stats")
      .select("*")
      .eq("book_id", bookId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({
        enough: false, readers: 0, completed: 0, reading_now: 0, abandoned: 0,
        abandon_rate: null, avg_rating: null, rating_count: 0,
        avg_days_to_finish: null, avg_pages_per_day: null,
        velocity_sample: 0, velocity_percentile: null,
      });
    }

    const raw = data as RawCommunityStat;
    const stat = toBookStat(raw);

    // Percentile personale di velocità (se l'utente ha una lettura cronometrata)
    const myPpd = myPpdRaw ? parseFloat(myPpdRaw) : NaN;
    if (Number.isFinite(myPpd) && myPpd > 0) {
      stat.velocity_percentile = await velocityPercentile(sb, bookId, raw.page_count, myPpd);
    }

    // Info libro per la pagina community (il pannello le ignora)
    return NextResponse.json({
      ...stat,
      title: raw.title,
      authors: raw.authors ?? [],
      cover_url: raw.cover_url,
    });
  } catch (e) {
    console.error("community/book error:", e);
    return NextResponse.json({ error: "Errore statistiche community" }, { status: 500 });
  }
}
