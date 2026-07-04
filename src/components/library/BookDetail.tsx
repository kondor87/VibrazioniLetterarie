"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X, Heart, Edit3, Star, Calendar, BookOpen,
  Globe, Smartphone, BookText, Quote, ExternalLink, FileText,
} from "lucide-react";
import { cn, formatDate, readingDuration } from "@/lib/utils";
import type { BookWithReading } from "@/types/book";
import { STATUS_LABELS, STATUS_COLORS } from "@/types/book";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUpdateBook } from "@/lib/hooks/useBooks";

interface BookDetailProps {
  book: BookWithReading;
  onClose: () => void;
  onEdit?: (book: BookWithReading) => void;
}

export function BookDetail({ book, onClose, onEdit }: BookDetailProps) {
  const { userId } = useAuth();
  const updateBook  = useUpdateBook();

  function toggleFavorite() {
    if (!userId) return;
    updateBook.mutate({
      userBookId: book.id,
      userId,
      patch: { is_favorite: !book.is_favorite },
    });
  }

  const hasCover = !!(book.cover_custom_url || book.cover_url);
  const coverSrc = book.cover_custom_url || book.cover_url;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="border-t border-white/[0.06] bg-surface-2 shrink-0 overflow-hidden"
      style={{ height: 300 }}
    >
      <div className="flex h-full">
        {/* Copertina sinistra */}
        <div
          className="relative w-[180px] shrink-0 flex items-end justify-center pb-4 pt-4 px-4"
          style={{
            background: "linear-gradient(135deg, rgba(200,144,16,0.06) 0%, transparent 60%)",
          }}
        >
          {hasCover ? (
            <div className="relative shadow-book rounded-sm overflow-hidden" style={{ width: 100, height: 150 }}>
              <Image
                src={coverSrc!}
                alt={`"${book.title}" — copertina`}
                fill
                className="object-cover"
                sizes="100px"
              />
            </div>
          ) : (
            <div
              className="rounded-sm flex items-center justify-center shadow-book"
              style={{ width: 100, height: 150, background: "linear-gradient(160deg, #3D2510 0%, #1A0F06 100%)" }}
            >
              <BookText size={28} className="text-gold/40" />
            </div>
          )}
        </div>

        {/* Colonna centrale — info + recensione */}
        <div className="flex-1 flex flex-col py-4 pr-4 overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-text-warm leading-tight truncate">
                {book.title}
              </h2>
              {book.subtitle && (
                <p className="font-display text-sm text-text-sec italic truncate">{book.subtitle}</p>
              )}
              <p className="font-ui text-xs text-text-tert mt-0.5 truncate">
                {book.authors.join(", ")}
              </p>
            </div>

            {/* Azioni */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onEdit?.(book)}
                className="p-1.5 rounded-md text-text-muted hover:text-gold hover:bg-gold/10 transition-all"
                title="Modifica"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={toggleFavorite}
                disabled={updateBook.isPending}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  book.is_favorite
                    ? "text-gold bg-gold/10"
                    : "text-text-muted hover:text-gold hover:bg-gold/10"
                )}
                title={book.is_favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              >
                <Heart size={14} fill={book.is_favorite ? "currentColor" : "none"} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-text-muted hover:text-text-sec hover:bg-surface-3 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
            {book.status && (
              <span className={cn("text-[11px] font-ui uppercase tracking-wide font-medium px-2 py-0.5 rounded border", STATUS_COLORS[book.status])}>
                {STATUS_LABELS[book.status]}
              </span>
            )}
            {book.rating && <RatingDisplay rating={book.rating} />}
            {book.published_year && (
              <span className="flex items-center gap-1 text-[11px] text-text-tert font-ui">
                <Calendar size={10} /> {book.published_year}
              </span>
            )}
            {book.page_count && (
              <span className="flex items-center gap-1 text-[11px] text-text-tert font-ui">
                <BookOpen size={10} /> {book.page_count} pag.
              </span>
            )}
            {book.language && (
              <span className="flex items-center gap-1 text-[11px] text-text-tert font-ui">
                <Globe size={10} /> {book.language.toUpperCase()}
              </span>
            )}
            {book.format && (
              <span className="flex items-center gap-1 text-[11px] text-text-tert font-ui">
                <Smartphone size={10} /> {book.format}
              </span>
            )}
          </div>

          {/* Date lettura */}
          {(book.started_at || book.finished_at) && (
            <p className="text-[11px] text-text-muted font-ui mb-2">
              {book.started_at && `Dal ${formatDate(book.started_at)}`}
              {book.finished_at && ` al ${formatDate(book.finished_at)}`}
              {book.started_at && book.finished_at && (
                <span className="text-gold/60"> · {readingDuration(book.started_at, book.finished_at)}</span>
              )}
            </p>
          )}

          {/* Recensione */}
          {book.review ? (
            <p className="font-body text-sm text-text-sec leading-relaxed line-clamp-2 flex-1">
              {book.review}
            </p>
          ) : (
            <button
              onClick={() => onEdit?.(book)}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-gold font-ui transition-colors"
            >
              <Quote size={11} /> Aggiungi recensione…
            </button>
          )}
        </div>

        {/* Colonna destra — generi + azioni rapide */}
        <div className="w-[200px] shrink-0 py-4 pr-4 flex flex-col gap-3 border-l border-white/[0.04] pl-4">
          {/* Generi */}
          {book.genres?.length > 0 && (
            <div>
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-1.5">Generi</p>
              <div className="flex flex-wrap gap-1">
                {book.genres.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="px-1.5 py-0.5 rounded text-[11px] font-ui font-medium uppercase tracking-wide text-text-warm/80"
                    style={{ background: "rgba(200,144,16,0.12)", border: "1px solid rgba(200,144,16,0.2)" }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Publisher + ISBN */}
          {book.publisher && (
            <div>
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-0.5">Editore</p>
              <p className="font-ui text-[11px] text-text-tert truncate">{book.publisher}</p>
            </div>
          )}
          {book.isbn_13 && (
            <div>
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-0.5">ISBN</p>
              <p className="font-mono text-[12px] text-text-muted">{book.isbn_13}</p>
            </div>
          )}

          {/* Scheda completa */}
          <Link
            href={`/libri/${book.id}`}
            className="mt-auto flex items-center gap-1.5 text-[12px] text-gold/70 hover:text-gold font-ui transition-colors border border-gold/20 hover:border-gold/40 rounded-md px-2.5 py-1.5 bg-gold/5 hover:bg-gold/10"
          >
            <FileText size={10} /> Scheda completa
          </Link>

          {/* Link esterno */}
          {book.open_library_id && (
            <a
              href={`https://openlibrary.org${book.open_library_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-gold font-ui transition-colors"
            >
              <ExternalLink size={10} /> Open Library
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star
          key={i}
          size={9}
          className={i < rating ? "text-amber" : "text-text-muted"}
          fill={i < rating ? "currentColor" : "none"}
        />
      ))}
      <span className="font-mono text-[11px] text-gold ml-0.5">{rating}/10</span>
    </div>
  );
}
