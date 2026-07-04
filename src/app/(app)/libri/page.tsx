"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, List, Library, Search, SlidersHorizontal,
  Star, BookOpen, Heart, ChevronDown, ChevronUp, X, Loader2, Check, Plus, Minus, Trash2,
  Flame, TrendingUp, Clock, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { AddBookDialog } from "@/components/books/AddBookDialog";
import { CensusView } from "@/components/library/CensusView";
import type { BookWithReading, ReadingStatus } from "@/types/book";
import {
  STATUS_LABELS, STATUS_COLORS, GENRE_COLORS,
  classifyReadingSpeed, READING_SPEED_META, personalPace,
} from "@/types/book";
import type { NewBookData } from "@/components/books/AddBookDialog";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAddBook, useUpdateBook, useRemoveBook } from "@/lib/hooks/useBooks";

type SortKey = "title" | "author" | "rating" | "pages" | "date_added" | "date_finished" | "published";
type ViewMode = "grid" | "list" | "shelves";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_added",    label: "Data aggiunta" },
  { value: "title",         label: "Titolo A→Z" },
  { value: "author",        label: "Autore A→Z" },
  { value: "rating",        label: "Voto" },
  { value: "pages",         label: "Pagine" },
  { value: "date_finished", label: "Anno di lettura" },
  { value: "published",     label: "Anno di pubblicazione" },
];

// I sort "per anno" abilitano il raggruppamento con intestazioni
const YEAR_SORTS: SortKey[] = ["date_finished", "published"];

type SortDir = "asc" | "desc";
// direzione di default quando si sceglie un nuovo criterio
function defaultDir(key: SortKey): SortDir {
  return key === "title" || key === "author" ? "asc" : "desc";
}

// comparazione SEMPRE ascendente; la direzione si applica dopo
function cmpAsc(a: BookWithReading, b: BookWithReading, key: SortKey): number {
  switch (key) {
    case "title":         return a.title.localeCompare(b.title, "it");
    case "author":        return (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "", "it");
    case "rating":        return (a.rating ?? 0) - (b.rating ?? 0);
    case "pages":         return (a.page_count ?? 0) - (b.page_count ?? 0);
    case "date_finished": return (a.finished_at ?? "").localeCompare(b.finished_at ?? "");
    case "published":     return (a.published_year ?? 0) - (b.published_year ?? 0);
    case "date_added":
    default:              return a.created_at.localeCompare(b.created_at);
  }
}

function sortBooks(books: BookWithReading[], key: SortKey, dir: SortDir): BookWithReading[] {
  const sorted = [...books].sort((a, b) => cmpAsc(a, b, key));
  return dir === "asc" ? sorted : sorted.reverse();
}

// Anno di raggruppamento secondo il sort attivo
function groupYear(book: BookWithReading, key: SortKey): string {
  if (key === "published") return book.published_year ? String(book.published_year) : "Senza anno";
  return book.finished_at ? String(new Date(book.finished_at).getFullYear()) : "Non letto";
}

// Raggruppa libri (già ordinati) per anno, preservando l'ordine dei gruppi
function groupByYear(books: BookWithReading[], key: SortKey): { year: string; books: BookWithReading[] }[] {
  const groups: { year: string; books: BookWithReading[] }[] = [];
  const idx = new Map<string, number>();
  for (const b of books) {
    const y = groupYear(b, key);
    if (!idx.has(y)) { idx.set(y, groups.length); groups.push({ year: y, books: [] }); }
    groups[idx.get(y)!].books.push(b);
  }
  return groups;
}

const GENRE_COVER_COLORS: Record<string, string> = {
  Narrativa: "#3D1A5A", Fantasy: "#1A3D2A", Saggistica: "#1A2D4A",
  Business: "#3D2A10", "Crescita Personale": "#1A3A2A",
  Psicologia: "#2A1A3A", Biografie: "#3A1A10", Altro: "#2A2A2A",
};

// Priorità per la modalità "Da leggere" (wishlist)
const PRIORITY_LABELS: Record<number, { label: string; color: string; icon: typeof Flame }> = {
  1: { label: "Must Read", color: "text-red-400", icon: Flame },
  2: { label: "Alta",      color: "text-amber",   icon: TrendingUp },
  3: { label: "Media",     color: "text-gold",    icon: Clock },
};

