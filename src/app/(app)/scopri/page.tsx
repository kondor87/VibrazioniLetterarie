"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, RefreshCw, Loader2, BookOpen, Plus, Check,
  Sparkles, BookMarked, Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAddBook } from "@/lib/hooks/useBooks";
import type { Recommendation } from "@/app/api/ai/raccomandazioni/route";
import type { ReadingStatus, BookFormat } from "@/types/book";

// ── Genre colors (same palette as rest of app) ────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  Narrativa: "#7B3F8A", Fantasy: "#2A6B3A", Saggistica: "#2A5080",
  Business: "#8A5020", "Crescita Personale": "#3D7A5A", Psicologia: "#5A3080",
  Biografie: "#7A3020",
};

const FORMAT_OPTIONS: { value: BookFormat; label: string; icon: typeof BookOpen }[] = [
  { value: "ebook",    label: "E-book",     icon: BookOpen },
  { value: "cartaceo", label: "Cartaceo",   icon: BookMarked },
  { value: "audio",    label: "Audiolibro", icon: Headphones },
];

// ── Build context from books ───────────────────────────────────────────────────
function buildContext(books: ReturnType<typeof useUserBooks>["books"]) {
  const read = books.filter(b => b.status === "letto" || b.status === "rileggendo");
  const ratings = read.filter(b => b.rating != null).map(b => b.rating!);
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
    : 0;

  const genreCount: Record<string, number> = {};
  books.forEach(b => b.genres?.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; }));
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);

  const authorCount: Record<string, number> = {};
  books.forEach(b => b.authors?.forEach(a => { authorCount[a] = (authorCount[a] || 0) + 1; }));
  const topAuthors = Object.entries(authorCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a]) => a);

  const topRatedBooks = [...read]
    .filter(b => b.rating != null)
    .sort((a, b) => b.rating! - a.rating!)
    .slice(0, 8)
    .map(b => ({ title: b.title, author: b.authors[0] ?? "", rating: b.rating! }));

  const recentBooks = [...read]
    .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""))
    .slice(0, 5)
    .map(b => ({ title: b.title, author: b.authors[0] ?? "" }));

  const alreadyRead = books.map(b => b.title);

  return { totalRead: read.length, avgRating, topGenres, topAuthors, topRatedBooks, recentBooks, alreadyRead };
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-surface-2 rounded-2xl border border-white/[0.06] overflow-hidden animate-pulse">
      <div className="flex gap-0">
        <div className="w-[90px] h-[135px] bg-white/[0.04] shrink-0" />
        <div className="flex-1 p-4 space-y-2.5">
          <div className="h-4 bg-white/[0.04] rounded w-3/4" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2" />
          <div className="h-3 bg-white/[0.04] rounded w-full" />
          <div className="h-3 bg-white/[0.04] rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}

// ── Add panel (inline mini-form inside card) ──────────────────────────────────
interface AddPanelProps {
  rec: Recommendation;
  onConfirm: (status: ReadingStatus, format: BookFormat) => Promise<void>;
  onCancel: () => void;
}

