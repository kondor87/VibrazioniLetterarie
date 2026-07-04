"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BookPlus } from "lucide-react";
import { ShelfRow } from "./ShelfRow";
import { RoomBackground } from "./RoomBackground";
import { ReadingLadder } from "./ReadingLadder";
import type { BookWithReading } from "@/types/book";
import { cn } from "@/lib/utils";

interface BookshelfProps {
  books: BookWithReading[];
  booksPerRow?: number;
  onAddBook?: () => void;
  onBookClick?: (book: BookWithReading) => void;
  selectedBookId?: string;
}

export function Bookshelf({ books, booksPerRow = 8, onAddBook, onBookClick, selectedBookId }: BookshelfProps) {
  const rows = useMemo(() => {
    if (books.length === 0) return [];
    const chunks: BookWithReading[][] = [];
    for (let i = 0; i < books.length; i += booksPerRow) {
      chunks.push(books.slice(i, i + booksPerRow));
    }
    return chunks;
  }, [books, booksPerRow]);

  if (books.length === 0) {
    return <EmptyShelf onAddBook={onAddBook} />;
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Area stanza scrollabile */}
      <div
        className="relative flex-1 overflow-y-auto overflow-x-hidden"
        style={{ background: "linear-gradient(180deg, #1A0803 0%, #200D04 40%, #1A0803 100%)" }}
      >
        <RoomBackground />
        {/* Scala parte dell'arredo — scorre insieme agli scaffali */}
        <ReadingLadder />

        <div className="relative z-10 px-6 pt-20 pb-8 space-y-0 max-w-[1400px] mx-auto w-full">
          {rows.map((rowBooks, i) => (
            <ShelfRow
              key={i}
              books={rowBooks}
              rowIndex={i}
              selectedBookId={selectedBookId}
              onBookClick={onBookClick ?? (() => {})}
            />
          ))}

          {onAddBook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-start px-6 pt-4 pb-2"
            >
              <button
                onClick={onAddBook}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md",
                  "font-ui text-[11px] uppercase tracking-wide font-medium",
                  "text-text-muted border border-dashed border-text-muted/20",
                  "hover:text-gold hover:border-gold/40 hover:bg-gold/5",
                  "transition-all duration-200"
                )}
              >
                <BookPlus size={14} />
                Aggiungi libro
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyShelf({ onAddBook }: { onAddBook?: () => void }) {
  return (
    <div className="h-full relative flex flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(180deg, #1A0803 0%, #200D04 100%)" }}>
      <RoomBackground />
      <div className="relative z-10 text-center space-y-4">
        <p className="font-display text-4xl text-text-muted italic">
          La tua libreria è vuota
        </p>
        <p className="font-ui text-sm text-text-muted">
          Aggiungi il tuo primo libro per vedere gli scaffali prendere vita
        </p>
        {onAddBook && (
          <button
            onClick={onAddBook}
            className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-md bg-gold text-void font-ui text-[13px] font-semibold uppercase tracking-wide hover:bg-amber hover:shadow-glow transition-all"
          >
            <BookPlus size={15} />
            Aggiungi il primo libro
          </button>
        )}
      </div>
    </div>
  );
}