function CoverPlaceholder({ book, size = "md" }: { book: BookWithReading; size?: "sm" | "md" }) {
  const genre = book.genres?.[0] ?? "";
  const bg = GENRE_COVER_COLORS[genre] ?? "#231508";
  const dim = size === "sm" ? "w-10 h-[60px]" : "w-14 h-[84px]";
  return (
    <div className={cn("rounded shrink-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden", dim)}
      style={{ background: bg }}>
      <BookOpen size={size === "sm" ? 10 : 14} className="text-white/60" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
          <div className="w-10 h-[60px] rounded bg-surface-3 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-3 animate-pulse rounded" style={{ width: `${40 + (i % 3) * 15}%` }} />
            <div className="h-2 bg-surface-3/60 animate-pulse rounded w-28" />
          </div>
          <div className="h-3 w-16 bg-surface-3/40 animate-pulse rounded" />
          <div className="h-5 w-20 bg-surface-3/30 animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── BookEditPanel ─────────────────────────────────────────────────────────────

function BookEditPanel({
  book, userId, onClose,
}: {
  book: BookWithReading;
  userId: string;
  onClose: () => void;
}) {
  const updateBook = useUpdateBook();
  const removeBook = useRemoveBook();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const [status, setStatus]           = useState<ReadingStatus>(book.status ?? "da_leggere");
  const [rating, setRating]           = useState<number | null>(book.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview]           = useState(book.review ?? "");
  const [isFavorite, setIsFavorite]   = useState(book.is_favorite);
  const [startedAt, setStartedAt]     = useState(book.started_at ?? "");
  const [finishedAt, setFinishedAt]   = useState(book.finished_at ?? "");
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showRating  = status === "letto" || status === "rileggendo";
  const showDates   = status === "letto" || status === "in_corso" || status === "rileggendo";
  const showReview  = status === "letto" || status === "rileggendo";
  const statusOptions: ReadingStatus[] = ["letto", "in_corso", "da_leggere", "rileggendo", "abbandonato"];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBook.mutateAsync({
        userBookId: book.id,
        userId,
        patch: {
          status,
          rating:      showRating ? rating : null,
          is_favorite: isFavorite,
          review:      showReview ? (review.trim() || null) : null,
          started_at:  showDates  ? (startedAt || null)    : null,
          finished_at: status === "letto" ? (finishedAt || null) : null,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Modifica ${book.title}`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-2xl mx-auto rounded-t-2xl bg-surface-1 border-t border-x border-white/[0.08] shadow-panel overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Book header */}
        <div className="relative h-28 overflow-hidden">
          {book.cover_url && (
            <Image src={book.cover_url} alt="" fill className="object-cover blur-lg scale-110 opacity-25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-surface-1" />
          <div className="absolute inset-0 flex items-end p-4 gap-3">
            {book.cover_url ? (
              <Image
                src={book.cover_url} alt={book.title}
                width={50} height={75}
                className="rounded shadow-book shrink-0 object-cover"
                style={{ width: 50, height: 75 }}
              />
            ) : (
              <div className="w-[50px] h-[75px] rounded shrink-0 flex items-center justify-center"
                style={{ background: GENRE_COVER_COLORS[book.genres?.[0] ?? ""] ?? "#231508" }}>
                <BookOpen size={14} className="text-white/50" />
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <p className="font-display text-[15px] font-semibold text-text-warm truncate leading-snug">{book.title}</p>
              <p className="font-ui text-[12px] text-text-sec truncate mt-0.5">{book.authors.join(", ")}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="shrink-0 mb-1 p-1.5 rounded-full text-text-muted hover:text-text-warm hover:bg-white/10 transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[55vh] overflow-y-auto">
          {/* Status */}
          <div className="space-y-2">
            <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Stato lettura</p>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-ui text-[11px] uppercase tracking-wide font-medium transition-all border",
                    status === s
                      ? "bg-gold/15 text-gold border-gold/40"
                      : "text-text-tert border-white/[0.07] hover:border-white/[0.15] hover:text-text-sec"
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          {showRating && (
            <div className="space-y-2">
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
                Voto {rating !== null && <span className="text-gold ml-1 font-mono">{rating}/10</span>}
              </p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => {
                  const val = i + 1;
                  const active = (hoverRating ?? rating ?? 0) >= val;
                  return (
                    <button
                      key={i}
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(rating === val ? null : val)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={22}
                        className={cn("transition-colors", active ? "text-amber" : "text-surface-3")}
                        fill={active ? "currentColor" : "none"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dates */}
          {showDates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Data inizio</p>
                <input
                  type="date" value={startedAt}
                  onChange={e => setStartedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.07] focus:border-gold/40 font-mono text-[12px] text-text-warm outline-none [color-scheme:dark]"
                />
              </div>
              {status === "letto" && (
                <div className="space-y-1.5">
                  <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Data fine</p>
                  <input
                    type="date" value={finishedAt}
                    onChange={e => setFinishedAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-white/[0.07] focus:border-gold/40 font-mono text-[12px] text-text-warm outline-none [color-scheme:dark]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Review */}
          {showReview && (
            <div className="space-y-1.5">
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
                Note personali <span className="text-text-tert normal-case">(opzionale)</span>
              </p>
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Cosa ti ha lasciato questo libro?"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg resize-none bg-surface-3 border border-white/[0.07] focus:border-gold/40 font-body text-sm text-text-warm placeholder:text-text-muted outline-none transition-colors"
              />
            </div>
          )}

          {/* Favorite */}
          <button
            onClick={() => setIsFavorite(f => !f)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md font-ui text-[12px] border transition-all",
              isFavorite
                ? "bg-gold/15 text-gold border-gold/40"
                : "text-text-tert border-white/[0.07] hover:text-gold hover:border-gold/20"
            )}
          >
            <Heart size={13} fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "Tra i preferiti" : "Aggiungi ai preferiti"}
          </button>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          {/* Delete — two-step confirm */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-ui text-[12px] text-text-muted hover:text-red-400 hover:bg-red-400/8 transition-all border border-transparent hover:border-red-400/20"
            >
              <Trash2 size={13} />
              Rimuovi
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-ui text-[12px] text-red-400">Sei sicuro?</span>
              <button
                onClick={async () => {
                  await removeBook.mutateAsync({ userBookId: book.id, userId });
                  onClose();
                }}
                disabled={removeBook.isPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md font-ui text-[12px] text-void bg-red-500 hover:bg-red-400 transition-colors disabled:opacity-60"
              >
                {removeBook.isPending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Elimina
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-md font-ui text-[12px] text-text-muted hover:text-text-warm hover:bg-surface-3 transition-all"
              >
                No
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md font-ui text-[13px] text-text-sec hover:text-text-warm hover:bg-surface-3 transition-all"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-md",
                "font-ui text-[13px] font-semibold text-void uppercase tracking-wide",
                "bg-gold hover:bg-amber transition-all",
                "hover:shadow-[0_0_16px_rgba(212,161,94,0.4)]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Intestazione di gruppo (anno) ──────────────────────────────────────────────
function GroupHeading({ year, count }: { year: string; count: number }) {
  const isYear = /^\d{4}$/.test(year);
  return (
    <div className="flex items-baseline gap-3 mt-7 mb-3 first:mt-1">
      <h3 className="font-display text-[18px] font-semibold text-text-warm">
        {isYear ? `Letti nel ${year}` : year}
      </h3>
      <span className="font-mono text-[12px] text-text-muted">{count} {count === 1 ? "libro" : "libri"}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,161,94,0.18), transparent)" }} />
    </div>
  );
}

// ── Riga lista (generi, velocità, registro allineato; densità + a11y + azioni) ──
function ListRow({ book, onOpen, density, pace, onToggleFav, onMarkRead }: {
  book: BookWithReading; onOpen: () => void;
  density: "comodo" | "compatto";
  pace?: number | null;
  onToggleFav: (b: BookWithReading) => void;
  onMarkRead: (b: BookWithReading) => void;
}) {
  const speed = classifyReadingSpeed(book, pace);
  const year = book.finished_at ? new Date(book.finished_at).getFullYear()
    : book.started_at ? new Date(book.started_at).getFullYear() : null;
  const compact = density === "compatto";
  return (
    <div
      role="button" tabIndex={0}
      aria-label={`${book.title} — ${book.authors.join(", ")}`}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus(); }
      }}
      style={{ contentVisibility: "auto", containIntrinsicSize: `0 ${compact ? 52 : 84}px` }}
      className={cn(
        "relative flex items-center gap-3.5 px-2 hover:bg-surface-2/60 transition-colors group cursor-pointer",
        "outline-none focus-visible:ring-1 focus-visible:ring-gold/50 rounded-sm",
        compact ? "py-1.5" : "py-3",
      )}>
      {/* Cover */}
      <div className={cn("shrink-0 rounded-sm overflow-hidden shadow-book", compact ? "w-8 h-[48px]" : "w-10 h-[60px]")}>
        {book.cover_url ? (
          <Image src={book.cover_url} alt="" width={40} height={60} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: GENRE_COVER_COLORS[book.genres?.[0] ?? ""] ?? "#231508" }}>
            <BookOpen size={12} className="text-white/50" />
          </div>
        )}
      </div>

      {/* Titolo + (autore · generi con pallino) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <p className="font-display italic text-[15px] font-medium text-text-warm truncate leading-snug group-hover:text-gold transition-colors duration-200">
            {book.title}
          </p>
          {book.is_favorite && <Heart size={10} className="text-gold shrink-0 translate-y-[1px]" fill="currentColor" />}
        </div>
        {!compact && (
          <div className="flex items-center gap-2.5 mt-0.5 min-w-0">
            <span className="font-ui text-[12px] text-text-sec truncate shrink min-w-0">{book.authors.join(", ")}</span>
            {book.genres?.slice(0, 2).map(g => (
              <span key={g} className="hidden sm:flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: GENRE_COLORS[g] ?? "#8A8A8A" }} />
                <span className="font-ui text-[11px] text-text-tert whitespace-nowrap">{g}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Registro numerico allineato */}
      <div className="flex items-center shrink-0">
        {speed && (
          <span className="hidden lg:inline-block w-[64px] text-right font-ui text-[11px]"
            style={{ color: READING_SPEED_META[speed].color }}>{READING_SPEED_META[speed].label}</span>
        )}
        <span className="hidden sm:inline-block w-[58px] text-right font-mono text-[12px] text-text-tert tabular-nums">
          {book.page_count ? `${book.page_count} p` : "—"}
        </span>
        <span className="w-[46px] text-right">
          {book.rating
            ? <span className="font-display italic text-[14px] text-gold">★ {book.rating}</span>
            : <span className="text-text-muted text-[12px]">—</span>}
        </span>
        <span className="w-[40px] text-right font-mono text-[11px] text-text-muted tabular-nums">{year ?? ""}</span>
        {book.status && (
          <span className={cn("hidden md:inline-flex ml-3 justify-center font-ui text-[11px] px-2 py-0.5 rounded-full border", STATUS_COLORS[book.status])}>
            {STATUS_LABELS[book.status]}
          </span>
        )}
      </div>

      {/* Azioni rapide (hover): rivelate da destra con sfumatura, non sovrapposte */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pl-10 pr-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
        style={{ background: "linear-gradient(90deg, transparent 0%, #1b160f 38%)" }}>
        <button title={book.is_favorite ? "Togli dai preferiti" : "Aggiungi ai preferiti"} aria-label="Preferito"
          onClick={e => { e.stopPropagation(); onToggleFav(book); }}
          className="p-1.5 rounded-md text-text-muted hover:text-gold hover:bg-white/5 transition-colors">
          <Heart size={15} className={book.is_favorite ? "text-gold" : ""} fill={book.is_favorite ? "currentColor" : "none"} />
        </button>
        {book.status !== "letto" && (
          <button title="Segna come letto" aria-label="Segna come letto"
            onClick={e => { e.stopPropagation(); onMarkRead(book); }}
            className="p-1.5 rounded-md text-text-muted hover:text-green-400 hover:bg-white/5 transition-colors">
            <Check size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Card griglia ────────────────────────────────────────────────────────────────
function GridCard({ book, onOpen }: { book: BookWithReading; onOpen: () => void }) {
  return (
    <div onClick={onOpen} className="group cursor-pointer space-y-2">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-book group-hover:shadow-book-hover transition-shadow">
        {book.cover_url ? (
          <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="160px" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center"
            style={{ background: GENRE_COVER_COLORS[book.genres?.[0] ?? ""] ?? "#231508" }}>
            <BookOpen size={18} className="text-white/50" />
            <p className="font-display text-[12px] text-white/70 leading-tight">{book.title}</p>
          </div>
        )}
        {book.status && (
          <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <span className={cn("font-ui text-[11px] px-1.5 py-0.5 rounded-full border", STATUS_COLORS[book.status])}>
              {STATUS_LABELS[book.status]}
            </span>
          </div>
        )}
        {book.is_favorite && (
          <div className="absolute top-1.5 right-1.5"><Heart size={11} className="text-gold" fill="currentColor" /></div>
        )}
      </div>
      <div>
        <p className="font-display text-[13px] font-medium text-text-warm truncate leading-tight group-hover:text-gold transition-colors">
          {book.title}
        </p>
        <p className="font-ui text-[12px] text-text-sec truncate">{book.authors[0]}</p>
        {book.rating && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star size={12} className="text-amber" fill="currentColor" />
            <span className="font-mono text-[12px] text-gold">{book.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Intestazione lista: colonne cliccabili per ordinare (sticky) ───────────────
function ListHeader({ sortKey, sortDir, onSort, density }: {
  sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void; density: "comodo" | "compatto";
}) {
  const compact = density === "compatto";
  const arrow = (k: SortKey) => sortKey === k
    ? <span className="text-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
    : <span className="opacity-30 group-hover/h:opacity-60">↕</span>;
  const base = "group/h font-ui text-[10px] uppercase tracking-[0.12em] inline-flex items-center gap-1 transition-colors";
  const col = (k: SortKey) => cn(base, sortKey === k ? "text-gold" : "text-text-muted hover:text-text-sec");
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3.5 px-2 py-2 mb-1 border-b border-white/[0.06]"
      style={{ background: "#16120f" }}>
      <div className={cn("shrink-0", compact ? "w-8" : "w-10")} />
      <button onClick={() => onSort("title")} className={cn(col("title"), "flex-1 justify-start")}>Titolo {arrow("title")}</button>
      <div className="flex items-center shrink-0">
        <span className="hidden lg:inline-block w-[64px] text-right font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted">Velocità</span>
        <button onClick={() => onSort("pages")} className={cn(col("pages"), "hidden sm:inline-flex w-[58px] justify-end")}>Pag. {arrow("pages")}</button>
        <button onClick={() => onSort("rating")} className={cn(col("rating"), "w-[46px] justify-end")}>Voto {arrow("rating")}</button>
        <button onClick={() => onSort("date_finished")} className={cn(col("date_finished"), "w-[40px] justify-end")}>Anno {arrow("date_finished")}</button>
        <span className="hidden md:inline-block ml-3 w-[92px] font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted">Stato</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibriPage() {
  const { books, loading }  = useUserBooks();
  const { userId }          = useAuth();
  const addBook             = useAddBook();
  const router              = useRouter();

  const [query, setQuery]               = useState("");
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | "all">("all");
  const [genreFilter, setGenreFilter]   = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [sortKey, setSortKey]           = useState<SortKey>("date_added");
  const [sortDir, setSortDir]           = useState<SortDir>("desc");
  const [density, setDensity]           = useState<"comodo" | "compatto">("comodo");
  const [viewMode, setViewMode]         = useState<ViewMode>("list");
  const [focusId, setFocusId]           = useState<string | null>(null);
  const [sortOpen, setSortOpen]         = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [editingBook, setEditingBook]   = useState<BookWithReading | null>(null);
  const removeBookMut                   = useRemoveBook();
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // Zoom griglia (px minimo copertina) — persistito in localStorage
  const [coverMin, setCoverMin] = useState(132);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(window.localStorage.getItem("vibrazioni:coverMin"));
    if (saved >= 80 && saved <= 220) setCoverMin(saved);
  }, []);
  function changeZoom(v: number) {
    const c = Math.max(80, Math.min(220, v));
    setCoverMin(c);
    if (typeof window !== "undefined") window.localStorage.setItem("vibrazioni:coverMin", String(c));
  }

  // Ordine priorità (locale) per la modalità "Da leggere" — array di id ordinati
  const [wishlistOrder, setWishlistOrder] = useState<string[]>([]);

  // Read URL params: ?edit= ?q= ?genere= ?status= ?favorites= ?view= ?focus= (deep-link)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const editId  = params.get("edit");
    const qParam  = params.get("q");
    const genreParam = params.get("genere");
    const statusParam = params.get("status");
    const favParam = params.get("favorites");
    const viewParam = params.get("view");
    const focusParam = params.get("focus");
    if (qParam)     setQuery(qParam);
    if (genreParam) setGenreFilter(genreParam);
    if (statusParam && (statusParam in STATUS_LABELS)) setStatusFilter(statusParam as ReadingStatus);
    if (favParam === "true") setOnlyFavorites(true);
    if (viewParam === "shelves") setViewMode("shelves");
    if (focusParam) setFocusId(focusParam);
    if (editId && books.length > 0) {
      const target = books.find(b => b.id === editId);
      if (target) setEditingBook(target);
    }
  }, [books]);

  // Sync ordine wishlist: preserva l'ordine esistente, accoda i nuovi, rimuove gli eliminati
  const daLeggereBooks = useMemo(() => books.filter(b => b.status === "da_leggere"), [books]);
  useEffect(() => {
    setWishlistOrder(prev => {
      const ids = daLeggereBooks.map(b => b.id);
      const kept = prev.filter(id => ids.includes(id));
      const added = ids.filter(id => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [daLeggereBooks]);

  // "Da leggere" ora si comporta come una normale lista (allineata ai letti).
  // La gestione priorità/wishlist confluirà nella futura "Lista dei desideri".
  const isWishlistMode = false;

  function movePriority(id: string, dir: -1 | 1) {
    setWishlistOrder(prev => {
      const idx = prev.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleRemove(id: string) {
    if (!userId) return;
    setDeletingId(id);
    setTimeout(() => {
      removeBookMut.mutate({ userBookId: id, userId });
      setDeletingId(null);
    }, 300);
  }

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    books.forEach(b => b.genres?.forEach(g => s.add(g)));
    return Array.from(s).sort();
  }, [books]);

  // Predicato unico dei filtri — usato sia dalla lista/griglia sia per evidenziare gli scaffali
  const matchesFilters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (b: BookWithReading): boolean => {
      if (q && !(b.title.toLowerCase().includes(q) || b.authors.some(a => a.toLowerCase().includes(q)))) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (genreFilter !== "all" && !b.genres?.includes(genreFilter)) return false;
      if (formatFilter !== "all" && b.format !== formatFilter) return false;
      if (onlyFavorites && !b.is_favorite) return false;
      return true;
    };
  }, [query, statusFilter, genreFilter, formatFilter, onlyFavorites]);

  const filtered = useMemo(
    () => sortBooks(books.filter(matchesFilters), sortKey, sortDir),
    [books, matchesFilters, sortKey, sortDir]);

  // Header cliccabile: stesso criterio → inverte; nuovo criterio → direzione di default
  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(defaultDir(key)); }
  }
  function resetFilters() {
    setQuery(""); setStatusFilter("all"); setGenreFilter("all"); setFormatFilter("all"); setOnlyFavorites(false);
  }
  const updateBook = useUpdateBook();
  function toggleFav(book: BookWithReading) {
    if (userId) updateBook.mutate({ userBookId: book.id, userId, patch: { is_favorite: !book.is_favorite } });
  }
  function markRead(book: BookWithReading) {
    if (userId) updateBook.mutate({ userBookId: book.id, userId, patch: { status: "letto", finished_at: book.finished_at ?? new Date().toISOString().slice(0, 10) } });
  }

  async function handleAdd(data: NewBookData) {
    if (!userId) return;
    await addBook.mutateAsync({ data, userId });
  }

  const activeFilters = [
    statusFilter !== "all", genreFilter !== "all",
    formatFilter !== "all", onlyFavorites,
  ].filter(Boolean).length;

  // Per la vista Scaffali: insieme dei libri che corrispondono ai filtri (per evidenziarli)
  const filtersActive = activeFilters > 0 || query.trim().length > 0;
  const matchIds = useMemo(
    () => new Set(books.filter(matchesFilters).map(b => b.id)),
    [books, matchesFilters]);

  // Ritmo personale di lettura (per la velocità relativa)
  const pace = useMemo(() => personalPace(books), [books]);

  // Wishlist ordinata per priorità (modalità "Da leggere")
  const wishlist = useMemo(() => {
    return [...daLeggereBooks].sort((a, b) =>
      wishlistOrder.indexOf(a.id) - wishlistOrder.indexOf(b.id)
    );
  }, [daLeggereBooks, wishlistOrder]);
  const wishlistPages = useMemo(() => wishlist.reduce((s, b) => s + (b.page_count ?? 0), 0), [wishlist]);
  const wishlistDays = Math.round(wishlistPages / 40); // ~40 pagine/giorno

  // Raggruppamento per anno (solo liste/griglia con sort "per anno")
  const isGrouped = YEAR_SORTS.includes(sortKey) && !isWishlistMode && viewMode !== "shelves";
  const groups = useMemo(() => groupByYear(filtered, sortKey), [filtered, sortKey]);

  const openBook = (b: BookWithReading) => router.push(`/libri/${b.id}`);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar onAddBook={() => setDialogOpen(true)} />

      {/* Toolbar */}
      <div className="flex-none px-3 md:px-6 pt-4 md:pt-5 pb-3 space-y-2.5 md:space-y-3">
        {/* Row 1: search + view toggle + sort */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-1 md:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca titolo o autore…"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-lg pl-9 pr-4 py-2
                         font-ui text-sm text-text-warm placeholder:text-text-muted
                         focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-warm">
                <X size={12} />
              </button>
            )}
          </div>

          {/* View toggle: Lista / Griglia / Scaffali */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-white/[0.06] shrink-0">
            {([["list", List, "Lista"], ["grid", LayoutGrid, "Griglia"], ["shelves", Library, "Scaffali"]] as const).map(([m, Icon, label]) => (
              <button key={m} onClick={() => setViewMode(m)} title={label} aria-label={label}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === m ? "bg-surface-3 text-gold" : "text-text-muted hover:text-text-warm")}>
                <Icon size={14} />
              </button>
            ))}
          </div>

          {/* Zoom copertine (solo griglia) */}
          {viewMode === "grid" && (
            <div className="hidden sm:flex items-center gap-1 bg-surface-2 rounded-lg px-1.5 py-1 border border-white/[0.06] shrink-0">
              <button onClick={() => changeZoom(coverMin - 26)} title="Copertine più piccole"
                className="p-1 rounded text-text-muted hover:text-gold transition-colors"><Minus size={13} /></button>
              <input type="range" min={80} max={220} step={2} value={coverMin}
                onChange={e => changeZoom(Number(e.target.value))}
                className="w-16 md:w-24 accent-gold cursor-pointer" aria-label="Dimensione copertine" />
              <button onClick={() => changeZoom(coverMin + 26)} title="Copertine più grandi"
                className="p-1 rounded text-text-muted hover:text-gold transition-colors"><Plus size={13} /></button>
            </div>
          )}

          {/* Densità (solo lista) */}
          {viewMode === "list" && (
            <div className="hidden sm:flex items-center rounded-lg border border-white/[0.06] bg-surface-2 overflow-hidden shrink-0" title="Densità righe">
              {(["comodo", "compatto"] as const).map(d => (
                <button key={d} onClick={() => setDensity(d)}
                  className={cn("px-2.5 py-2 font-ui text-[11px] capitalize transition-colors", density === d ? "bg-surface-3 text-gold" : "text-text-muted hover:text-text-warm")}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setSortOpen(p => !p)}
              className="flex items-center gap-1.5 md:gap-2 bg-surface-2 border border-white/[0.06] rounded-lg px-2.5 md:px-3 py-2 font-ui text-xs text-text-sec hover:border-gold/20">
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === sortKey)?.label}</span>
              <ChevronDown size={12} className={cn("transition-transform", sortOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-surface-2 border border-white/[0.06] rounded-xl shadow-panel overflow-hidden z-20 min-w-[160px]">
                  {SORT_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => { setSortKey(o.value); setSortDir(defaultDir(o.value)); setSortOpen(false); }}
                      className={cn("w-full text-left px-4 py-2.5 font-ui text-xs transition-colors",
                        sortKey === o.value ? "text-gold bg-gold/5" : "text-text-sec hover:bg-surface-3 hover:text-text-warm")}>
                      {o.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Favorites toggle */}
          <button onClick={() => setOnlyFavorites(p => !p)}
            className={cn("p-2 rounded-lg border transition-colors",
              onlyFavorites ? "border-gold/40 bg-gold/10 text-gold" : "border-white/[0.06] bg-surface-2 text-text-muted hover:text-amber")}>
            <Heart size={14} fill={onlyFavorites ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Row 2: status pills + filters — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:flex-wrap"
          style={{ scrollbarWidth: "none" }}>
          {([["all","Tutti"], ...Object.entries(STATUS_LABELS)] as [string, string][]).map(([val, label]) => {
            const count = val === "all" ? books.length : books.filter(b => b.status === val).length;
            const active = statusFilter === val;
            return (
              <button key={val} onClick={() => setStatusFilter(val as ReadingStatus | "all")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-ui text-[11px] transition-all",
                  active ? "bg-gold/15 border-gold/40 text-gold" : "bg-surface-2 border-white/[0.06] text-text-muted hover:border-white/10 hover:text-text-sec")}>
                {label}
                <span className={cn("font-mono text-[12px]", active ? "text-gold/70" : "text-text-muted")}>{count}</span>
              </button>
            );
          })}

          {allGenres.length > 0 && (
            <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
              className="bg-surface-2 border border-white/[0.06] rounded-full px-3 py-1.5 font-ui text-[11px] text-text-muted hover:border-white/10 focus:outline-none focus:border-gold/30 cursor-pointer">
              <option value="all">Tutti i generi</option>
              {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}

          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)}
            className="bg-surface-2 border border-white/[0.06] rounded-full px-3 py-1.5 font-ui text-[11px] text-text-muted hover:border-white/10 focus:outline-none focus:border-gold/30 cursor-pointer">
            <option value="all">Tutti i formati</option>
            <option value="ebook">Ebook</option>
            <option value="cartaceo">Cartaceo</option>
            <option value="audio">Audiolibro</option>
          </select>

          <span className="font-ui text-[11px] text-text-muted ml-auto">
            {filtered.length} {filtered.length === 1 ? "libro" : "libri"}
            {activeFilters > 0 && <span className="text-gold ml-1">· {activeFilters} filtri</span>}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 pb-4 md:pb-6">
        {loading ? (
          <LoadingSkeleton />
        ) : isWishlistMode ? (
          /* ── Modalità Da leggere: priorità riordinabile + stima tempo ── */
          <div>
            {/* Stima + legenda priorità */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-1">
              <span className="font-ui text-[12px] text-text-muted">
                {wishlist.length} libri · {wishlistPages.toLocaleString("it")} pagine ·{" "}
                <span className="text-text-sec">~{wishlistDays} giorni al ritmo attuale</span>
              </span>
              <div className="flex items-center gap-3 ml-auto">
                {Object.entries(PRIORITY_LABELS).map(([p, { label, color, icon: Icon }]) => (
                  <div key={p} className="flex items-center gap-1.5">
                    <Icon size={11} className={color} />
                    <span className="font-ui text-[11px] text-text-muted">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <GripVertical size={11} className="text-text-muted" />
                  <span className="font-ui text-[11px] text-text-muted">Riordina con ↑↓</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {wishlist.map((book, idx) => {
                  const priority = idx + 1;
                  const pInfo = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS[3];
                  const PIcon = pInfo.icon;
                  return (
                    <motion.div key={book.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: deletingId === book.id ? 0 : 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ layout: { type: "spring", stiffness: 300, damping: 28 } }}
                      className="flex items-center gap-4 bg-surface-2 rounded-xl px-4 py-3.5 border border-white/[0.05] hover:border-white/[0.08] group">

                      {/* Priority rank */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <button onClick={() => movePriority(book.id, -1)} disabled={idx === 0}
                          className="p-0.5 text-text-muted hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp size={14} />
                        </button>
                        <span className={cn("font-mono text-xs font-bold", priority <= 1 ? "text-red-400" : priority <= 2 ? "text-amber" : "text-text-muted")}>
                          {priority}
                        </span>
                        <button onClick={() => movePriority(book.id, 1)} disabled={idx === wishlist.length - 1}
                          className="p-0.5 text-text-muted hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Cover (clic → dettaglio) */}
                      <div onClick={() => router.push(`/libri/${book.id}`)}
                        className="w-12 h-[72px] rounded overflow-hidden shrink-0 cursor-pointer">
                        {book.cover_url ? (
                          <Image src={book.cover_url} alt={book.title} width={48} height={72}
                            className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: GENRE_COVER_COLORS[book.genres?.[0] ?? ""] ?? "#231508" }}>
                            <BookOpen size={14} className="text-white/50" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div onClick={() => router.push(`/libri/${book.id}`)} className="flex-1 min-w-0 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <p className="font-display font-medium text-[15px] text-text-warm truncate leading-tight group-hover:text-gold transition-colors">
                            {book.title}
                          </p>
                          <PIcon size={11} className={pInfo.color} />
                        </div>
                        <p className="font-ui text-[12px] text-text-muted truncate mt-0.5">
                          {book.authors.join(", ")}
                          {book.published_year ? ` · ${book.published_year}` : ""}
                        </p>
                      </div>

                      {/* Genres */}
                      <div className="hidden md:flex items-center gap-1 flex-wrap justify-end max-w-[160px]">
                        {book.genres?.slice(0, 2).map(g => (
                          <span key={g} className="font-ui text-[12px] px-2 py-0.5 rounded-full"
                            style={{ background: (GENRE_COLORS[g] ?? "#3A3A3A") + "33", color: GENRE_COLORS[g] ?? "#B08860" }}>
                            {g}
                          </span>
                        ))}
                      </div>

                      {/* Pages */}
                      <div className="text-right shrink-0 w-20 hidden sm:block">
                        <p className="font-mono text-[13px] text-text-sec">{book.page_count?.toLocaleString("it") ?? "—"}</p>
                        <p className="font-ui text-[12px] text-text-muted">pagine</p>
                      </div>

                      {/* Format badge */}
                      <div className="shrink-0 hidden sm:block">
                        <span className="font-ui text-[12px] px-2 py-0.5 rounded-full bg-surface-3 text-text-muted capitalize">
                          {book.format}
                        </span>
                      </div>

                      {/* Remove */}
                      <button onClick={() => handleRemove(book.id)} disabled={removeBookMut.isPending}
                        className="p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:cursor-wait">
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {wishlist.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Star size={36} className="text-text-muted" />
                <p className="font-display text-xl italic text-text-muted">La tua wishlist è vuota</p>
                <p className="font-ui text-sm text-text-muted">Aggiungi i libri che vuoi leggere</p>
                <button onClick={() => setDialogOpen(true)}
                  className="mt-2 flex items-center gap-1.5 px-4 h-9 rounded-md bg-gold/10 border border-gold/25 text-gold font-ui text-[11px] uppercase tracking-widest transition-all hover:bg-gold/15 hover:border-gold/40 active:scale-[0.97]">
                  <Plus size={13} />
                  Aggiungi il primo libro
                </button>
              </div>
            )}
          </div>
        ) : viewMode === "shelves" ? (
          /* ── Vista Scaffali: censimento fisico (Librerie → Ripiani → Davanti/Dietro) ── */
          <div>
            <p className="font-ui text-[12px] text-text-muted mb-4">
              Ricrea la tua libreria reale: crea librerie e ripiani, poi <span className="text-text-sec">trascina</span> i libri nelle file <em>davanti</em> e <em>dietro</em>.
            </p>
            <CensusView books={books} onPick={openBook} focusId={focusId}
              matchIds={matchIds} filtersActive={filtersActive} />
          </div>
        ) : isGrouped ? (
          /* ── Lista/Griglia raggruppate per anno ── */
          <motion.div key="grouped" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {viewMode === "list" && <ListHeader sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} density={density} />}
            {groups.map(g => (
              <div key={g.year}>
                <GroupHeading year={g.year} count={g.books.length} />
                {viewMode === "list" ? (
                  <div className="divide-y divide-white/[0.04]">
                    {g.books.map(b => <ListRow key={b.id} book={b} onOpen={() => openBook(b)} density={density} pace={pace} onToggleFav={toggleFav} onMarkRead={markRead} />)}
                  </div>
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${coverMin}px, 1fr))` }}>
                    {g.books.map(b => <GridCard key={b.id} book={b} onOpen={() => openBook(b)} />)}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        ) : (
          /* ── Lista/Griglia piatte ── */
          <AnimatePresence mode="wait">
            {viewMode === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ListHeader sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} density={density} />
                <div className="divide-y divide-white/[0.04]">
                  {filtered.map(b => <ListRow key={b.id} book={b} onOpen={() => openBook(b)} density={density} pace={pace} onToggleFav={toggleFav} onMarkRead={markRead} />)}
                </div>
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${coverMin}px, 1fr))` }}>
                {filtered.map(b => <GridCard key={b.id} book={b} onOpen={() => openBook(b)} />)}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!loading && books.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-24 gap-5 text-center max-w-sm mx-auto">
            <div className="w-20 h-28 rounded bg-shelf/60 border border-white/[0.06] flex items-center justify-center shadow-book">
              <BookOpen size={28} className="text-gold/40" />
            </div>
            <div className="space-y-2">
              <p className="font-display text-2xl italic text-text-warm">
                La tua libreria ti aspetta
              </p>
              <p className="font-ui text-sm text-text-muted leading-relaxed">
                Ogni grande biblioteca comincia con un solo libro.<br />
                Aggiungi il primo e inizia a costruire la tua storia.
              </p>
            </div>
            <button onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-void font-ui text-sm font-bold hover:bg-amber transition-colors">
              <Plus size={14} />
              Aggiungi il primo libro
            </button>
          </motion.div>
        )}

        {!loading && !isWishlistMode && books.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center max-w-md mx-auto">
            <BookOpen size={28} className="text-text-muted" />
            <p className="font-display text-xl italic text-text-muted">Nessun libro corrisponde</p>
            <p className="font-ui text-sm text-text-muted">
              {[
                query.trim() && `ricerca “${query.trim()}”`,
                statusFilter !== "all" && `stato “${STATUS_LABELS[statusFilter as ReadingStatus]}”`,
                genreFilter !== "all" && `genere “${genreFilter}”`,
                formatFilter !== "all" && `formato “${formatFilter}”`,
                onlyFavorites && "solo preferiti",
              ].filter(Boolean).join(" · ") || "Prova a modificare i filtri"}
            </p>
            {(activeFilters > 0 || query.trim()) && (
              <button onClick={resetFilters}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gold/25 bg-gold/8 text-gold font-ui text-[12px] uppercase tracking-wide hover:bg-gold/15 hover:border-gold/40 transition-all">
                <X size={13} /> Azzera filtri
              </button>
            )}
          </div>
        )}
      </div>

      <AddBookDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAdd} />

      <AnimatePresence>
        {editingBook && userId && (
          <BookEditPanel
            key={editingBook.id}
            book={editingBook}
            userId={userId}
            onClose={() => setEditingBook(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
