import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/community/refresh — ricalcola la matview degli aggregati.
// Protetta: Authorization: Bearer <CRON_SECRET>
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

async function refresh(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const sb = createServiceClient();
    const { error } = await sb.rpc("refresh_community_stats");
    if (error) throw error;
    return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() });
  } catch (e) {
    console.error("community/refresh error:", e);
    return NextResponse.json({ error: "Refresh fallito" }, { status: 500 });
  }
}

export const POST = refresh;
export const GET = refresh;   // Vercel Cron invoca in GET con Authorization: Bearer <CRON_SECRET>
