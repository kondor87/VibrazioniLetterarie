"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Plus, X, BookOpen, Users, Quote as QuoteIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuotes, useAddBook } from "@/lib/hooks/useBooks";
import { AddBookDialog } from "@/components/books/AddBookDialog";
import type { NewBookData } from "@/components/books/AddBookDialog";

interface TopBarProps {
  onAddBook?: () => void;
}

export function TopBar({ onAddBook }: TopBarProps) {
  const router      = useRouter();
  const { userId }  = useAuth();
  const { books }   = useUserBooks();
  const { data: quotes = [] } = useQuotes(userId);
  const addBook     = useAddBook();

  const [query, setQuery]                     = useState("");
  const [isFocused, setIsFocused]             = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const q = query.toLowerCase().trim();
  const showDropdown = isFocused && q.length >= 1;

  const bookMatches = useMemo(() => {
    if (!q) return [];
    return books
      .filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.subtitle?.toLowerCase().includes(q) ||
        b.authors.some(a => a.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [books, q]);

  const authorMatches = useMemo(() => {
    if (!q) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const b of books) {
      for (const a of b.authors) {
        if (!seen.has(a) && a.toLowerCase().includes(q)) {
          seen.add(a);
          result.push(a);
          if (result.length >= 4) return result;
        }
      }
    }
    return result;
  }, [books, q]);

  const quoteMatches = useMemo(() => {
    if (!q) return [];
    return quotes.filter(qr => qr.content.toLowerCase().includes(q)).slice(0, 3);
  }, [quotes, q]);

  const hasResults = bookMatches.length > 0 || authorMatches.length > 0 || quoteMatches.length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/libri?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setQuery("");
      e.currentTarget.blur();
    }
  }

  function selectResult(fn: () => void) {
    fn();
    setQuery("");
    setIsFocused(false);
  }

  function handleAddBook() {
    if (onAddBook) {
      onAddBook();
    } else {
      setInternalDialogOpen(true);
    }
  }

  async function handleInternalAdd(data: NewBookData) {
    if (!userId) return;
    await addBook.mutateAsync({ data, userId });
    setInternalDialogOpen(false);
  }

  return (
    <>
      <header className="h-[56px] flex items-center justify-between px-5 border-b border-white/[0.04] bg-surface-1/80 backdrop-blur-sm shrink-0 relative z-30">
        {/* Search */}
        <div className="flex-1 max-w-full md:max-w-[480px] relative">
          <div
            className={cn(
              "flex items-center gap-2.5 px-3.5 h-9 rounded-full",
              "bg-surface-2 border transition-all duration-200",
              isFocused
                ? "border-gold/40 shadow-[0_0_12px_rgba(200,144,16,0.12)]"
                : "border-white/[0.06] hover:border-white/[0.1]"
            )}
          >
            <Search size={14} className="text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder="Cerca titolo, autore, citazione… (Ctrl+K)"
              className="flex-1 bg-transparent text-[13px] font-ui text-text-warm placeholder:text-text-muted outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-text-muted hover:text-text-sec transition-colors">
                <X size={13} />
              </button>
            )}
            {!query && (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[12px] font-mono text-text-muted border border-white/[0.08]">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface-2 border border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-50">
              {!hasResults ? (
                <p className="px-4 py-3 font-ui text-[12px] text-text-muted">
                  Nessun risultato per &ldquo;{query}&rdquo;
                </p>
              ) : (
                <>
                  {/* Libri */}
                  {bookMatches.length > 0 && (
                    <div>
                      <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2">
                        <BookOpen size={10} className="text-text-muted" />
                        <span className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Libri</span>
                      </div>
                      {bookMatches.map(book => (
                        <button
                          key={book.id}
                          onMouseDown={() => selectResult(() => router.push(`/libri/${book.id}`))}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-surface-3 transition-colors text-left"
                        >
                          <div className="w-7 h-10 rounded overflow-hidden shrink-0 bg-surface-3">
                            {book.cover_url && (
                              <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-[13px] text-text-warm truncate">{book.title}</p>
                            <p className="font-ui text-[11px] text-text-muted truncate">{book.authors.join(", ")}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Autori */}
                  {authorMatches.length > 0 && (
                    <div className={cn(bookMatches.length > 0 && "border-t border-white/[0.04]")}>
                      <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2">
                        <Users size={10} className="text-text-muted" />
                        <span className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Autori</span>
                      </div>
                      {authorMatches.map(author => (
                        <button
                          key={author}
                          onMouseDown={() => selectResult(() => router.push(`/libri?q=${encodeURIComponent(author)}`))}
                          className="w-full px-4 py-2.5 hover:bg-surface-3 transition-colors text-left font-ui text-[13px] text-text-sec"
                        >
                          {author}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Citazioni */}
                  {quoteMatches.length > 0 && (
                    <div className={cn((bookMatches.length > 0 || authorMatches.length > 0) && "border-t border-white/[0.04]")}>
                      <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2">
                        <QuoteIcon size={10} className="text-text-muted" />
                        <span className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Citazioni</span>
                      </div>
                      {quoteMatches.map(qr => (
                        <button
                          key={qr.id}
                          onMouseDown={() => selectResult(() => router.push("/citazioni"))}
                          className="w-full px-4 py-2 hover:bg-surface-3 transition-colors text-left"
                        >
                          <p className="font-display text-[12px] italic text-text-sec line-clamp-2">&ldquo;{qr.content}&rdquo;</p>
                          {qr.books && (
                            <p className="font-ui text-[12px] text-text-muted mt-0.5">{qr.books.title}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cerca tutti */}
                  <div className="border-t border-white/[0.04]">
                    <button
                      onMouseDown={() => selectResult(() => router.push(`/libri?q=${encodeURIComponent(query.trim())}`))}
                      className="w-full px-4 py-2.5 hover:bg-surface-3 transition-colors text-left flex items-center gap-2"
                    >
                      <Search size={11} className="text-text-muted shrink-0" />
                      <span className="font-ui text-[12px] text-text-muted">
                        Cerca &ldquo;<span className="text-gold">{query}</span>&rdquo; in tutti i libri →
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions — hidden on mobile, MobileNav FAB handles it */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleAddBook}
            className={cn(
              "flex items-center gap-1.5 px-3.5 h-8 rounded-md",
              "bg-gold/10 border border-gold/25 text-gold",
              "font-ui text-[11px] uppercase tracking-widest",
              "transition-all duration-200",
              "hover:bg-gold/15 hover:border-gold/40 hover:shadow-[0_0_12px_rgba(200,144,16,0.2)]",
              "active:scale-[0.97]"
            )}
          >
            <Plus size={13} />
            Aggiungi
          </button>
        </div>
      </header>

      <AddBookDialog
        open={internalDialogOpen}
        onClose={() => setInternalDialogOpen(false)}
        onAdd={handleInternalAdd}
      />
    </>
  );
}
