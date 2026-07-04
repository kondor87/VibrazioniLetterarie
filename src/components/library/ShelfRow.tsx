"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookCover } from "./BookCover";
import { Globe, Candle, BookStack, Bust } from "./ShelfDecoration";
import type { BookWithReading } from "@/types/book";

interface ShelfRowProps {
  books: BookWithReading[];
  rowIndex: number;
  selectedBookId?: string;
  onBookClick: (book: BookWithReading) => void;
}

// Dimensioni deterministiche — altezza/larghezza da page_count e hash id
function bookDimensions(book: BookWithReading): { width: number; height: number; tilt: number } {
  const h1 = book.id.split("").reduce((acc, c) => ((acc * 31) + c.charCodeAt(0)) & 0x7fffffff, 7);
  const h2 = book.title.split("").reduce((acc, c) => ((acc * 37) + c.charCodeAt(0)) & 0x7fffffff, 3);

  const height = 108 + (h1 % 64);

  const pages = book.page_count ?? 280;
  const baseW = pages < 150 ? 42 : pages < 250 ? 52 : pages < 400 ? 62 : pages < 600 ? 72 : 84;
  const width = Math.max(38, Math.min(90, baseW + ((h2 % 14) - 7)));

  const tiltSeed = h1 % 12;
  const tilt =
    tiltSeed === 0 ? -3 :
    tiltSeed === 1 ? 2.5 :
    tiltSeed === 2 ? -1.8 :
    tiltSeed === 3 ? 3 :
    tiltSeed === 4 ? -2 :
    0;

  return { width, height, tilt };
}

// Decorazione per ogni riga: tipo e posizione di inserimento
const ROW_DECORATIONS: Record<number, { insertAfter: number; component: React.ReactNode }> = {
  0: { insertAfter: 4, component: <Candle delay={0.8} /> },
  1: { insertAfter: 2, component: <Globe delay={1.0} /> },
  2: { insertAfter: 5, component: <BookStack delay={1.2} /> },
  3: { insertAfter: 3, component: <Bust delay={1.1} /> },
};

export function ShelfRow({ books, rowIndex, selectedBookId, onBookClick }: ShelfRowProps) {
  const deco = ROW_DECORATIONS[rowIndex];

  return (
    <motion.div
      initial={{ y: 28 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: rowIndex * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Zona retroscaffale */}
      <div
        className="relative px-8 pt-4 pb-0 min-h-[180px] flex items-end gap-[5px]"
        style={{
          background: "linear-gradient(180deg, rgba(8,4,1,0.55) 0%, rgba(12,6,2,0.25) 55%, transparent 100%)",
        }}
      >
        {/* Riflesso superiore */}
        <div className="absolute top-0 left-[4%] right-[4%] h-[1px]" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(200,144,16,0.06) 15%, rgba(200,144,16,0.10) 50%, rgba(200,144,16,0.06) 85%, transparent 100%)",
        }} />

        {/* Pareti laterali scaffale */}
        <div className="absolute left-0 top-0 bottom-0 w-[30px]" style={{
          background: "linear-gradient(90deg, #251408 0%, #3A2010 65%, transparent 100%)",
          boxShadow: "inset -3px 0 8px rgba(0,0,0,0.5)",
        }} />
        <div className="absolute right-0 top-0 bottom-0 w-[30px]" style={{
          background: "linear-gradient(270deg, #251408 0%, #3A2010 65%, transparent 100%)",
          boxShadow: "inset 3px 0 8px rgba(0,0,0,0.5)",
        }} />

        {/* Libri con decorazioni inserite alle posizioni giuste */}
        {books.map((book, i) => {
          const { width, height, tilt } = bookDimensions(book);
          const bookEl = (
            <motion.div
              key={book.id}
              initial={{ y: 14 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.35, delay: rowIndex * 0.15 + i * 0.03, ease: "easeOut" }}
              style={{
                alignSelf: "flex-end",
                transform: tilt !== 0 ? `rotate(${tilt}deg)` : undefined,
                transformOrigin: "bottom center",
              }}
            >
              <BookCover
                book={book}
                onClick={onBookClick}
                isSelected={selectedBookId === book.id}
                width={width}
                height={height}
              />
            </motion.div>
          );

          // Inserisce la decorazione dopo la posizione specificata
          if (deco && i === deco.insertAfter) {
            return (
              <React.Fragment key={book.id}>
                {bookEl}
                <div style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
                  {deco.component}
                </div>
              </React.Fragment>
            );
          }
          return bookEl;
        })}

        <div className="flex-1" />
      </div>

      {/* ── Tavola dello scaffale ── */}
      <div style={{
        height: 20,
        background: "linear-gradient(180deg, #7B4820 0%, #5A3212 22%, #3E2210 52%, #2E1A0A 78%, #221306 100%)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.88), 0 2px 8px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,210,110,0.09), inset 0 -1px 0 rgba(0,0,0,0.75)",
        position: "relative",
      }}>
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, transparent 32px, rgba(0,0,0,0.18) 32px, rgba(0,0,0,0.18) 33px)",
        }} />
        <div className="absolute top-0 left-[2%] right-[2%] h-[3px]" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,210,90,0.14) 25%, rgba(255,230,110,0.20) 50%, rgba(255,210,90,0.14) 75%, transparent 100%)",
        }} />
      </div>

      {/* Ombra sotto la tavola */}
      <div style={{
        height: 18,
        background: "linear-gradient(180deg, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.22) 55%, transparent 100%)",
      }} />
    </motion.div>
  );
}
