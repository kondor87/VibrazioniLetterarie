"use client";

import Image from "next/image";
import { Star, BookOpen } from "lucide-react";
import type { BookWithReading } from "@/types/book";

interface TopBooksProps {
  books: BookWithReading[];
  title: string;
}

export function TopBooks({ books, title }: TopBooksProps) {
  return (
    <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 space-y-3">
      <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">{title}</p>
      <div className="space-y-2">
        {books.slice(0, 5).map((book, i) => (
          <div key={book.id} className="flex items-center gap-3 group">
            {/* Rank */}
            <span className="font-mono text-[11px] text-text-muted w-4 shrink-0 text-right">
              {i + 1}
            </span>

            {/* Cover tiny */}
            <div className="w-7 h-10 rounded-sm overflow-hidden shrink-0 bg-surface-3">
              {book.cover_url ? (
                <Image src={book.cover_url} alt={book.title} width={28} height={40}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={10} className="text-text-muted" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-display text-[13px] font-medium text-text-warm truncate leading-tight">
                {book.title}
              </p>
              <p className="font-ui text-[12px] text-text-muted truncate">
                {book.authors[0]}
              </p>
            </div>

            {/* Rating */}
            {book.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star size={12} className="text-amber" fill="currentColor" />
                <span className="font-mono text-[11px] text-gold">{book.rating}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
