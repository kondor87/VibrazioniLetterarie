import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BookOpen, Sparkles } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PublicBook {
  book_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  genres: string[];
  rating: number | null;
  is_favorite: boolean;
  page_count: number | null;
}
interface Archetype { name: string; motto: string; description: string }

const GENRE_BG: Record<string, string> = {
  Narrativa: "#3D1A5A", Fantasy: "#1A3D2A", Saggistica: "#1A2D4A",
  Business: "#3D2A10", "Crescita Personale": "#1A3A2A",
  Psicologia: "#2A1A3A", Biografie: "#3A1A10", Altro: "#2A2A2A",
};

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — Scaffale | Vibrazioni Letterarie`,
    description: `La libreria personale di ${username} su Vibrazioni Letterarie`,
    openGraph: {
      title: `Lo scaffale di ${username}`,
      description: `Scopri i libri letti da ${username}`,
      type: "website",
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function PublicShelfPage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const sb = createServiceClient();

  // 1. Risolvi username → user_id + flag pubblico
  const { data: profile } = await sb
    .from("user_profiles")
    .select("user_id, username, public_shelf_enabled")
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.public_shelf_enabled) notFound();

  // 2. Libri letti
  const { data: rawBooks } = await sb
    .from("user_library")
    .select("book_id, title, authors, cover_url, genres, rating, is_favorite, page_count")
    .eq("user_id", profile.user_id)
    .in("status", ["letto", "rileggendo"])
    .order("created_at", { ascending: false });

  const books: PublicBook[] = (rawBooks ?? []) as PublicBook[];

  // 3. Profilo AI
  const { data: aiRow } = await sb
    .from("user_ai_profiles")
    .select("archetype")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  const archetype = aiRow?.archetype as Archetype | null;

  // 4. Stats
  const totalPages = books.reduce((s, b) => s + (b.page_count ?? 0), 0);
  const ratings    = books.filter(b => b.rating != null).map(b => b.rating!);
  const avgRating  = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#0d0b08", color: "#c9a87a" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b" style={{ borderColor: "rgba(212,161,94,0.08)" }}>
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen size={16} className="text-gold" />
            <span className="font-display text-[13px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: "rgba(212,161,94,0.6)" }}>
              Vibrazioni Letterarie
            </span>
          </Link>
          <p className="font-ui text-[11px] uppercase tracking-[0.2em]"
            style={{ color: "rgba(168,138,106,0.35)" }}>
            scaffale pubblico
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* ── Identità ────────────────────────────────────────────────────── */}
        <div className="mb-10 md:mb-14">
          <p className="font-ui text-[11px] uppercase tracking-[0.35em] mb-3"
            style={{ color: "rgba(212,161,94,0.35)" }}>lo scaffale di</p>
          <h1 className="font-display font-bold mb-1"
            style={{ fontSize: "clamp(32px, 6vw, 52px)", letterSpacing: "-0.02em", color: "rgba(245,239,230,0.90)" }}>
            {username}
          </h1>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <span className="font-ui text-[12px]" style={{ color: "rgba(168,138,106,0.55)" }}>
              <strong className="font-semibold" style={{ color: "#d4a15e" }}>{books.length}</strong> libri letti
            </span>
            {totalPages > 0 && (
              <span className="font-ui text-[12px]" style={{ color: "rgba(168,138,106,0.55)" }}>
                <strong className="font-semibold" style={{ color: "#d4a15e" }}>{totalPages.toLocaleString("it")}</strong> pagine
              </span>
            )}
            {avgRating !== null && (
              <span className="font-ui text-[12px]" style={{ color: "rgba(168,138,106,0.55)" }}>
                <strong className="font-semibold" style={{ color: "#d4a15e" }}>{avgRating}/10</strong> voto medio
              </span>
            )}
          </div>
        </div>

        {/* ── Archetipo AI (se disponibile) ──────────────────────────────── */}
        {archetype?.name && (
          <div className="mb-10 md:mb-14 rounded-xl px-6 py-5"
            style={{ background: "rgba(212,161,94,0.04)", border: "1px solid rgba(212,161,94,0.10)" }}>
            <div className="flex items-start gap-3">
              <Sparkles size={14} className="text-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-display font-semibold text-[18px] md:text-[22px] mb-1"
                  style={{ color: "#d4a15e" }}>{archetype.name}</p>
                {archetype.motto && (
                  <p className="font-body text-[13px] italic"
                    style={{ color: "rgba(168,138,106,0.65)" }}>
                    &laquo;{archetype.motto}&raquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Griglia libri ───────────────────────────────────────────────── */}
        {books.length === 0 ? (
          <p className="font-body italic text-center py-20"
            style={{ color: "rgba(168,138,106,0.35)" }}>
            Nessun libro ancora
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {books.map(book => {
              const bg = GENRE_BG[book.genres?.[0] ?? ""] ?? "#231508";
              return (
                <div key={book.book_id} className="group flex flex-col gap-1.5">
                  {/* Cover */}
                  <div className="relative aspect-[2/3] rounded-md overflow-hidden shadow-lg">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 20vw, 160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: bg }}>
                        <BookOpen size={16} className="text-white/25" />
                      </div>
                    )}
                    {/* Rating badge */}
                    {book.rating !== null && (
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded font-ui text-[12px] font-semibold"
                        style={{ background: "rgba(13,11,8,0.85)", color: "#d4a15e" }}>
                        {book.rating}
                      </div>
                    )}
                    {/* Favorite heart */}
                    {book.is_favorite && (
                      <div className="absolute top-1.5 right-1.5 text-[12px]" style={{ color: "#d4a15e" }}>
                        ♥
                      </div>
                    )}
                  </div>
                  {/* Title */}
                  <p className="font-display italic text-[11px] leading-tight line-clamp-2"
                    style={{ color: "rgba(201,168,122,0.70)" }}>
                    {book.title}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CTA footer ─────────────────────────────────────────────────── */}
        <div className="mt-16 md:mt-20 pt-8 border-t text-center"
          style={{ borderColor: "rgba(212,161,94,0.07)" }}>
          <p className="font-display italic text-[14px] mb-4"
            style={{ color: "rgba(168,138,106,0.50)" }}>
            Tieni traccia della tua vita di lettore
          </p>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-ui text-[12px] uppercase tracking-[0.15em] transition-all"
            style={{
              background: "rgba(212,161,94,0.10)",
              border: "1px solid rgba(212,161,94,0.25)",
              color: "#d4a15e",
            }}
          >
            <BookOpen size={13} />
            Crea il tuo scaffale
          </Link>
        </div>

      </main>
    </div>
  );
}
