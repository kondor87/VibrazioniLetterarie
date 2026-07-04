"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, BookOpen, ChevronLeft,
  Check, Star, Calendar, BookText, Zap, PenLine, ScanBarcode, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BookSearch } from "./BookSearch";
import type { BookSearchResult, ReadingStatus, BookFormat } from "@/types/book";
import { STATUS_LABELS } from "@/types/book";

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewBookData) => Promise<void>;
}

export interface NewBookData {
  book: BookSearchResult;
  status: ReadingStatus;
  rating: number | null;
  review: string;
  format: BookFormat;
  startedAt: string;
  finishedAt: string;
  isFavorite: boolean;
}

type Step = "search" | "editions" | "personal" | "manual";

export function AddBookDialog({ open, onClose, onAdd }: AddBookDialogProps) {
  const [step, setStep]               = useState<Step>("search");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [editions, setEditions]       = useState<BookSearchResult[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [saving, setSaving]           = useState(false);

  // Dati personali
  const [status, setStatus]           = useState<ReadingStatus>("letto");
  const [rating, setRating]           = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview]           = useState("");
  const [format, setFormat]           = useState<BookFormat>("ebook");
  const [startedAt, setStartedAt]     = useState("");
  const [finishedAt, setFinishedAt]   = useState("");
  const [isFavorite, setIsFavorite]   = useState(false);

  const handleBookSelect = async (book: BookSearchResult) => {
    setSelectedBook(book);
    setStep("editions");
    setLoadingEditions(true);
    try {
      const q = `${book.title} ${book.authors[0] || ""}`.trim();
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const related: BookSearchResult[] = (data.results || []).filter(
        (r: BookSearchResult) =>
          r.title.toLowerCase().includes(book.title.toLowerCase().slice(0, 8)) ||
          book.title.toLowerCase().includes(r.title.toLowerCase().slice(0, 8))
      );
      setEditions(related.length > 0 ? related : [book]);
    } catch {
      setEditions([book]);
    } finally {
      setLoadingEditions(false);
    }
  };

  const handleEditionSelect = (edition: BookSearchResult) => {
    setSelectedBook(edition);
    setStep("personal");
  };

  // Aggiunta veloce: salta dati personali, salva subito con status scelto
  const handleQuickAdd = async (book: BookSearchResult, quickStatus: ReadingStatus) => {
    setSaving(true);
    try {
      await onAdd({
        book,
        status: quickStatus,
        rating: null,
        review: "",
        format: "ebook",
        startedAt: "",
        finishedAt: "",
        isFavorite: false,
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = (book: BookSearchResult) => {
    setSelectedBook(book);
    setStep("personal");
  };

  const handleSubmit = async () => {
    if (!selectedBook) return;
    setSaving(true);
    try {
      await onAdd({ book: selectedBook, status, rating, review, format, startedAt, finishedAt, isFavorite });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep("search");
    setSelectedBook(null);
    setEditions([]);
    setRating(null);
    setHoverRating(null);
    setReview("");
    setFormat("ebook");
    setStartedAt("");
    setFinishedAt("");
    setIsFavorite(false);
    onClose();
  };

  const stepBack = () => {
    if (step === "personal")  setStep("editions");
    else if (step === "editions") setStep("search");
    else if (step === "manual")   setStep("search");
  };

  const stepLabels: Record<Step, string> = {
    search:   "Aggiungi un libro",
    editions: "Scegli l'edizione",
    personal: "La tua lettura",
    manual:   "Inserimento manuale",
  };

  const stepSubs: Record<Step, string> = {
    search:   "Cerca per titolo o autore",
    editions: selectedBook?.title ?? "",
    personal: selectedBook ? `${selectedBook.title} · ${selectedBook.authors[0]}` : "",
    manual:   "Compila i dettagli del libro",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[600px] mx-4 rounded-xl border border-white/[0.08] bg-surface-2 shadow-panel overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {step !== "search" && (
              <button
                onClick={stepBack}
                aria-label="Torna al passo precedente"
                className="p-1 rounded-md text-text-muted hover:text-text-sec hover:bg-surface-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <h2 id="dialog-title" className="font-display text-lg font-semibold text-text-warm">
                {stepLabels[step]}
              </h2>
              <p className="font-ui text-[11px] text-text-muted uppercase tracking-wide">
                {stepSubs[step]}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {(["search", "editions", "personal"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    step === s
                      ? "bg-gold w-4"
                      : ["search", "editions", "personal"].indexOf(step) > i
                      ? "bg-gold/50 w-1.5"
                      : "bg-surface-3 w-1.5"
                  )}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              aria-label="Chiudi"
              className="p-1.5 rounded-md text-text-muted hover:text-text-sec hover:bg-surface-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-hidden" style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait">
            {step === "search" && (
              <StepSearch key="search" onSelect={handleBookSelect} onManual={() => setStep("manual")} />
            )}
            {step === "editions" && (
              <StepEditions
                key="editions"
                editions={editions}
                loading={loadingEditions}
                selected={selectedBook}
                saving={saving}
                onSelect={handleEditionSelect}
                onQuickAdd={handleQuickAdd}
              />
            )}
            {step === "personal" && (
              <StepPersonal
                key="personal"
                book={selectedBook!}
                status={status} setStatus={setStatus}
                rating={rating} setRating={setRating}
                hoverRating={hoverRating} setHoverRating={setHoverRating}
                review={review} setReview={setReview}
                format={format} setFormat={setFormat}
                startedAt={startedAt} setStartedAt={setStartedAt}
                finishedAt={finishedAt} setFinishedAt={setFinishedAt}
                isFavorite={isFavorite} setIsFavorite={setIsFavorite}
              />
            )}
            {step === "manual" && (
              <StepManual key="manual" onNext={handleManualSubmit} />
            )}
          </AnimatePresence>
        </div>

        {/* Footer — only on personal step */}
        {step === "personal" && (
          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-md font-ui text-[13px] text-text-sec hover:text-text-warm hover:bg-surface-3 transition-all"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-md",
                "font-ui text-[13px] font-semibold text-void uppercase tracking-wide",
                "bg-gold hover:bg-amber transition-all",
                "hover:shadow-[0_0_16px_rgba(200,144,16,0.4)]",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Salvataggio…" : "Aggiungi alla libreria"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Step 1: Ricerca ──────────────────────────────────────────────────────────

function StepSearch({
  onSelect,
  onManual,
}: {
  onSelect: (b: BookSearchResult) => void;
  onManual: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-4"
    >
      <BookSearch onSelect={onSelect} placeholder="Cerca per titolo o autore…" />

      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="font-ui text-[11px] text-text-muted uppercase tracking-wider">oppure cerca per ISBN</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>

      <IsbnLookup onSelect={onSelect} />

      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="font-ui text-[11px] text-text-muted uppercase tracking-wider">oppure</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>

      <button
        onClick={onManual}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-white/[0.08] text-text-muted hover:text-text-sec hover:border-white/[0.15] hover:bg-surface-3 transition-all font-ui text-[13px]"
      >
        <PenLine size={14} />
        Libro non trovato? Inseriscilo manualmente
      </button>
    </motion.div>
  );
}

// ── Lookup per ISBN / codice a barre ──────────────────────────────────────────

function IsbnLookup({ onSelect }: { onSelect: (b: BookSearchResult) => void }) {
  const [isbn, setIsbn]       = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BookSearchResult[] | null>(null);

  const clean = isbn.replace(/[^0-9Xx]/g, "");
  const canSearch = clean.length === 10 || clean.length === 13;

  const lookup = async () => {
    if (!canSearch || loading) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`/api/books/search?isbn=${encodeURIComponent(clean)}`);
      const data = await res.json();
      const found: BookSearchResult[] = data.results || [];
      if (found.length === 1) {
        onSelect(found[0]);   // match unico → vai diretto alle edizioni
        return;
      }
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanBarcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={isbn}
            onChange={e => { setIsbn(e.target.value); setResults(null); }}
            onKeyDown={e => { if (e.key === "Enter") lookup(); }}
            placeholder="978-88-… (13 cifre) o 10 cifre"
            inputMode="numeric"
            className={cn(
              "w-full pl-9 pr-3 py-2.5 rounded-lg",
              "bg-surface-3 border border-white/[0.07] focus:border-gold/40",
              "font-mono text-[13px] text-text-warm placeholder:text-text-muted",
              "outline-none transition-colors"
            )}
          />
        </div>
        <button
          onClick={lookup}
          disabled={!canSearch || loading}
          className={cn(
            "flex items-center gap-2 px-4 rounded-lg font-ui text-[12px] font-semibold uppercase tracking-wide transition-all",
            canSearch && !loading
              ? "bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25"
              : "text-text-muted border border-white/[0.07] cursor-not-allowed opacity-60"
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Cerca
        </button>
      </div>

      {results !== null && results.length === 0 && !loading && (
        <p className="font-ui text-[12px] text-text-muted px-1">
          Nessun libro con questo ISBN sulle fonti online. Prova l&apos;inserimento manuale qui sotto.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
          {results.map((ed, i) => (
            <EditionCard
              key={ed.isbn_13 || ed.google_books_id || i}
              edition={ed}
              isSelected={false}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 2: Edizioni ─────────────────────────────────────────────────────────

function StepEditions({
  editions, loading, selected, saving, onSelect, onQuickAdd,
}: {
  editions: BookSearchResult[];
  loading: boolean;
  selected: BookSearchResult | null;
  saving: boolean;
  onSelect: (b: BookSearchResult) => void;
  onQuickAdd: (b: BookSearchResult, status: ReadingStatus) => Promise<void>;
}) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center gap-3 p-10"
      >
        <Loader2 size={24} className="text-gold animate-spin" />
        <p className="font-ui text-sm text-text-muted">Cerco le edizioni disponibili…</p>
      </motion.div>
    );
  }

  const bookToAdd = selected ?? editions[0] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col"
    >
      {/* Edition list */}
      <div className="p-4 max-h-[300px] overflow-y-auto">
        <p className="font-ui text-[11px] text-text-muted uppercase tracking-wider px-2 mb-3">
          {editions.length} edizione{editions.length !== 1 ? "i" : ""} trovata{editions.length !== 1 ? "e" : ""}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {editions.map((ed, i) => (
            <EditionCard
              key={ed.isbn_13 || ed.google_books_id || i}
              edition={ed}
              isSelected={
                selected?.isbn_13 === ed.isbn_13 ||
                (selected?.title === ed.title && selected?.publisher === ed.publisher)
              }
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {/* Quick-add bar */}
      {bookToAdd && (
        <div className="border-t border-white/[0.05] px-4 py-3 bg-surface-3/30">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-text-muted mr-1">
              <Zap size={12} className="text-amber" />
              <span className="font-ui text-[11px] uppercase tracking-wider">Aggiungi subito:</span>
            </div>
            {(["da_leggere", "in_corso", "letto"] as ReadingStatus[]).map(s => (
              <button
                key={s}
                disabled={saving}
                onClick={() => onQuickAdd(bookToAdd, s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-ui text-[11px] border border-white/[0.08] text-text-sec hover:border-gold/30 hover:text-gold hover:bg-gold/5 transition-all disabled:opacity-40"
              >
                {saving && <Loader2 size={10} className="animate-spin" />}
                {STATUS_LABELS[s]}
              </button>
            ))}
            <button
              onClick={() => bookToAdd && onSelect(bookToAdd)}
              className="ml-auto font-ui text-[11px] text-text-muted hover:text-text-sec transition-colors flex items-center gap-1"
            >
              Personalizza →
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EditionCard({
  edition, isSelected, onSelect,
}: {
  edition: BookSearchResult;
  isSelected: boolean;
  onSelect: (b: BookSearchResult) => void;
}) {
  return (
    <button
      onClick={() => onSelect(edition)}
      className={cn(
        "flex gap-3 p-3 rounded-lg border text-left transition-all group",
        isSelected
          ? "border-gold/50 bg-gold/8 shadow-[0_0_12px_rgba(200,144,16,0.1)]"
          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-surface-3"
      )}
    >
      <div className="w-12 h-[72px] rounded-sm overflow-hidden shrink-0 bg-surface-3 flex items-center justify-center shadow-book">
        {edition.cover_url ? (
          <Image src={edition.cover_url} alt={edition.title} width={48} height={72} className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={16} className="text-text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-display text-sm font-medium text-text-warm leading-snug line-clamp-2">{edition.title}</p>
        <p className="font-ui text-[12px] text-text-sec truncate">{edition.authors.join(", ")}</p>
        {edition.publisher && <p className="font-ui text-[12px] text-text-tert truncate">{edition.publisher}</p>}
        <div className="flex items-center gap-2 pt-0.5">
          {edition.year && <span className="font-mono text-[12px] text-text-muted">{edition.year}</span>}
          {edition.isbn_13 && <span className="font-mono text-[12px] text-text-muted truncate">{edition.isbn_13}</span>}
        </div>
      </div>
      {isSelected && (
        <div className="shrink-0 mt-0.5">
          <Check size={14} className="text-gold" />
        </div>
      )}
    </button>
  );
}

// ── Step 3: Dati personali ───────────────────────────────────────────────────

interface StepPersonalProps {
  book: BookSearchResult;
  status: ReadingStatus; setStatus: (v: ReadingStatus) => void;
  rating: number | null; setRating: (v: number | null) => void;
  hoverRating: number | null; setHoverRating: (v: number | null) => void;
  review: string; setReview: (v: string) => void;
  format: BookFormat; setFormat: (v: BookFormat) => void;
  startedAt: string; setStartedAt: (v: string) => void;
  finishedAt: string; setFinishedAt: (v: string) => void;
  isFavorite: boolean; setIsFavorite: (v: boolean) => void;
}

function StepPersonal({
  book, status, setStatus, rating, setRating, hoverRating, setHoverRating,
  review, setReview, format, setFormat, startedAt, setStartedAt,
  finishedAt, setFinishedAt, isFavorite, setIsFavorite,
}: StepPersonalProps) {
  const statusOptions: ReadingStatus[] = ["letto", "in_corso", "da_leggere", "abbandonato"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-5 max-h-[480px] overflow-y-auto"
    >
      {/* Book preview mini */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-3/50 border border-white/[0.04]">
        {book.cover_url ? (
          <Image src={book.cover_url} alt={book.title} width={36} height={54} className="rounded-sm shadow-book shrink-0 object-cover" style={{ width: 36, height: 54 }} />
        ) : (
          <div className="w-9 h-[54px] rounded-sm bg-shelf-dark flex items-center justify-center shrink-0">
            <BookOpen size={12} className="text-text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-text-warm truncate">{book.title}</p>
          <p className="font-ui text-[11px] text-text-sec truncate">{book.authors.join(", ")} · {book.year}</p>
        </div>
      </div>

      {/* Stato lettura */}
      <div className="space-y-2">
        <Label>Stato lettura</Label>
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

      {/* Voto */}
      {(status === "letto" || status === "rileggendo") && (
        <div className="space-y-2">
          <Label>Voto {rating && <span className="text-gold ml-1 font-mono">{rating}/10</span>}</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const val = i + 1;
              const active = (hoverRating ?? rating ?? 0) >= val;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setHoverRating(val)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(rating === val ? null : val)}
                  className="transition-transform hover:scale-110"
                >
                  <Star size={20} className={cn("transition-colors", active ? "text-amber" : "text-surface-3")} fill={active ? "currentColor" : "none"} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date lettura */}
      {(status === "letto" || status === "in_corso" || status === "rileggendo") && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data inizio</Label>
            <DateInput value={startedAt} onChange={setStartedAt} />
          </div>
          {status === "letto" && (
            <div className="space-y-1.5">
              <Label>Data fine</Label>
              <DateInput value={finishedAt} onChange={setFinishedAt} />
            </div>
          )}
        </div>
      )}

      {/* Formato */}
      <div className="space-y-2">
        <Label>Formato</Label>
        <div className="flex gap-2">
          {(["ebook", "cartaceo", "audio"] as BookFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                "px-3 py-1.5 rounded-md font-ui text-[11px] uppercase tracking-wide font-medium transition-all border",
                format === f
                  ? "bg-gold/15 text-gold border-gold/40"
                  : "text-text-tert border-white/[0.07] hover:border-white/[0.15] hover:text-text-sec"
              )}
            >
              {f === "ebook" ? "📱 Ebook" : f === "cartaceo" ? "📖 Cartaceo" : "🎧 Audio"}
            </button>
          ))}
        </div>
      </div>

      {/* Recensione */}
      {(status === "letto" || status === "rileggendo") && (
        <div className="space-y-1.5">
          <Label>Recensione <span className="text-text-muted">(opzionale)</span></Label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Cosa pensi di questo libro?"
            rows={3}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg resize-none",
              "bg-surface-3 border border-white/[0.07] focus:border-gold/40",
              "font-body text-sm text-text-warm placeholder:text-text-muted",
              "outline-none transition-colors",
              "focus:shadow-[0_0_8px_rgba(200,144,16,0.08)]"
            )}
          />
        </div>
      )}

      {/* Preferito */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md font-ui text-[12px] border transition-all",
            isFavorite
              ? "bg-gold/15 text-gold border-gold/40"
              : "text-text-tert border-white/[0.07] hover:text-gold hover:border-gold/20"
          )}
        >
          <Star size={13} fill={isFavorite ? "currentColor" : "none"} />
          {isFavorite ? "Tra i preferiti" : "Aggiungi ai preferiti"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Step 4: Inserimento manuale ──────────────────────────────────────────────

function StepManual({ onNext }: { onNext: (b: BookSearchResult) => void }) {
  const [title, setTitle]   = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear]     = useState("");
  const [pages, setPages]   = useState("");
  const [isbn, setIsbn]     = useState("");

  const canSubmit = title.trim().length > 0 && author.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onNext({
      source: "manual",
      title: title.trim(),
      authors: [author.trim()],
      year:    year  ? parseInt(year)  : undefined,
      pages:   pages ? parseInt(pages) : undefined,
      isbn_13: isbn.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-4"
    >
      <div className="flex items-start gap-3 p-3 rounded-lg bg-gold/5 border border-gold/15">
        <BookText size={15} className="text-gold shrink-0 mt-0.5" />
        <p className="font-ui text-[12px] text-text-sec leading-relaxed">
          Inserisci il titolo e l&apos;autore. Potrai aggiungere altri dettagli in seguito.
        </p>
      </div>

      <div className="space-y-3">
        <ManualField label="Titolo *" value={title} onChange={setTitle} placeholder="Es. Il nome della rosa" />
        <ManualField label="Autore *" value={author} onChange={setAuthor} placeholder="Es. Umberto Eco" />

        <div className="grid grid-cols-2 gap-3">
          <ManualField label="Anno" value={year} onChange={setYear} placeholder="1980" type="number" />
          <ManualField label="Pagine" value={pages} onChange={setPages} placeholder="502" type="number" />
        </div>

        <ManualField label="ISBN (opzionale)" value={isbn} onChange={setIsbn} placeholder="978-..." />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-md",
            "font-ui text-[13px] font-semibold text-void uppercase tracking-wide",
            "bg-gold hover:bg-amber transition-all",
            "hover:shadow-[0_0_16px_rgba(200,144,16,0.4)]",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Check size={14} />
          Continua
        </button>
      </div>
    </motion.div>
  );
}

function ManualField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: "text" | "number";
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 rounded-lg",
          "bg-surface-3 border border-white/[0.07] focus:border-gold/40",
          "font-ui text-sm text-text-warm placeholder:text-text-muted",
          "outline-none transition-colors"
        )}
      />
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">{children}</p>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "w-full pl-8 pr-3 py-2 rounded-lg",
          "bg-surface-3 border border-white/[0.07] focus:border-gold/40",
          "font-mono text-[12px] text-text-warm",
          "outline-none transition-colors",
          "[color-scheme:dark]"
        )}
      />
    </div>
  );
}
