import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  num, numOrNull, MIN_READERS, MIN_DEVOURED_SAMPLE, MIN_ABANDON_READERS,
  type RawCommunityStat, type LeaderboardEntry, type CommunityLeaderboards,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";   // aggregati sempre freschi, mai cache statica

function base(r: RawCommunityStat): Omit<LeaderboardEntry, "value" | "label"> {
  return {
    book_id: r.book_id,
    title: r.title,
    authors: r.authors ?? [],
    cover_url: r.cover_url,
    readers: num(r.readers),
  };
}

// GET /api/community/leaderboards → 3 classifiche anonime + meta
export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb.from("community_book_stats").select("*");
    if (error) throw error;
    const rows = (data ?? []) as RawCommunityStat[];

    // Più aggiunti negli ultimi 7 giorni
    const most_added: LeaderboardEntry[] = rows
      .filter(r => num(r.added_7d) > 0)
      .map(r => ({ ...base(r), value: num(r.added_7d), label: `${num(r.added_7d)} lettori` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Most devoured: pagine/giorno decrescente (≥ campione minimo e ≥ lettori minimi)
    const most_devoured: LeaderboardEntry[] = rows
      .filter(r => num(r.velocity_sample) >= MIN_DEVOURED_SAMPLE && num(r.readers) >= MIN_READERS && numOrNull(r.avg_pages_per_day) != null)
      .map(r => {
        const ppd = numOrNull(r.avg_pages_per_day)!;
        return { ...base(r), value: ppd, label: `${Math.round(ppd)} pag/giorno` };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Most abandoned: tasso di abbandono decrescente (≥ lettori minimi)
    const most_abandoned: LeaderboardEntry[] = rows
      .filter(r => num(r.readers) >= MIN_ABANDON_READERS && num(r.abandoned) > 0)
      .map(r => {
        const denom = num(r.completed) + num(r.abandoned) + num(r.reading_now);
        const rate = denom > 0 ? num(r.abandoned) / denom : 0;
        return { ...base(r), value: rate, label: `${Math.round(rate * 100)}% abbandona` };
      })
      .filter(e => e.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const payload: CommunityLeaderboards = {
      books_tracked: rows.length,
      most_added,
      most_devoured,
      most_abandoned,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("community/leaderboards error:", e);
    return NextResponse.json({ error: "Errore classifiche community" }, { status: 500 });
  }
}
