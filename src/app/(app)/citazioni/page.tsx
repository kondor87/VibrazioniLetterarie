"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Quote, Heart, Copy, X,
  BookOpen, Check, Feather,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuotes, useToggleQuoteFavorite, type QuoteRow } from "@/lib/hooks/useBooks";

const GENRE_COLORS: Record<string, string> = {
  Narrativa: "#7B3F8A", Fantasy: "#2A6B3A", Saggistica: "#2A5080",
  Business: "#8A5020", "Crescita Personale": "#3D7A5A",
  Psicologia: "#5A3080", Biografie: "#7A3020",
};

export default function CitazioniPage() {
  const { userId }          = useAuth();
  const { data: quotes = [], isLoading } = useQuotes(userId);
  const toggleFavorite      = useToggleQuoteFavorite();

  const [query, setQuery]             = useState("");
  const [bookFilter, setBookFilter]   = useState<string>("all");
  const [onlyFavorites, setOnlyFav]   = useState(false);
  const [copied, setCopied]           = useState<string | null>(null);

  const allBooks = useMemo(() => {
    const m = new Map<string, string>();
    quotes.forEach(q => {
      if (q.books?.title) m.set(q.book_id, q.books.title);
    });
    return Array.from(m.entries());
  }, [quotes]);

  const filtered = useMemo(() => {
    let result = quotes;
    if (query.trim()) {
      const lq = query.toLowerCase();
      result = result.filter(q =>
        q.content.toLowerCase().includes(lq) ||
        q.books?.title.toLowerCase().includes(lq) ||
        q.books?.authors.some(a => a.toLowerCase().includes(lq)) ||
        q.note?.toLowerCase().includes(lq)
      );
    }
    if (bookFilter !== "all") result = result.filter(q => q.book_id === bookFilter);
    if (onlyFavorites) result = result.filter(q => q.is_favorite);
    return result;
  }, [quotes, query, bookFilter, onlyFavorites]);

  function copyQuote(q: QuoteRow) {
    const author = q.books?.authors[0] ?? "Sconosciuto";
    const title  = q.books?.title ?? "";
    const text   = `"${q.content}"\n— ${author}${title ? `, ${title}` : ""}${q.page_number ? ` (p. ${q.page_number})` : ""}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(q.id);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      <div className="flex-none px-6 pt-5 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cerca nel testo, libro o autore…"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-lg pl-9 pr-4 py-2
                         font-ui text-sm text-text-warm placeholder:text-text-muted
                         focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20" />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-warm">
                <X size={12} />
              </button>
            )}
          </div>

          {allBooks.length > 0 && (
            <select value={bookFilter} onChange={e => setBookFilter(e.target.value)}
              className="bg-surface-2 border border-white/[0.06] rounded-lg px-3 py-2 font-ui text-sm text-text-muted hover:border-white/10 focus:outline-none focus:border-gold/30 cursor-pointer">
              <option value="all">Tutti i libri</option>
              {allBooks.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          )}

          <button onClick={() => setOnlyFav(p => !p)}
            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border font-ui text-sm transition-colors",
              onlyFavorites ? "border-gold/40 bg-gold/10 text-gold" : "border-white/[0.06] bg-surface-2 text-text-muted hover:text-amber")}>
            <Heart size={13} fill={onlyFavorites ? "currentColor" : "none"} />
            Preferite
          </button>

          <span className="font-ui text-[11px] text-text-muted ml-auto">
            {filtered.length} framment{filtered.length === 1 ? "o" : "i"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          /* Loading skeleton */
          <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-4 rounded-xl bg-surface-2 animate-pulse"
                style={{ height: i % 3 === 0 ? 160 : i % 2 === 0 ? 120 : 140 }} />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          /* Empty state — nessuna citazione salvata */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-24 gap-5 text-center max-w-sm mx-auto">
            <Feather size={36} className="text-gold/30" />
            <div className="space-y-2">
              <p className="font-display text-2xl italic text-text-warm">
                Nessun frammento salvato
              </p>
              <p className="font-ui text-sm text-text-muted leading-relaxed">
                Le citazioni che ti hanno colpito vivono qui.<br />
                Aggiungile mentre leggi per ritrovarle sempre.
              </p>
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          /* Empty state — filtro vuoto */
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Quote size={28} className="text-text-muted" />
            <p className="font-display text-xl italic text-text-muted">Nessun frammento trovato</p>
            {query && <p className="font-ui text-sm text-text-muted">Nessun risultato per "{query}"</p>}
          </div>
        ) : (
          /* Quote masonry grid */
          <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-0">
            <AnimatePresence>
              {filtered.map((q, i) => (
                <motion.div key={q.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className="break-inside-avoid mb-4 bg-surface-2 rounded-xl p-5 border border-white/[0.05] hover:border-white/[0.08] group transition-colors">

                  {/* Header: quote icon + actions */}
                  <div className="flex items-start justify-between mb-3">
                    <Quote size={16} className="text-gold/40 shrink-0 mt-0.5" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyQuote(q)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-warm hover:bg-surface-3 transition-colors">
                        {copied === q.id
                          ? <Check size={12} className="text-green-400" />
                          : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => userId && toggleFavorite.mutate({ id: q.id, userId, is_favorite: !q.is_favorite })}
                        className={cn("p-1.5 rounded-lg transition-colors",
                          q.is_favorite ? "text-gold" : "text-text-muted hover:text-amber hover:bg-surface-3")}>
                        <Heart size={12} fill={q.is_favorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>

                  {/* Quote text */}
                  <blockquote className="font-display text-[17px] leading-relaxed text-text-warm italic mb-4">
                    {highlightText(q.content, query)}
                  </blockquote>

                  {/* Note */}
                  {q.note && (
                    <p className="font-ui text-[11px] text-text-sec bg-surface-3 rounded-lg px-3 py-2 mb-3 border border-white/[0.04]">
                      {q.note}
                    </p>
                  )}

                  {/* Footer: book info */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen size={11} className="text-text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="font-ui text-[12px] text-text-sec truncate font-medium">
                          {q.books?.title ?? "Libro sconosciuto"}
                        </p>
                        <p className="font-ui text-[12px] text-text-muted truncate">
                          {q.books?.authors[0] ?? ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.books?.genres.slice(0, 1).map(g => (
                        <span key={g} className="font-ui text-[12px] px-1.5 py-0.5 rounded-full"
                          style={{ background: (GENRE_COLORS[g] ?? "#3A3A3A") + "33", color: GENRE_COLORS[g] ?? "#B08860" }}>
                          {g}
                        </span>
                      ))}
                      {q.page_number && (
                        <span className="font-mono text-[12px] text-text-muted">p. {q.page_number}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-gold/25 text-gold rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}
