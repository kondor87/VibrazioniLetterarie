"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Search, Loader2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookSearchResult } from "@/types/book";

interface BookSearchProps {
  onSelect: (book: BookSearchResult) => void;
  placeholder?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function BookSearch({ onSelect, placeholder = "Cerca titolo, autore o ISBN…" }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
      setActiveIdx(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);

  const handleSelect = (book: BookSearchResult) => {
    onSelect(book);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 h-11 rounded-lg border transition-all",
        "bg-surface-2",
        open ? "border-gold/40 shadow-[0_0_12px_rgba(200,144,16,0.12)]" : "border-white/[0.07]"
      )}>
        {loading
          ? <Loader2 size={15} className="text-gold animate-spin shrink-0" />
          : <Search size={15} className="text-text-muted shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-ui text-sm text-text-warm placeholder:text-text-muted outline-none"
          autoComplete="off"
        />
      </div>

      {/* Dropdown risultati */}
      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-lg border border-white/[0.07] bg-surface-2 shadow-panel overflow-hidden max-h-[400px] overflow-y-auto"
        >
          {results.map((book, i) => (
            <li key={`${book.source}-${book.isbn_13 || i}`}>
              <button
                onMouseDown={() => handleSelect(book)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  activeIdx === i ? "bg-gold/10" : "hover:bg-surface-3"
                )}
              >
                {/* Copertina thumbnail */}
                <div className="w-8 h-12 rounded-sm overflow-hidden shrink-0 bg-surface-3 flex items-center justify-center">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      width={32}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen size={12} className="text-text-muted" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-medium text-text-warm truncate">{book.title}</p>
                  {book.authors.length > 0 && (
                    <p className="font-ui text-[11px] text-text-tert truncate">{book.authors.join(", ")}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {book.year && <span className="font-ui text-[12px] text-text-muted">{book.year}</span>}
                    {book.publisher && <span className="font-ui text-[12px] text-text-muted truncate max-w-[120px]">{book.publisher}</span>}
                    {book.isbn_13 && <span className="font-mono text-[12px] text-text-muted">{book.isbn_13}</span>}
                  </div>
                </div>

                {/* Source badge */}
                <span className="font-ui text-[11px] uppercase tracking-wide text-text-tert shrink-0">
                  {book.source === "openlibrary" ? "OL" : book.source === "sbn" ? "SBN" : "GB"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
