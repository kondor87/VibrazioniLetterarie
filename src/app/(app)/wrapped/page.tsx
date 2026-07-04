"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import {
  BookOpen, Sparkles, Share2, Loader2, Star,
  Calendar, Flame, Crown, Layers, Check,
} from "lucide-react";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { GENRE_COLORS } from "@/types/book";
import type { BookWithReading } from "@/types/book";
import { ShareCard } from "@/components/wrapped/ShareCard";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function genreColor(g: string): string {
  return GENRE_COLORS[g] ?? "#7A6A5A";
}

// ── Stats per anno ──────────────────────────────────────────────────────────────
interface YearStats {
  year: number;
  count: number;
  pages: number;
  avgRating: number | null;
  topGenre: { name: string; count: number } | null;
  topBook: BookWithReading | null;
  longestBook: BookWithReading | null;
  busiestMonth: { month: number; count: number } | null;
  favorites: number;
  authorsCount: number;
  topAuthor: { name: string; count: number } | null;
}

function computeYearStats(books: BookWithReading[], year: number): YearStats {
  const read = books.filter(b => {
    if (b.status !== "letto" && b.status !== "rileggendo") return false;
    if (!b.finished_at) return false;
    return new Date(b.finished_at).getFullYear() === year;
  });

  const pages = read.reduce((s, b) => s + (b.page_count ?? 0), 0);
  const rated = read.filter(b => b.rating != null).map(b => b.rating!);
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, r) => s + r, 0) / rated.length) * 10) / 10
    : null;

  // Top genere
  const genreCount: Record<string, number> = {};
  read.forEach(b => (b.genres ?? []).forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; }));
  const topGenreEntry = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];
  const topGenre = topGenreEntry ? { name: topGenreEntry[0], count: topGenreEntry[1] } : null;

  // Top libro (preferito con voto più alto, altrimenti voto più alto)
  const sortedByLove = [...read].sort((a, b) => {
    const af = a.is_favorite ? 1 : 0, bf = b.is_favorite ? 1 : 0;
    if (bf !== af) return bf - af;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  const topBook = sortedByLove[0] ?? null;

  // Libro più lungo
  const longestBook = [...read].filter(b => b.page_count)
    .sort((a, b) => (b.page_count! - a.page_count!))[0] ?? null;

  // Mese più attivo
  const monthCount: Record<number, number> = {};
  read.forEach(b => {
    const m = new Date(b.finished_at!).getMonth();
    monthCount[m] = (monthCount[m] ?? 0) + 1;
  });
  const busiestEntry = Object.entries(monthCount).sort((a, b) => b[1] - a[1])[0];
  const busiestMonth = busiestEntry ? { month: Number(busiestEntry[0]), count: busiestEntry[1] } : null;

  // Autori
  const authorCount: Record<string, number> = {};
  read.forEach(b => (b.authors ?? []).forEach(a => { authorCount[a] = (authorCount[a] ?? 0) + 1; }));
  const topAuthorEntry = Object.entries(authorCount).sort((a, b) => b[1] - a[1])[0];
  const topAuthor = topAuthorEntry ? { name: topAuthorEntry[0], count: topAuthorEntry[1] } : null;

  return {
    year,
    count: read.length,
    pages,
    avgRating,
    topGenre,
    topBook,
    longestBook,
    busiestMonth,
    favorites: read.filter(b => b.is_favorite).length,
    authorsCount: Object.keys(authorCount).length,
    topAuthor,
  };
}

// ── Big stat ──────────────────────────────────────────────────────────────────
function BigStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="font-display font-bold leading-none"
        style={{ fontSize: "clamp(40px, 9vw, 68px)", color: accent ? "#d4a15e" : "rgba(245,239,230,0.92)", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      <p className="font-ui text-[11px] uppercase tracking-[0.25em] mt-2" style={{ color: "rgba(168,138,106,0.55)" }}>
        {label}
      </p>
    </div>
  );
}

export default function WrappedPage() {
  const { books, loading } = useUserBooks();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  // Anni disponibili (da finished_at di libri letti)
  const years = useMemo(() => {
    const set = new Set<number>();
    books.forEach(b => {
      if ((b.status === "letto" || b.status === "rileggendo") && b.finished_at) {
        set.add(new Date(b.finished_at).getFullYear());
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [books]);

  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? years[0] ?? new Date().getFullYear();
  const stats = useMemo(() => computeYearStats(books, activeYear), [books, activeYear]);

  // Top 5 copertine per la share-card
  const topCovers = useMemo(() => {
    return books
      .filter(b => (b.status === "letto" || b.status === "rileggendo") && b.finished_at
        && new Date(b.finished_at).getFullYear() === activeYear && b.cover_url)
      .sort((a, b) => {
        const af = a.is_favorite ? 1 : 0, bf = b.is_favorite ? 1 : 0;
        if (bf !== af) return bf - af;
        return (b.rating ?? 0) - (a.rating ?? 0);
      })
      .slice(0, 5);
  }, [books, activeYear]);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#0d0b08",
      });

      // Web Share API se supportato (mobile)
      const canShare = typeof navigator !== "undefined" && !!navigator.share;
      if (canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `vibrazioni-${activeYear}.png`, { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: `Vibrazioni ${activeYear}` });
            setExporting(false);
            return;
          }
        } catch { /* fallthrough a download */ }
      }

      // Download
      const link = document.createElement("a");
      link.download = `vibrazioni-${activeYear}.png`;
      link.href = dataUrl;
      link.click();
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch (e) {
      console.error("Export fallito:", e);
    } finally {
      setExporting(false);
    }
  }, [activeYear]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-void">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-gold/40" size={28} />
        </div>
      </div>
    );
  }

  // ── Nessun dato ─────────────────────────────────────────────────────────────
  if (years.length === 0 || stats.count === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-void">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-[380px]">
            <Sparkles size={28} className="text-gold/40 mx-auto mb-4" />
            <h2 className="font-display text-[22px] font-semibold mb-2" style={{ color: "rgba(245,239,230,0.85)" }}>
              Il tuo Wrapped ti aspetta
            </h2>
            <p className="font-body text-[13px] leading-relaxed" style={{ color: "rgba(168,138,106,0.65)" }}>
              Segna i libri come <em>letti</em> con una data di fine lettura: a fine anno
              ritroverai qui il racconto delle tue vibrazioni.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const yearColor = "#d4a15e";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-void">
      {/* Header anni */}
      <div className="shrink-0 px-4 md:px-10 pt-6 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <p className="font-ui text-[11px] uppercase tracking-[0.35em] mb-3" style={{ color: "rgba(212,161,94,0.45)" }}>
          Il tuo anno di letture
        </p>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {years.map(y => {
            const active = y === activeYear;
            return (
              <button key={y} onClick={() => setYear(y)}
                className="shrink-0 px-4 py-1.5 rounded-full font-ui text-[12px] font-medium transition-all"
                style={{
                  background: active ? "rgba(212,161,94,0.14)" : "rgba(255,255,255,0.03)",
                  border: active ? "1px solid rgba(212,161,94,0.35)" : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#d4a15e" : "rgba(168,138,106,0.6)",
                }}>
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenuto scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 md:px-8 py-10 md:py-14 space-y-12 md:space-y-16">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-center">
            <Sparkles size={20} className="text-gold/50 mx-auto mb-4" />
            <h1 className="font-display font-bold"
              style={{ fontSize: "clamp(44px, 11vw, 88px)", lineHeight: 0.95, letterSpacing: "-0.03em", color: "rgba(245,239,230,0.92)" }}>
              Vibrazioni
            </h1>
            <p className="font-display font-bold" style={{ fontSize: "clamp(44px, 11vw, 88px)", lineHeight: 1, color: yearColor }}>
              {activeYear}
            </p>
            <p className="font-body italic text-[14px] mt-4" style={{ color: "rgba(168,138,106,0.55)" }}>
              Un anno raccontato in {stats.count} {stats.count === 1 ? "libro" : "libri"}
            </p>
          </motion.div>

          {/* Numeri principali */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 py-6 border-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <BigStat value={String(stats.count)} label="Libri" accent />
            <BigStat value={stats.pages.toLocaleString("it")} label="Pagine" />
            <BigStat value={stats.avgRating != null ? String(stats.avgRating) : "—"} label="Voto medio" />
          </motion.div>

          {/* Libro dell'anno */}
          {stats.topBook && (
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2" style={{ color: "rgba(212,161,94,0.5)" }}>
                <Crown size={12} /> Il libro dell&apos;anno
              </p>
              <div className="flex gap-5 items-center rounded-xl p-5"
                style={{ background: "rgba(212,161,94,0.04)", border: "1px solid rgba(212,161,94,0.12)" }}>
                <div className="relative w-[88px] aspect-[2/3] rounded-md overflow-hidden shrink-0 shadow-book">
                  {stats.topBook.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stats.topBook.cover_url} alt={stats.topBook.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: genreColor(stats.topBook.genres?.[0] ?? "") }}>
                      <BookOpen size={18} className="text-white/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display italic text-[19px] leading-tight mb-1" style={{ color: "rgba(245,239,230,0.9)" }}>
                    {stats.topBook.title}
                  </p>
                  <p className="font-ui text-[12px] mb-2" style={{ color: "rgba(168,138,106,0.6)" }}>
                    {stats.topBook.authors?.join(", ")}
                  </p>
                  <div className="flex items-center gap-3">
                    {stats.topBook.rating != null && (
                      <span className="flex items-center gap-1 font-mono text-[13px]" style={{ color: "#d4a15e" }}>
                        <Star size={12} fill="#d4a15e" /> {stats.topBook.rating}/10
                      </span>
                    )}
                    {stats.topBook.is_favorite && (
                      <span className="text-[13px]" style={{ color: "#d4a15e" }}>♥ Preferito</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Griglia insight */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="grid grid-cols-2 gap-3">
            {stats.topGenre && (
              <InsightCard icon={Layers} label="Genere dominante" value={stats.topGenre.name}
                sub={`${stats.topGenre.count} ${stats.topGenre.count === 1 ? "libro" : "libri"}`}
                color={genreColor(stats.topGenre.name)} />
            )}
            {stats.busiestMonth && (
              <InsightCard icon={Flame} label="Mese più intenso" value={MONTHS_IT[stats.busiestMonth.month]}
                sub={`${stats.busiestMonth.count} ${stats.busiestMonth.count === 1 ? "libro" : "libri"}`} />
            )}
            {stats.topAuthor && stats.topAuthor.count > 1 && (
              <InsightCard icon={Sparkles} label="Autore dell'anno" value={stats.topAuthor.name}
                sub={`${stats.topAuthor.count} libri`} />
            )}
            {stats.longestBook && stats.longestBook.page_count && (
              <InsightCard icon={BookOpen} label="La sfida più lunga" value={`${stats.longestBook.page_count} pag.`}
                sub={stats.longestBook.title} />
            )}
            <InsightCard icon={Star} label="Preferiti" value={String(stats.favorites)}
              sub={stats.favorites === 1 ? "libro del cuore" : "libri del cuore"} />
            <InsightCard icon={Calendar} label="Autori esplorati" value={String(stats.authorsCount)}
              sub="voci diverse" />
          </motion.div>

          {/* ── Share card (visibile, è anche il target export) ────────────── */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-4 text-center" style={{ color: "rgba(212,161,94,0.5)" }}>
              La tua cartolina
            </p>

            <div className="mx-auto" style={{ maxWidth: 340 }}>
              <ShareCard ref={cardRef} stats={stats} covers={topCovers} />
            </div>

            {/* Azioni */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-ui text-[12px] uppercase tracking-[0.12em] transition-all disabled:opacity-60"
                style={{ background: "rgba(212,161,94,0.12)", border: "1px solid rgba(212,161,94,0.3)", color: "#d4a15e" }}>
                {exporting ? <Loader2 size={14} className="animate-spin" />
                  : exported ? <Check size={14} />
                  : <><Share2 size={14} /></>}
                {exporting ? "Genero…" : exported ? "Salvata" : "Condividi"}
              </button>
            </div>
            <p className="font-ui text-[12px] text-center mt-3" style={{ color: "rgba(168,138,106,0.4)" }}>
              Scarica l&apos;immagine o condividila nelle tue storie
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// ── Insight card ────────────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof BookOpen; label: string; value: string; sub: string; color?: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color: color ?? "rgba(212,161,94,0.6)" }} />
        <p className="font-ui text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(168,138,106,0.5)" }}>{label}</p>
      </div>
      <p className="font-display text-[17px] leading-tight mb-0.5 line-clamp-1" style={{ color: "rgba(245,239,230,0.88)" }}>{value}</p>
      <p className="font-ui text-[12px] line-clamp-1" style={{ color: "rgba(168,138,106,0.5)" }}>{sub}</p>
    </div>
  );
}
