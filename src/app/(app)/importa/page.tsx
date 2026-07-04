"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle2, AlertCircle,
  ChevronRight, BookOpen, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ReadingStatus } from "@/types/book";

// ── CSV parser per Goodreads export ──────────────────────────────────────────

interface GoodreadsRow {
  title: string;
  author: string;
  isbn: string;
  isbn13: string;
  avgRating: number;
  publisher: string;
  pages: number;
  yearPublished: number;
  dateRead: string;
  dateAdded: string;
  shelf: string;
  rating: number;
  review: string;
}

interface ParsedBook {
  title: string;
  authors: string[];
  isbn_10: string | null;
  isbn_13: string | null;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  status: ReadingStatus;
  rating: number | null;
  review: string | null;
  finished_at: string | null;
  created_at: string | null;
}

interface ImportResult {
  success: ParsedBook[];
  skipped: { row: number; reason: string }[];
  total: number;
}

function mapShelfToStatus(shelf: string): ReadingStatus {
  const s = shelf.toLowerCase().trim();
  if (s === "read" || s === "letto") return "letto";
  if (s === "currently-reading" || s === "in_corso" || s === "reading") return "in_corso";
  if (s === "to-read" || s === "da_leggere") return "da_leggere";
  if (s === "abandoned" || s === "abbandonato") return "abbandonato";
  return "da_leggere";
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      row.push(current.trim()); current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(current.trim());
      if (row.some(c => c)) rows.push(row);
      row = []; current = "";
    } else {
      current += ch;
    }
  }
  if (current || row.length) { row.push(current.trim()); if (row.some(c => c)) rows.push(row); }
  return rows;
}

function parseGoodreadsCSV(text: string): ImportResult {
  const rows = parseCSV(text);
  if (rows.length < 2) return { success: [], skipped: [], total: 0 };

  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const idx = (name: string) => headers.findIndex(h => h.includes(name));

  const colTitle    = idx("title");
  const colAuthor   = idx("author");
  const colIsbn     = idx("isbn");
  const colIsbn13   = idx("isbn13");
  const colPublisher = idx("publisher");
  const colPages    = idx("number_of_pages") !== -1 ? idx("number_of_pages") : idx("pages");
  const colYearPub  = idx("year_published") !== -1 ? idx("year_published") : idx("original_publication_year");
  const colDateRead = idx("date_read");
  const colDateAdded = idx("date_added");
  const colShelf    = idx("exclusive_shelf") !== -1 ? idx("exclusive_shelf") : idx("bookshelves");
  const colRating   = idx("my_rating") !== -1 ? idx("my_rating") : idx("rating");
  const colReview   = idx("my_review") !== -1 ? idx("my_review") : idx("review");

  if (colTitle === -1 || colAuthor === -1) {
    return { success: [], skipped: [{ row: 0, reason: "CSV non riconosciuto come export Goodreads (mancano Title/Author)" }], total: 0 };
  }

  const success: ParsedBook[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const title = r[colTitle]?.replace(/^"|"$/g, "").trim();
    const author = r[colAuthor]?.replace(/^"|"$/g, "").trim();
    if (!title || !author) { skipped.push({ row: i + 1, reason: "Titolo o autore mancanti" }); continue; }

    const ratingRaw = colRating !== -1 ? parseInt(r[colRating]) : 0;
    const goodreadsRating = isNaN(ratingRaw) ? null : ratingRaw;
    const appRating = goodreadsRating ? Math.round(goodreadsRating * 2) : null;

    const dateRead = colDateRead !== -1 ? r[colDateRead]?.trim() : null;
    let finished_at: string | null = null;
    if (dateRead && dateRead !== "" && dateRead !== "not set") {
      const d = new Date(dateRead);
      if (!isNaN(d.getTime())) finished_at = d.toISOString().slice(0, 10);
    }

    const dateAdded = colDateAdded !== -1 ? r[colDateAdded]?.trim() : null;
    let created_at: string | null = null;
    if (dateAdded && dateAdded !== "") {
      const d = new Date(dateAdded);
      if (!isNaN(d.getTime())) created_at = d.toISOString().slice(0, 10);
    }

    const cleanIsbn = (s: string) => s?.replace(/[^0-9X]/gi, "").trim() || null;
    const isbn10 = colIsbn !== -1 ? cleanIsbn(r[colIsbn]) : null;
    const isbn13 = colIsbn13 !== -1 ? cleanIsbn(r[colIsbn13]) : null;

    const pages = colPages !== -1 ? parseInt(r[colPages]) : NaN;
    const year  = colYearPub !== -1 ? parseInt(r[colYearPub]) : NaN;
    const shelf = colShelf !== -1 ? (r[colShelf] || "to-read") : "to-read";

    // Parse author: Goodreads uses "Last, First" format
    const authorParts = author.split(",").map(p => p.trim());
    const authorFormatted = authorParts.length >= 2
      ? `${authorParts[1]} ${authorParts[0]}` : author;

    success.push({
      title,
      authors: [authorFormatted],
      isbn_10: isbn10,
      isbn_13: isbn13,
      publisher: colPublisher !== -1 ? (r[colPublisher]?.trim() || null) : null,
      published_year: isNaN(year) ? null : year,
      page_count: isNaN(pages) || pages === 0 ? null : pages,
      status: mapShelfToStatus(shelf),
      rating: appRating,
      review: colReview !== -1 ? (r[colReview]?.trim() || null) : null,
      finished_at,
      created_at,
    });
  }

  return { success, skipped, total: rows.length - 1 };
}