function AddPanel({ rec, onConfirm, onCancel }: AddPanelProps) {
  const [status, setStatus] = useState<ReadingStatus>("da_leggere");
  const [format, setFormat] = useState<BookFormat>("ebook");
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try { await onConfirm(status, format); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden border-t border-white/[0.06]"
    >
      <div className="p-4 space-y-3">
        {/* Status */}
        <div>
          <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-2">Stato</p>
          <div className="flex gap-2">
            {(["da_leggere", "in_corso", "letto"] as ReadingStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-ui text-[11px] transition-all border",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                  status === s
                    ? "bg-gold/15 border-gold/30 text-gold"
                    : "bg-surface-3 border-white/[0.04] text-text-muted hover:text-text-sec"
                )}>
                {s === "da_leggere" ? "Da leggere" : s === "in_corso" ? "In corso" : "Letto"}
              </button>
            ))}
          </div>
        </div>
        {/* Format */}
        <div>
          <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-2">Formato</p>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setFormat(value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-ui text-[11px] transition-all border",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                  format === value
                    ? "bg-gold/15 border-gold/30 text-gold"
                    : "bg-surface-3 border-white/[0.04] text-text-muted hover:text-text-sec"
                )}>
                <Icon size={11} />{label}
              </button>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-lg font-ui text-[11px] text-text-muted hover:text-text-sec border border-white/[0.06] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50">
            Annulla
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gold text-void font-ui text-[11px] font-semibold hover:bg-amber transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            {saving ? "Salvataggio…" : "Aggiungi"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────────
interface RecCardProps {
  rec: Recommendation;
  index: number;
  userId: string;
  onAdded: (title: string) => void;
}

function RecCard({ rec, index, userId, onAdded }: RecCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);
  const addBook = useAddBook();

  async function handleConfirm(status: ReadingStatus, format: BookFormat) {
    const bookData = {
      source: "google" as const,
      google_books_id: rec.google_books_id ?? undefined,
      title: rec.title,
      authors: [rec.author],
      isbn_13: rec.isbn_13 ?? undefined,
      isbn_10: rec.isbn_10 ?? undefined,
      cover_url: rec.cover_url ?? undefined,
      pages: rec.pages ?? undefined,
      year: rec.year ?? undefined,
      categories: rec.categories,
      description: rec.description ?? undefined,
    };
    await addBook.mutateAsync({
      data: {
        book: bookData,
        status,
        rating: null,
        review: "",
        format,
        startedAt: "",
        finishedAt: "",
        isFavorite: false,
      },
      userId,
    });
    setExpanded(false);
    setAdded(true);
    onAdded(rec.title);
  }

  const genreColor = GENRE_COLORS[rec.categories[0]] ?? "#5A4030";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className={cn(
        "bg-surface-2 rounded-2xl border overflow-hidden transition-colors",
        added ? "border-green-500/20" : "border-white/[0.06] hover:border-white/10"
      )}
    >
      {/* Cover + info row */}
      <div className="flex gap-0">
        {/* Cover */}
        <div className="w-[90px] h-[135px] shrink-0 relative overflow-hidden bg-surface-3">
          {rec.cover_url ? (
            <Image
              src={rec.cover_url}
              alt={rec.title}
              fill
              className="object-cover"
              sizes="90px"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"
              style={{ background: genreColor + "33" }}>
              <BookOpen size={16} className="text-white/50" />
              <p className="font-display text-[12px] text-white/60 text-center leading-tight line-clamp-3">
                {rec.title}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div>
            {/* Genre pills */}
            {rec.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {rec.categories.slice(0, 2).map(g => (
                  <span key={g} className="font-ui text-[12px] px-1.5 py-0.5 rounded-full"
                    style={{ background: (GENRE_COLORS[g] ?? "#3A3A3A") + "33", color: GENRE_COLORS[g] ?? "#B08860" }}>
                    {g}
                  </span>
                ))}
                {rec.year && (
                  <span className="font-ui text-[12px] text-text-muted">{rec.year}</span>
                )}
              </div>
            )}
            {/* Title */}
            <h3 className="font-display text-[14px] font-semibold text-text-warm leading-tight line-clamp-2 mb-0.5">
              {rec.title}
            </h3>
            <p className="font-ui text-[11px] text-text-muted truncate mb-2">{rec.author}</p>
            {/* GPT reason — the key value */}
            <div className="flex gap-1.5">
              <Sparkles size={10} className="text-gold shrink-0 mt-[2px]" />
              <p className="font-ui text-[11px] text-text-sec leading-relaxed line-clamp-3">
                {rec.reason}
              </p>
            </div>
          </div>

          {/* Footer: pages + add button */}
          <div className="flex items-center justify-between mt-3">
            {rec.pages && (
              <span className="font-mono text-[12px] text-text-muted">{rec.pages.toLocaleString("it")} pag.</span>
            )}
            <div className="ml-auto">
              {added ? (
                <span className="flex items-center gap-1 font-ui text-[11px] text-green-400">
                  <Check size={11} /> Aggiunto
                </span>
              ) : (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui text-[11px] transition-all border",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                    expanded
                      ? "bg-gold/10 border-gold/25 text-gold"
                      : "bg-surface-3 border-white/[0.06] text-text-muted hover:text-gold hover:border-gold/20"
                  )}
                >
                  <Plus size={11} />
                  Aggiungi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline add panel */}
      <AnimatePresence>
        {expanded && !added && (
          <AddPanel rec={rec} onConfirm={handleConfirm} onCancel={() => setExpanded(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ScopriPage() {
  const { books, loading: booksLoading } = useUserBooks();
  const { userId } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

  const ctx = useMemo(() => buildContext(books), [books]);

  const generate = useCallback(async () => {
    if (ctx.totalRead === 0) return;
    setGenerating(true);
    setError(null);
    setAddedTitles(new Set());
    try {
      const res = await fetch("/api/ai/raccomandazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRecommendations(json.recommendations as Recommendation[]);
      setHasGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setGenerating(false);
    }
  }, [ctx]);

  useEffect(() => {
    if (!booksLoading && ctx.totalRead > 0 && !hasGenerated && !generating) {
      generate();
    }
  }, [booksLoading, ctx.totalRead, hasGenerated, generating, generate]);

  const isLoading = booksLoading || (generating && recommendations.length === 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Compass size={16} className="text-gold" />
              <h1 className="font-display text-xl font-semibold text-text-warm">Scopri</h1>
            </div>
            <p className="font-ui text-[11px] text-text-muted">
              6 libri selezionati per te dall&apos;AI in base alle tue letture
            </p>
          </div>
          <button
            onClick={generate}
            disabled={generating || booksLoading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border font-ui text-[11px] transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              generating
                ? "border-white/10 text-text-muted cursor-not-allowed"
                : "border-gold/20 text-gold hover:bg-gold/5 hover:border-gold/35"
            )}
          >
            {generating
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />}
            {generating ? "Analisi in corso…" : "Rigenera"}
          </button>
        </div>

        {/* Empty state */}
        {!booksLoading && ctx.totalRead === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Compass size={36} className="text-gold/30" />
            <p className="font-display text-xl text-text-muted">Aggiungi libri alla libreria</p>
            <p className="font-ui text-sm text-text-muted">
              Le raccomandazioni si basano sui tuoi libri letti e sui voti che hai dato
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="font-ui text-sm text-red-400">{error}</p>
            <button onClick={generate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold/20 text-gold font-ui text-sm hover:bg-gold/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50">
              <RefreshCw size={13} /> Riprova
            </button>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Recommendations grid */}
        {!isLoading && recommendations.length > 0 && (
          <>
            {/* Added banner */}
            <AnimatePresence>
              {addedTitles.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-400/5 border border-green-400/15">
                  <Check size={13} className="text-green-400" />
                  <p className="font-ui text-[12px] text-green-400">
                    {addedTitles.size === 1
                      ? `"${Array.from(addedTitles)[0]}" aggiunto alla libreria`
                      : `${addedTitles.size} libri aggiunti alla libreria`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((rec, i) => (
                <RecCard
                  key={`${rec.title}-${i}`}
                  rec={rec}
                  index={i}
                  userId={userId ?? ""}
                  onAdded={(title) => setAddedTitles(prev => new Set(Array.from(prev).concat(title)))}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
