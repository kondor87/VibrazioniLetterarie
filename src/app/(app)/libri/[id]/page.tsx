"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, Heart, BookOpen, Calendar,
  Hash, Building2, Globe, Layers, Edit3, Feather, MapPin, X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { useCensus } from "@/lib/hooks/useCensus";
import { CommunityBookPanel } from "@/components/community/CommunityBookPanel";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, STATUS_COLORS, GENRE_COLORS } from "@/types/book";
import type { ReadingStatus } from "@/types/book";
import { ROW_LABEL, rowsFor } from "@/types/census";

interface AuthorInfo { name: string; extract: string; thumbnail: string | null; url: string | null }

const GENRE_COVER_COLORS: Record<string, string> = {
  Narrativa: "#2a1a0e", Fantasy: "#0e1a12", Saggistica: "#0e121a",
  Business: "#1a120e", "Crescita Personale": "#0e1a16", Psicologia: "#120e1a",
  Biografie: "#1a0e0e",
};

const FORMAT_LABELS: Record<string, string> = {
  ebook: "Ebook", cartaceo: "Cartaceo", audio: "Audiolibro",
};

export default function LibroDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router  = useRouter();
  const { books, loading } = useUserBooks();

  const book = books.find(b => b.id === id);

  // Vita vissuta del libro (cache AI globale)
  const bookCatalogId = book?.book_id;
  const [vita, setVita] = useState<string | null>(null);
  useEffect(() => {
    if (!bookCatalogId) { setVita(null); return; }
    let active = true;
    createClient()
      .from("books_ai_metadata")
      .select("vita_vissuta")
      .eq("book_id", bookCatalogId)
      .maybeSingle()
      .then(({ data }) => { if (active) setVita((data?.vita_vissuta as string) ?? null); });
    return () => { active = false; };
  }, [bookCatalogId]);

  // Bio autore — disambiguata via il libro (P50) per evitare omonimi
  const authorName = book?.authors?.[0];
  const authorBookTitle = book?.title;
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  useEffect(() => {
    if (!authorName) { setAuthor(null); return; }
    let active = true;
    setAuthor(null);
    const q = `name=${encodeURIComponent(authorName)}${authorBookTitle ? `&title=${encodeURIComponent(authorBookTitle)}` : ""}`;
    fetch(`/api/author?${q}`)
      .then(r => r.json())
      .then(d => { if (active && d.found) setAuthor(d as AuthorInfo); })
      .catch(() => { /* nessuna bio */ });
    return () => { active = false; };
  }, [authorName, authorBookTitle]);

  // Sinossi ufficiale dal catalogo Google Books, preferendo l'edizione italiana
  const bookTitle = book?.title;
  const firstAuthor = book?.authors?.[0];
  const bookIsbn = book?.isbn_13 ?? book?.isbn_10 ?? "";
  const [officialSynopsis, setOfficialSynopsis] = useState<string | null>(null);
  useEffect(() => {
    if (!bookTitle) { setOfficialSynopsis(null); return; }
    let active = true;
    setOfficialSynopsis(null);
    const q = `title=${encodeURIComponent(bookTitle)}&author=${encodeURIComponent(firstAuthor ?? "")}${bookIsbn ? `&isbn=${encodeURIComponent(bookIsbn)}` : ""}`;
    fetch(`/api/synopsis?${q}`)
      .then(r => r.json())
      .then(d => { if (active && d.found) setOfficialSynopsis(d.extract as string); })
      .catch(() => { /* resta la description salvata */ });
    return () => { active = false; };
  }, [bookTitle, firstAuthor, bookIsbn]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-void">
        {/* Header skeleton */}
        <div className="h-72 bg-surface-2 animate-pulse" />
        <div className="px-8 py-6 space-y-4 max-w-3xl">
          <div className="h-8 w-2/3 bg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-surface-2 rounded animate-pulse" />
          <div className="h-24 bg-surface-2 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <BookOpen size={40} className="text-text-muted" />
        <p className="font-display text-xl italic text-text-muted">Libro non trovato</p>
        <button onClick={() => router.back()}
          className="font-ui text-sm text-gold hover:text-amber transition-colors">
          ← Torna ai libri
        </button>
      </div>
    );
  }

  const coverBg = GENRE_COVER_COLORS[book.genres?.[0] ?? ""] ?? "#231508";

  // Ritmo personale su questo libro (pagine/giorno) → percentile community
  const myPpd = (book.started_at && book.finished_at && book.page_count)
    ? book.page_count / Math.max(1, Math.round(
        (new Date(book.finished_at).getTime() - new Date(book.started_at).getTime()) / 86400000))
    : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-void">

      {/* ── Hero cover banner ── */}
      <div className="relative w-full h-80 shrink-0 overflow-hidden">
        {/* Blurred background */}
        {book.cover_url ? (
          <Image src={book.cover_url} alt="" fill
            className="object-cover scale-110 blur-2xl opacity-30 saturate-150" />
        ) : (
          <div className="absolute inset-0" style={{ background: coverBg }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-void" />

        {/* Back button */}
        <button onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     bg-black/40 backdrop-blur-sm border border-white/10
                     font-ui text-[12px] text-text-warm hover:text-gold hover:border-gold/30 transition-all">
          <ArrowLeft size={13} />
          I miei libri
        </button>

        {/* Cover + title positioned at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-5 px-8 pb-6">
          {/* Cover */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="shrink-0 w-[132px] h-[198px] rounded-md shadow-book overflow-hidden border border-white/10">
            {book.cover_url ? (
              <Image src={book.cover_url} alt={book.title} width={132} height={198}
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: coverBg }}>
                <BookOpen size={28} className="text-white/50" />
              </div>
            )}
          </motion.div>

          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex-1 min-w-0 pb-1">
            <h1 className="font-display text-2xl font-semibold text-text-warm leading-tight">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="font-display italic text-[14px] text-text-sec mt-0.5">{book.subtitle}</p>
            )}
            <p className="font-display text-[16px] italic text-text-sec mt-1.5">
              {book.authors.join(", ")}
              {book.published_year && <span className="ml-2 text-text-muted not-italic font-ui text-[13px]">· {book.published_year}</span>}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-8 py-6 max-w-3xl w-full mx-auto space-y-8">

        {/* Genre + format badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-2">
          {book.genres?.map(g => (
            <span key={g} className="font-ui text-[11px] px-2.5 py-1 rounded-full"
              style={{ background: (GENRE_COLORS[g] ?? "#3A3A3A") + "33", color: GENRE_COLORS[g] ?? "#B08860" }}>
              {g}
            </span>
          ))}
          {book.format && (
            <span className="font-ui text-[11px] px-2.5 py-1 rounded-full bg-surface-2 text-text-muted border border-white/[0.06]">
              {FORMAT_LABELS[book.format] ?? book.format}
            </span>
          )}
          {book.is_favorite && (
            <span className="flex items-center gap-1 font-ui text-[11px] px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
              <Heart size={10} fill="currentColor" />
              Preferito
            </span>
          )}
        </motion.div>

        {/* Sinossi ufficiale (Google Books, edizione italiana quando disponibile) */}
        {(officialSynopsis ?? book.description) && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-body text-[16px] text-text-sec leading-relaxed first-letter:text-3xl first-letter:font-display first-letter:text-gold first-letter:mr-1 first-letter:float-left first-letter:leading-[0.9]">
            {officialSynopsis ?? book.description}
          </motion.p>
        )}

        {/* ══════════ La tua lettura ══════════ */}
        {(book.status || book.review) && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="space-y-3">
            <SectionTitle>La tua lettura</SectionTitle>

            {book.status && (
              <div className="bg-surface-2 rounded-xl border border-white/[0.06] p-4 flex flex-wrap items-center gap-6">
                <div className="space-y-0.5">
                  <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Stato</p>
                  <span className={cn("font-ui text-[12px] px-2.5 py-1 rounded-full border", STATUS_COLORS[book.status as ReadingStatus])}>
                    {STATUS_LABELS[book.status as ReadingStatus]}
                  </span>
                </div>

                {book.rating && (
                  <div className="space-y-0.5">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Voto</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Star key={i} size={13}
                          className={i < book.rating! ? "text-amber" : "text-surface-3"}
                          fill={i < book.rating! ? "currentColor" : "none"} />
                      ))}
                      <span className="font-mono text-[13px] text-gold ml-1">{book.rating}/10</span>
                    </div>
                  </div>
                )}

                {book.started_at && (
                  <div className="space-y-0.5">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Iniziato</p>
                    <p className="font-ui text-[13px] text-text-warm flex items-center gap-1">
                      <Calendar size={11} className="text-text-muted" />
                      {new Date(book.started_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                )}

                {book.finished_at && (
                  <div className="space-y-0.5">
                    <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Completato</p>
                    <p className="font-ui text-[13px] text-text-warm flex items-center gap-1">
                      <Calendar size={11} className="text-gold" />
                      {new Date(book.finished_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {book.review && (
              <div className="space-y-1.5">
                <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Le mie note</p>
                <blockquote className="border-l-2 border-gold/40 pl-4 font-display italic text-[15px] text-text-warm leading-relaxed">
                  {book.review}
                </blockquote>
              </div>
            )}

            <button
              onClick={() => router.push(`/libri?edit=${id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gold/25
                         bg-gold/8 text-gold font-ui text-[11px] uppercase tracking-widest
                         hover:bg-gold/15 hover:border-gold/40 transition-all">
              <Edit3 size={12} />
              Modifica stato / voto
            </button>
          </motion.section>
        )}

        {/* ══════════ Le vibrazioni della community ══════════ */}
        {book.book_id && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="space-y-3">
            <SectionTitle>La community</SectionTitle>
            <CommunityBookPanel bookId={book.book_id} myRating={book.rating ?? null} myPpd={myPpd} />
          </motion.section>
        )}

        {/* ══════════ L'eco del libro (AI + autore) ══════════ */}
        {(vita || author) && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="space-y-4">
            <SectionTitle>L&apos;eco del libro</SectionTitle>

            {vita && (
              <div className="rounded-xl px-5 py-4"
                style={{ background: "rgba(212,161,94,0.05)", border: "1px solid rgba(212,161,94,0.14)" }}>
                <p className="font-ui text-[11px] uppercase tracking-widest mb-2" style={{ color: "rgba(212,161,94,0.6)" }}>
                  La vita che hai vissuto
                </p>
                <p className="font-body italic text-[15px] leading-relaxed" style={{ color: "rgba(212,178,130,0.9)" }}>
                  {vita}
                </p>
              </div>
            )}

            {author && (
              <div className="space-y-1.5">
                <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Feather size={11} /> Sull&apos;autore
                </p>
                <div className="flex gap-4 bg-surface-2 rounded-xl border border-white/[0.06] p-4">
                  {author.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.thumbnail} alt={author.name}
                      className="w-16 h-16 rounded-full object-cover shrink-0 border border-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold text-text-warm">{author.name}</p>
                    <p className="font-body text-[13px] text-text-sec leading-relaxed mt-1 line-clamp-5">
                      {author.extract}
                    </p>
                    {author.url && (
                      <a href={author.url} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-2 font-ui text-[11px] text-gold hover:underline">
                        Leggi su Wikipedia →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* ══════════ La scheda (metadati + collocazione) ══════════ */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
          className="space-y-3">
          <SectionTitle>La scheda</SectionTitle>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Layers,    label: "Pagine",  value: book.page_count?.toLocaleString("it") },
              { icon: Building2, label: "Editore", value: book.publisher },
              { icon: Globe,     label: "Lingua",  value: book.language?.toUpperCase() },
              { icon: Hash,      label: "ISBN-13", value: book.isbn_13 },
              { icon: Hash,      label: "ISBN-10", value: book.isbn_10 },
            ].filter(i => i.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-surface-2 rounded-lg px-4 py-3 border border-white/[0.04] space-y-0.5">
                <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Icon size={10} />
                  {label}
                </p>
                <p className="font-mono text-[12px] text-text-warm">{value}</p>
              </div>
            ))}
          </div>

          <PlacementPicker bookId={id} />
        </motion.section>

      </div>
    </div>
  );
}

// ── Intestazione di sezione coerente ──────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-gold/70 whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
    </div>
  );
}

// ── Collocazione fisica (Libreria → Ripiano → Davanti/Dietro) ──────────────────
function PlacementPicker({ bookId }: { bookId: string }) {
  const c = useCensus();
  const current = c.placements[bookId];
  const allShelves = c.bookcases.flatMap(b => b.shelves);
  const currentShelf = current ? allShelves.find(s => s.id === current.shelf_id) : undefined;
  const currentBc = currentShelf ? c.bookcases.find(b => b.id === currentShelf.bookcase_id) : undefined;

  const [bcId, setBcId] = useState("");
  const [shId, setShId] = useState("");
  useEffect(() => {
    if (currentShelf) { setBcId(currentShelf.bookcase_id); setShId(currentShelf.id); }
  }, [currentShelf?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (c.loading) return null;
  const shelves = c.bookcases.find(b => b.id === bcId)?.shelves ?? [];
  const selDepth = shelves.find(s => s.id === shId)?.row_depth ?? 2;
  const rowOptions = rowsFor(selDepth);
  const selCls = "bg-surface-3 border border-white/[0.08] rounded-lg px-3 py-2 font-ui text-[12px] text-text-warm outline-none focus:border-gold/40 cursor-pointer";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="space-y-2">
      <h2 className="font-ui text-[11px] uppercase tracking-widest text-text-muted flex items-center gap-1.5">
        <MapPin size={11} /> Collocazione
      </h2>
      {c.bookcases.length === 0 ? (
        <p className="font-ui text-[13px] text-text-muted">
          Crea prima una libreria nella vista{" "}
          <Link href="/libri" className="text-gold hover:underline">Scaffali</Link>, poi torna qui per collocare il libro.
        </p>
      ) : (
        <div className="bg-surface-2 rounded-xl border border-white/[0.06] p-4 space-y-3">
          {current && currentShelf && (
            <p className="font-ui text-[12px] text-text-sec flex flex-wrap items-center gap-2">
              Attualmente in{" "}
              <strong className="text-text-warm">{currentBc?.name} · {currentShelf.name} · {ROW_LABEL[current.shelf_row]}</strong>
              <Link href={`/libri?view=shelves&focus=${bookId}`}
                className="inline-flex items-center gap-1 text-gold/80 hover:text-gold transition-colors">
                <MapPin size={11} /> trova sullo scaffale →
              </Link>
              <button onClick={() => { c.unplaceBook(bookId); setShId(""); }}
                className="inline-flex items-center gap-1 text-text-muted hover:text-red-400 transition-colors">
                <X size={11} /> togli
              </button>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <select value={bcId} onChange={e => { setBcId(e.target.value); setShId(""); }} className={selCls}>
              <option value="">Libreria…</option>
              {c.bookcases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={shId} onChange={e => setShId(e.target.value)} disabled={!bcId} className={cn(selCls, !bcId && "opacity-50")}>
              <option value="">Ripiano…</option>
              {shelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {shId && (
            <div className="flex gap-2">
              {rowOptions.map(r => {
                const active = current?.shelf_id === shId && current?.shelf_row === r;
                return (
                  <button key={r} onClick={() => c.placeBook(bookId, shId, r)}
                    className={cn("px-3 py-1.5 rounded-md font-ui text-[12px] border transition-all",
                      active ? "bg-gold/15 text-gold border-gold/40" : "text-text-tert border-white/[0.08] hover:text-text-sec hover:border-white/[0.15]")}>
                    {ROW_LABEL[r]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
