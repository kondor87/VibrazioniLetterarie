"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Star, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookWithReading } from "@/types/book";
import { GENRE_COLORS } from "@/types/book";

interface CoverGridProps {
  books: BookWithReading[];
  selectedBookId?: string;
  onBookClick: (book: BookWithReading) => void;
}

function genreColor(book: BookWithReading): string {
  const genre = book.genres?.[0];
  if (genre && GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  const hash = book.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const palettes = [
    "#4A2510", "#2A4A22", "#102040", "#3A1050",
    "#503010", "#1A3A30", "#3A2A10", "#4A1030",
  ];
  return palettes[hash % palettes.length];
}

export function CoverGrid({ books, selectedBookId, onBookClick }: CoverGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BookOpen size={28} className="text-text-muted" />
        <p className="font-display text-xl text-text-muted italic">Nessun libro trovato</p>
        <p className="font-ui text-xs text-text-tert">Prova a cambiare i filtri</p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-x-5 gap-y-8 p-6 pb-10"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
    >
      {books.map((book, i) => (
        <CoverCard
          key={book.id}
          book={book}
          index={i}
          isSelected={selectedBookId === book.id}
          onClick={onBookClick}
        />
      ))}
    </div>
  );
}

function CoverCard({
  book,
  index,
  isSelected,
  onClick,
}: {
  book: BookWithReading;
  index: number;
  isSelected: boolean;
  onClick: (book: BookWithReading) => void;
}) {
  const hasCover = !!(book.cover_custom_url || book.cover_url);
  const coverSrc = book.cover_custom_url || book.cover_url;
  const bg = genreColor(book);
  const isFavorite = book.is_favorite;
  const rating = book.rating;
  const isInProgress = book.status === "in_corso";

  return (
    <motion.button
      onClick={() => onClick(book)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.55), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -7, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group flex flex-col items-start text-left outline-none cursor-pointer",
        "focus-visible:ring-1 focus-visible:ring-gold/50 rounded-sm"
      )}
      aria-label={`${book.title} di ${book.authors.join(", ")}`}
    >
      {/* Copertina */}
      <div
        className={cn(
          "relative w-full rounded-[3px] overflow-hidden",
          isSelected && "ring-2 ring-gold/70"
        )}
        style={{
          aspectRatio: "2/3",
          boxShadow: isSelected
            ? "5px 10px 36px rgba(0,0,0,0.85), 0 0 28px rgba(200,144,16,0.35), -1px 0 0 rgba(0,0,0,0.6)"
            : "5px 10px 28px rgba(0,0,0,0.80), 2px 0 0 rgba(0,0,0,0.5), -1px 0 0 rgba(0,0,0,0.4)",
        }}
      >
        {hasCover ? (
          <Image
            src={coverSrc!}
            alt={`"${book.title}" — copertina`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 150px"
          />
        ) : (
          <FallbackCover book={book} bg={bg} />
        )}

        {/* Glow hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none"
          style={{ background: "linear-gradient(160deg, rgba(200,144,16,0.10) 0%, transparent 60%)" }}
        />

        {/* Cuoricino preferiti */}
        {isFavorite && (
          <div className="absolute top-1.5 right-1.5 drop-shadow-lg">
            <Heart size={11} fill="currentColor" className="text-gold" />
          </div>
        )}

        {/* Badge valutazione alta */}
        {rating !== null && rating >= 9 && (
          <div
            className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded px-1.5 py-0.5"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          >
            <Star size={12} fill="currentColor" className="text-amber" />
            <span className="font-mono text-[12px] text-amber leading-none">{rating}</span>
          </div>
        )}

        {/* Barra progresso lettura in corso */}
        {isInProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px]">
            <div className="h-full bg-amber/60" style={{ width: "40%" }} />
            <div className="absolute inset-0 bg-gradient-to-r from-amber/20 to-transparent" />
          </div>
        )}

        {/* Bordo spessore libro */}
        <div
          className="absolute top-0 bottom-0 left-0 w-[3px] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 100%)",
          }}
        />
      </div>

      {/* Titolo + autore */}
      <div className="mt-2.5 w-full">
        <p
          className={cn(
            "font-display text-[14px] font-medium leading-[1.35] line-clamp-2 transition-colors duration-200",
            isSelected ? "text-gold" : "text-text-warm group-hover:text-gold/90"
          )}
        >
          {book.title}
        </p>
        <p className="font-ui text-[12px] text-text-sec mt-0.5 truncate">
          {book.authors[0]}
        </p>
      </div>
    </motion.button>
  );
}

function FallbackCover({ book, bg }: { book: BookWithReading; bg: string }) {
  const titleShort = book.title.length > 45 ? book.title.slice(0, 43) + "…" : book.title;
  const authorLast = book.authors[0]?.split(" ").slice(-1)[0] ?? "";

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-end pb-4 relative overflow-hidden"
      style={{ background: `linear-gradient(155deg, ${bg}f0 0%, ${bg}80 100%)` }}
    >
      {/* Texture pannello interno */}
      <div
        className="absolute inset-[5px] rounded-[1px] border border-white/[0.10] pointer-events-none"
      />

      {/* Luce angolo sup */}
      <div
        className="absolute top-0 left-0 w-3/4 h-1/3 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 70%)" }}
      />

      {/* Riflesso laterale sinistro */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[4px] pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }}
      />

      {/* Linea decorativa centrale */}
      <div
        className="absolute top-[30%] left-[10%] right-[10%] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />
      <div
        className="absolute top-[33%] left-[18%] right-[18%] h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }}
      />

      {/* Testo titolo */}
      <div className="relative z-10 px-3 text-center space-y-1">
        <p
          className="font-display text-[13px] font-semibold text-white/90 italic leading-snug text-center"
        >
          {titleShort}
        </p>
        <div
          className="mx-auto w-6 h-px"
          style={{ background: "rgba(255,255,255,0.22)" }}
        />
        <p className="font-ui text-[11px] text-white/70 tracking-wide uppercase">
          {authorLast}
        </p>
      </div>
    </div>
  );
}
