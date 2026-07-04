import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  num, numOrNull, MIN_READERS,
  type RawCommunityStat, type CommunitySearchResult,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/community/search?q=... — cerca tra i libri TRACCIATI dalla community
// (non su fonti esterne: qui ci sono i dati di comportamento) e ne mostra le vibrazioni.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("community_book_stats")
      .select("*")
      .ilike("title", `%${q}%`)
      .limit(40);
    if (error) throw error;

    const results: CommunitySearchResult[] = (data as RawCommunityStat[] ?? [])
      .filter(r => num(r.readers) >= MIN_READERS)
      .map(r => {
        const completed = num(r.completed), abandoned = num(r.abandoned), reading = num(r.reading_now);
        const denom = completed + abandoned + reading;
        return {
          book_id: r.book_id,
          title: r.title,
          authors: r.authors ?? [],
          cover_url: r.cover_url,
          readers: num(r.readers),
          reading_now: reading,
          avg_rating: numOrNull(r.avg_rating),
          avg_days_to_finish: numOrNull(r.avg_days_to_finish),
          avg_pages_per_day: numOrNull(r.avg_pages_per_day),
          abandon_rate: denom > 0 ? abandoned / denom : null,
        };
      })
      .sort((a, b) => b.readers - a.readers)
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch (e) {
    console.error("community/search error:", e);
    return NextResponse.json({ error: "Errore ricerca community" }, { status: 500 });
  }
}
