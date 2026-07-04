import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MIN_MY_BOOKS, MIN_SHARED_FOR_TWIN, TWIN_LOVE_RATING,
  type AffinityResult, type AffinityRec,
} from "@/lib/community";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UbRow { user_id: string; book_id: string; rating: number | null; status: string }
interface TwinBookRow {
  book_id: string; rating: number | null;
  books: { title: string; authors: string[] | null; cover_url: string | null } | null;
}

// GET /api/community/affinity — "anime gemelle di lettura"
// Trova i lettori con libreria simile alla tua e raccomanda i loro libri amati
// che tu non hai ancora. Twins ANONIMI: esce solo il conteggio + i libri.
export async function GET() {
  // 1. Identità dell'utente autenticato (dai cookie)
  const sbAuth = await createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const sb = createServiceClient();

  // 2. La mia libreria
  const { data: mineRaw, error: mineErr } = await sb
    .from("user_books").select("book_id, rating, status").eq("user_id", user.id);
  if (mineErr) return NextResponse.json({ error: "Errore libreria" }, { status: 500 });
  const mine = (mineRaw ?? []) as Omit<UbRow, "user_id">[];
  const myBookIds = new Set(mine.map(r => r.book_id));
  const myRating = new Map(mine.filter(r => r.rating != null).map(r => [r.book_id, r.rating as number]));

  if (myBookIds.size < MIN_MY_BOOKS) {
    return NextResponse.json({ twins: 0, my_books: myBookIds.size, shared_sample: [], recommendations: [] } as AffinityResult);
  }

  // 3. Altri lettori che condividono libri con me
  const { data: othersRaw } = await sb
    .from("user_books")
    .select("user_id, book_id, rating, status")
    .in("book_id", Array.from(myBookIds))
    .neq("user_id", user.id);
  const others = (othersRaw ?? []) as UbRow[];

  // 4. Punteggio di affinità per utente: n° libri condivisi pesato dall'accordo sui voti
  const score = new Map<string, { shared: number; agree: number }>();
  for (const r of others) {
    const s = score.get(r.user_id) ?? { shared: 0, agree: 0 };
    s.shared += 1;
    const mr = myRating.get(r.book_id);
    if (mr != null && r.rating != null) s.agree += 1 - Math.abs(mr - r.rating) / 9; // 0..1
    score.set(r.user_id, s);
  }
  const twins = Array.from(score.entries())
    .filter(([, s]) => s.shared >= MIN_SHARED_FOR_TWIN)
    .map(([uid, s]) => ({ uid, weight: s.shared + s.agree })) // peso = condivisi + accordo
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30);

  if (twins.length === 0) {
    return NextResponse.json({ twins: 0, my_books: myBookIds.size, shared_sample: [], recommendations: [] } as AffinityResult);
  }
  const twinWeight = new Map(twins.map(t => [t.uid, t.weight]));
  const twinSet = new Set(twins.map(t => t.uid));

  // "Il perché": i tuoi libri più condivisi tra le anime gemelle
  const sharedCount = new Map<string, number>();
  for (const r of others) {
    if (!twinSet.has(r.user_id)) continue;
    sharedCount.set(r.book_id, (sharedCount.get(r.book_id) ?? 0) + 1);
  }
  const topSharedIds = Array.from(sharedCount.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  let shared_sample: string[] = [];
  if (topSharedIds.length) {
    const { data: sb2 } = await sb.from("books").select("id, title").in("id", topSharedIds);
    const titleById = new Map((sb2 ?? []).map((b: { id: string; title: string }) => [b.id, b.title]));
    shared_sample = topSharedIds.map(id => titleById.get(id)).filter((t): t is string => !!t);
  }

  // 5. I libri amati dai twin che io non ho → raccomandazioni (pesate per affinità del twin)
  const { data: lovedWithUser } = await sb
    .from("user_books")
    .select("user_id, book_id, rating, books(title, authors, cover_url)")
    .in("user_id", twins.map(t => t.uid))
    .in("status", ["letto", "rileggendo"])
    .gte("rating", TWIN_LOVE_RATING);
  const lovedRows = (lovedWithUser ?? []) as unknown as (TwinBookRow & { user_id: string })[];

  // aggrega per libro (escludendo ciò che ho già)
  const agg = new Map<string, { title: string; authors: string[]; cover: string | null; count: number; sum: number; wsum: number }>();

  for (const r of lovedRows) {
    if (myBookIds.has(r.book_id) || !r.books) continue;
    const a = agg.get(r.book_id) ?? {
      title: r.books.title, authors: r.books.authors ?? [], cover: r.books.cover_url,
      count: 0, sum: 0, wsum: 0,
    };
    a.count += 1;
    a.sum += r.rating ?? 0;
    a.wsum += (twinWeight.get(r.user_id) ?? 1);
    agg.set(r.book_id, a);
  }

  const recommendations: AffinityRec[] = Array.from(agg.entries())
    .sort((x, y) => (y[1].wsum - x[1].wsum) || (y[1].count - x[1].count))
    .slice(0, 8)
    .map(([book_id, a]) => ({
      book_id, title: a.title, authors: a.authors, cover_url: a.cover,
      twin_count: a.count, avg_twin_rating: a.count ? a.sum / a.count : 0,
    }));

  return NextResponse.json({ twins: twins.length, my_books: myBookIds.size, shared_sample, recommendations } as AffinityResult);
}
