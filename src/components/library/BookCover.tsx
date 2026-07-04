"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BookWithReading } from "@/types/book";
import { GENRE_COLORS } from "@/types/book";

interface BookCoverProps {
  book: BookWithReading;
  onClick?: (book: BookWithReading) => void;
  isSelected?: boolean;
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
}

const SIZES = {
  sm: { w: 56,  h: 84  },
  md: { w: 72,  h: 108 },
  lg: { w: 88,  h: 132 },
};

function genreColor(book: BookWithReading): string {
  const genre = book.genres?.[0];
  if (genre && GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  const hash = book.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const warms = ["#4A2510", "#2A4A10", "#102A4A", "#3A1050", "#50200A", "#1A3A30", "#3A2A10"];
  return warms[hash % warms.length];
}

// Genera un pattern di dorso libro basato sull'hash del titolo
function spinePattern(book: BookWithReading): "plain" | "striped" | "textured" | "aged" {
  const hash = book.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const patterns: Array<"plain" | "striped" | "textured" | "aged"> = ["plain", "plain", "striped", "textured", "aged", "plain", "striped"];
  return patterns[hash % patterns.length];
}

export function BookCover({ book, onClick, isSelected, size = "md", width: wProp, height: hProp }: BookCoverProps) {
  const sizeDefaults = SIZES[size];
  const w = wProp ?? sizeDefaults.w;
  const h = hProp ?? sizeDefaults.h;
  const hasCover = !!(book.cover_custom_url || book.cover_url);
  const bg = genreColor(book);
  const pattern = spinePattern(book);
  const titleShort = book.title.length > 20 ? book.title.slice(0, 18) + "…" : book.title;

  return (
    <motion.button
      onClick={() => onClick?.(book)}
      whileHover={{ y: -9, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className={cn(
        "relative shrink-0 rounded-[2px] cursor-pointer outline-none group",
        isSelected && "ring-1 ring-gold shadow-[0_0_24px_rgba(200,144,16,0.40)]"
      )}
      style={{
        width: w,
        height: h,
        boxShadow: "3px 6px 24px rgba(0,0,0,0.75), 1px 0 0 rgba(0,0,0,0.5), -1px 0 0 rgba(255,255,255,0.03)",
      }}
      aria-label={`${book.title} di ${book.authors.join(", ")}`}
      title={`${book.title} — ${book.authors.join(", ")}`}
    >
      {hasCover ? (
        <Image
          src={(book.cover_custom_url || book.cover_url)!}
          alt={`"${book.title}" copertina`}
          width={w}
          height={h}
          className="w-full h-full object-cover rounded-[2px]"
          sizes={`${w}px`}
          priority={false}
        />
      ) : (
        <div
          className="w-full h-full rounded-[2px] flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(165deg, ${bg}ee 0%, ${bg}88 100%)` }}
        >
          {/* Bordo decorativo */}
          <div className="absolute inset-[3px] rounded-sm border border-white/[0.12] pointer-events-none" />

          {/* Pattern dorso */}
          {pattern === "striped" && (
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "repeating-linear-gradient(180deg, transparent 0px, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 9px)"
            }} />
          )}
          {pattern === "textured" && (
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent 0px, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 5px)"
            }} />
          )}
          {pattern === "aged" && (
            <div className="absolute inset-0" style={{
              background: "radial-gradient(ellipse 80% 80% at 30% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)"
            }} />
          )}

          {/* Riflesso luce sul dorso */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)"
          }} />

          {/* Titolo e autore */}
          <span
            className="font-display text-[11px] font-semibold text-white/90 text-center leading-snug italic px-1.5 z-10"
            style={{ writingMode: w < 55 ? "vertical-rl" : "horizontal-tb" }}
          >
            {titleShort}
          </span>
          <div className="w-5 h-px bg-white/20 z-10 my-0.5" />
          <span className="font-ui text-[11px] text-white/65 text-center truncate w-full px-1 z-10">
            {book.authors[0]?.split(" ").pop()}
          </span>
        </div>
      )}

      {/* Overlay selezione */}
      {isSelected && (
        <div className="absolute inset-0 rounded-[2px] bg-gold/8 pointer-events-none" />
      )}

      {/* Glow hover */}
      <div
        className="absolute inset-0 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none"
        style={{ boxShadow: "0 0 22px rgba(200,144,16,0.22)" }}
      />
    </motion.button>
  );
}