// ── Status breakdown ─────────────────────────────────────────────────────────
function countByStatus(books: ParsedBook[]) {
  const counts: Record<string, number> = {};
  books.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });
  return counts;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportaPage() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Seleziona un file .csv");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseGoodreadsCSV(text);
      setResult(parsed);
      setSelectedBooks(new Set(parsed.success.map((_, i) => i)));
      setStep("preview");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function startImport() {
    if (!result) return;
    setStep("importing");
    setImportProgress(10);

    const books = result.success
      .filter((_, i) => selectedBooks.has(i))
      .map(b => ({
        title:          b.title,
        authors:        b.authors,
        rating:         b.rating,
        page_count:     b.page_count,
        published_year: b.published_year,
        finished_at:    b.finished_at,
        started_at:     null,
        status:         b.status,
        format:         "ebook" as const,
        genres:         [] as string[],
        review:         b.review,
        reread_count:   0,
        isbn_13:        b.isbn_13,
        isbn_10:        b.isbn_10,
      }));

    try {
      setImportProgress(30);
      const res = await fetch("/api/importa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books }),
      });
      setImportProgress(80);
      const json = await res.json();
      setSavedCount(json.saved ?? 0);
      setImportErrors(json.errors ?? []);
      if (userId) qc.invalidateQueries({ queryKey: ["library", userId] });
    } catch (e) {
      setImportErrors(["Errore di rete: impossibile raggiungere il server"]);
    }

    setImportProgress(100);
    setTimeout(() => setStep("done"), 400);
  }

  const statusCounts = result ? countByStatus(result.success.filter((_, i) => selectedBooks.has(i))) : {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {(["upload", "preview", "done"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-ui text-[11px] font-bold transition-colors",
                step === s || (step === "importing" && s === "preview") || (step === "done" && s !== "upload" && s !== "preview")
                  ? "bg-gold text-void" : (
                    (s === "upload" && step !== "upload") || (s === "preview" && (step === "importing" || step === "done"))
                      ? "bg-gold/30 text-gold" : "bg-surface-2 text-text-muted"
                  ))}>
                {(s === "upload" && step !== "upload") || (s === "preview" && (step === "done"))
                  ? <CheckCircle2 size={12} className="text-gold" />
                  : i + 1}
              </div>
              <span className={cn("font-ui text-[11px] uppercase tracking-wide",
                step === s ? "text-gold" : "text-text-muted")}>
                {s === "upload" ? "Carica CSV" : s === "preview" ? "Anteprima" : "Completato"}
              </span>
              {i < 2 && <ChevronRight size={12} className="text-text-muted" />}
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-surface-2 rounded-xl p-5 border border-white/[0.06] space-y-3">
              <h2 className="font-display text-lg font-semibold text-text-warm">Importa da Goodreads</h2>
              <p className="font-ui text-sm text-text-sec leading-relaxed">
                Esporta la tua libreria da Goodreads e carica il file CSV per importare tutti i tuoi libri con valutazioni, date di lettura e stato.
              </p>
              <div className="flex items-start gap-3 bg-surface-3 rounded-lg p-3 border border-white/[0.04]">
                <BookOpen size={14} className="text-gold shrink-0 mt-0.5" />
                <div className="font-ui text-[12px] text-text-muted space-y-1">
                  <p><strong className="text-text-sec">Come esportare da Goodreads:</strong></p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Vai su goodreads.com → Il mio Account → Impostazioni</li>
                    <li>Scorri fino a "Import and export"</li>
                    <li>Clicca "Export Library" e scarica il file .csv</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                dragging ? "border-gold bg-gold/5" : "border-white/10 hover:border-gold/40 hover:bg-surface-2"
              )}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <Upload size={32} className={cn("mx-auto mb-4 transition-colors", dragging ? "text-gold" : "text-text-muted")} />
              <p className="font-display text-lg text-text-warm mb-1">Trascina il file CSV qui</p>
              <p className="font-ui text-sm text-text-muted">oppure clicca per selezionare</p>
              <p className="font-ui text-[11px] text-text-muted mt-3 opacity-60">Supporta l'export CSV di Goodreads</p>
            </div>

            {/* Also supports Kindle note */}
            <p className="font-ui text-[11px] text-text-muted text-center">
              Supportato anche: Kindle export · Storygraph · CSV personalizzato con colonne Title, Author, ISBN
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && result && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Trovati", value: result.total, color: "text-text-warm" },
                { label: "Importabili", value: result.success.length, color: "text-gold" },
                { label: "Saltati", value: result.skipped.length, color: "text-amber" },
                { label: "Selezionati", value: selectedBooks.size, color: "text-green-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface-2 rounded-xl p-4 border border-white/[0.06] text-center">
                  <p className={cn("font-mono text-3xl font-bold", color)}>{value}</p>
                  <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="bg-surface-2 rounded-xl p-4 border border-white/[0.06]">
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-3">Distribuzione stati</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5 bg-surface-3 rounded-lg px-3 py-1.5">
                    <span className="font-ui text-[11px] text-text-sec capitalize">{status.replace("_", " ")}</span>
                    <span className="font-mono text-[12px] text-gold font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Book list preview */}
            <div className="bg-surface-2 rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
                  Anteprima libri ({result.success.length})
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedBooks(new Set(result.success.map((_, i) => i)))}
                    className="font-ui text-[11px] text-gold hover:text-amber">Seleziona tutti</button>
                  <button onClick={() => setSelectedBooks(new Set())}
                    className="font-ui text-[11px] text-text-muted hover:text-text-sec">Deseleziona</button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                {result.success.slice(0, 50).map((book, i) => (
                  <div key={i}
                    onClick={() => setSelectedBooks(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    })}
                    className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-surface-3",
                      !selectedBooks.has(i) && "opacity-40")}>
                    <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      selectedBooks.has(i) ? "bg-gold border-gold" : "border-white/20")}>
                      {selectedBooks.has(i) && <CheckCircle2 size={10} className="text-void" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-[13px] text-text-warm truncate">{book.title}</p>
                      <p className="font-ui text-[11px] text-text-muted truncate">{book.authors[0]}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-ui text-[12px] px-2 py-0.5 rounded-full bg-surface-3 text-text-muted capitalize">
                        {book.status.replace("_", " ")}
                      </span>
                      {book.rating && <span className="font-mono text-[11px] text-gold">{book.rating}/10</span>}
                    </div>
                  </div>
                ))}
                {result.success.length > 50 && (
                  <p className="px-4 py-3 font-ui text-[11px] text-text-muted text-center">
                    + altri {result.success.length - 50} libri
                  </p>
                )}
              </div>
            </div>

            {/* Skipped */}
            {result.skipped.length > 0 && (
              <button onClick={() => setShowSkipped(p => !p)}
                className="flex items-center gap-2 font-ui text-[12px] text-amber hover:text-gold">
                <AlertCircle size={12} />
                {result.skipped.length} righe saltate — clicca per dettagli
              </button>
            )}
            <AnimatePresence>
              {showSkipped && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="bg-surface-2 rounded-xl border border-amber/20 p-4 space-y-1">
                    {result.skipped.map((s, i) => (
                      <p key={i} className="font-ui text-[11px] text-text-muted">
                        Riga {s.row}: <span className="text-amber">{s.reason}</span>
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => { setStep("upload"); setResult(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.06] font-ui text-sm text-text-muted hover:text-text-warm transition-colors">
                <X size={13} />
                Annulla
              </button>
              <button onClick={startImport} disabled={selectedBooks.size === 0}
                className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl bg-gold text-void font-ui text-sm font-semibold hover:bg-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Upload size={14} />
                Importa {selectedBooks.size} libri
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <Loader2 size={40} className="text-gold animate-spin" />
            <div className="text-center">
              <p className="font-display text-xl text-text-warm mb-2">Importazione in corso…</p>
              <p className="font-ui text-sm text-text-muted">{importProgress}% completato</p>
            </div>
            <div className="w-64 h-2 bg-surface-2 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${importProgress}%` }}
                className="h-full bg-gradient-to-r from-gold to-amber rounded-full" />
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16 gap-6 text-center">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center",
              importErrors.length === 0 ? "bg-green-400/10" : "bg-amber/10")}>
              <CheckCircle2 size={40} className={importErrors.length === 0 ? "text-green-400" : "text-amber"} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-text-warm mb-2">
                {importErrors.length === 0 ? "Importazione completata!" : "Importazione parziale"}
              </h2>
              <p className="font-ui text-base text-text-sec">
                {savedCount} libri importati su {selectedBooks.size} selezionati.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              {Object.entries(statusCounts).slice(0, 3).map(([status, count]) => (
                <div key={status} className="bg-surface-2 rounded-xl p-4 border border-white/[0.06] text-center">
                  <p className="font-mono text-2xl font-bold text-gold">{count}</p>
                  <p className="font-ui text-[12px] text-text-muted mt-1 capitalize">{status.replace("_", " ")}</p>
                </div>
              ))}
            </div>
            {importErrors.length > 0 && (
              <div className="w-full max-w-sm bg-surface-2 rounded-xl border border-amber/20 p-4 space-y-1 text-left">
                <p className="font-ui text-[11px] uppercase tracking-widest text-amber mb-2">Errori ({importErrors.length})</p>
                {importErrors.slice(0, 5).map((e, i) => (
                  <p key={i} className="font-ui text-[11px] text-text-muted">{e}</p>
                ))}
                {importErrors.length > 5 && (
                  <p className="font-ui text-[11px] text-text-muted">…e altri {importErrors.length - 5}</p>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <a href="/libreria" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-void font-ui text-sm font-semibold hover:bg-amber transition-colors">
                <BookOpen size={14} />
                Vai alla libreria
              </a>
              <button onClick={() => { setStep("upload"); setResult(null); setImportProgress(0); setSavedCount(0); setImportErrors([]); setSelectedBooks(new Set()); }}
                className="px-5 py-2.5 rounded-xl border border-white/[0.06] font-ui text-sm text-text-muted hover:text-text-warm transition-colors">
                Importa altro
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
