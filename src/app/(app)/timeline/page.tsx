"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, Eye, Hammer, Brain, Target, Zap, BookOpen,
  Sparkles, Loader2, Lightbulb, Feather, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElementType } from "react";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { createClient } from "@/lib/supabase/client";
import { GENRE_COLORS } from "@/types/book";
import { useAuth } from "@/lib/hooks/useAuth";

// ── Archetype icon ────────────────────────────────────────────────────────────
const ARCHETYPE_ICONS: [RegExp, ElementType][] = [
  [/esploratore|esplora/i,    Compass],
  [/visionario|visionar/i,    Eye],
  [/costruttore|costruzion/i, Hammer],
  [/analista|analisi/i,       Brain],
  [/stratega|strategi/i,      Target],
  [/pioniere|pioneer/i,       Zap],
  [/pensatore|pensiero/i,     Brain],
  [/narratore|narrat/i,       Feather],
  [/cercatore|cerca/i,        Lightbulb],
];
function archetypeIcon(name: string): ElementType {
  for (const [re, Icon] of ARCHETYPE_ICONS) if (re.test(name)) return Icon;
  return Sparkles;
}

const YEAR_COLORS = [
  "#6B8C5A", "#7B5EA7", "#C07840", "#4A7A9B",
  "#D4A15E", "#5A8A8A", "#8A5A7B", "#5A7A8A",
];
const MONDO_COLORS: Record<string, string> = {
  "Medievale": "#8B6A3E", "Rinascimentale": "#9B7A40", "Moderno-Storico": "#6A7A5A",
  "Contemporaneo": "#5A7A8A", "Distopico": "#8A3A3A", "Spaziale": "#4A6A9A",
  "Fantastico": "#6A4A8A", "Guerra": "#7A4A3A", "Crime-Thriller": "#6A3A6A",
  "Filosofico": "#5A6A8A", "Biografico": "#6A7A6A", "Familiare": "#8A6A5A",
  "Psicologico": "#5A4A7A", "Avventura": "#5A7A5A", "Classico-Antico": "#7A6A4A",
};
function mondoColor(m: string) { return MONDO_COLORS[m] ?? "#7A6A5A"; }

function romanNumeral(n: number): string {
  const map: [number, string][] = [[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let r = ""; for (const [v, s] of map) while (n >= v) { r += s; n -= v; } return r;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TimelineYearRow {
  year: number;
  nome_anno: string;
  archetype: string;
  mood: string;
  narrative: string;
  libro_simbolo: { title: string; author: string; reason: string };
  book_count: number;
  generated_at: string;
}
interface BookMetaRow  { book_id: string; vita_vissuta: string; mondo: string }
interface VitaVissuta  { id: string; book_id: string; title: string; author: string; vita_vissuta: string; mondo: string; year: number | null }
type MergedChapter = TimelineYearRow & {
  Icon: ElementType; color: string; chapterNum: string;
  realBooks: ReturnType<typeof useUserBooks>["books"];
  pages: number;
  genreBars: { name: string; pct: number; color: string }[];
};

// ── First-generation card (riutilizzabile) ────────────────────────────────────
function FirstGenCard({ title, description, checks, confirmed, generating, error, onConfirm, onGenerate, cta }: {
  title: string;
  description: string;
  checks: string[];
  confirmed: boolean;
  generating: boolean;
  error: string | null;
  onConfirm: () => void;
  onGenerate: () => void;
  cta: string;
}) {
  return (
    <div className="flex-1 flex items-start justify-center pt-16 px-10">
      <div className="w-full max-w-[520px] rounded-xl overflow-hidden"
        style={{ border: "1px solid rgba(212,161,94,0.15)" }}>
        <div className="px-8 pt-8 pb-5" style={{ background: "rgba(212,161,94,0.03)" }}>
          <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(212,161,94,0.50)" }}>
            Prima generazione
          </p>
          <h2 className="font-display text-[22px] font-semibold mb-2"
            style={{ color: "rgba(245,239,230,0.85)" }}>
            {title}
          </h2>
          <p className="font-body text-[13px] leading-relaxed" style={{ color: "rgba(168,138,106,0.65)" }}>
            {description}
          </p>
        </div>

        <div className="px-8 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="font-ui text-[11px] uppercase tracking-[0.15em] mb-3 text-text-muted">
            Prima di procedere, verifica che:
          </p>
          <ul className="space-y-2.5">
            {checks.map(item => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="text-gold/60 text-[11px] mt-0.5">✓</span>
                <span className="font-ui text-[12px] text-text-tert">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-8 pb-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {!confirmed ? (
            <div className="pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" onChange={onConfirm}
                  className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold cursor-pointer" />
                <span className="font-ui text-[12px] text-text-tert group-hover:text-text-sec transition-colors">
                  Ho verificato, posso procedere
                </span>
              </label>
            </div>
          ) : (
            <div className="pt-5 flex flex-col gap-3">
              <button onClick={onGenerate} disabled={generating}
                className="self-start flex items-center gap-2 px-5 py-2.5 rounded-lg font-ui text-[12px] font-medium transition-all disabled:opacity-50"
                style={{ background: "rgba(212,161,94,0.12)", border: "1px solid rgba(212,161,94,0.30)", color: "#d4a15e" }}>
                {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {generating ? "Elaborazione in corso…" : cta}
              </button>
              {generating && (
                <p className="font-ui text-[11px] text-text-muted">
                  L&apos;AI sta elaborando — può richiedere qualche minuto.
                </p>
              )}
              {error && <p className="font-ui text-[11px] text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { user, loading: authLoading } = useAuth();
  const { books, loading: booksLoading } = useUserBooks();
  const sb = createClient();

  // ── Timeline (Anni) ──────────────────────────────────────────────────────
  const [dbYears, setDbYears]           = useState<TimelineYearRow[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [generatingTimeline, setGeneratingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [confirmedTimeline, setConfirmedTimeline] = useState(false);
  const [activeYear, setActiveYear]     = useState<number | null>(null);

  // ── Vite vissute ────────────────────────────────────────────────────────
  const [bookMeta, setBookMeta]         = useState<BookMetaRow[]>([]);
  const [viteLoaded, setViteLoaded]     = useState(false);
  const [generatingVite, setGeneratingVite] = useState(false);
  const [viteError, setViteError]       = useState<string | null>(null);
  const [confirmedVite, setConfirmedVite] = useState(false);
  const [activeMondo, setActiveMondo]   = useState<string | null>(null);
  const [viteYear, setViteYear]         = useState<number | null>(null);

  // ── Tab ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"anni" | "vite">("anni");

  // ── Load timeline years ───────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return;
    setLoadingYears(true);
    sb.from("user_timeline_years")
      .select("year, nome_anno, archetype, mood, narrative, libro_simbolo, book_count, generated_at")
      .eq("user_id", user.id)
      .order("year", { ascending: true })
      .then(({ data }) => {
        setDbYears((data ?? []) as TimelineYearRow[]);
        if (data?.length) setActiveYear(data[data.length - 1].year);
        setLoadingYears(false);
      });
  }, [user, authLoading]); // eslint-disable-line

  // ── Load books_ai_metadata when vite tab opened ──────────────────────────
  useEffect(() => {
    if (activeTab !== "vite" || authLoading || booksLoading || viteLoaded) return;
    const readBooks = books.filter(b => b.status === "letto" || b.status === "rileggendo");
    if (!readBooks.length) { setViteLoaded(true); return; }
    const bookIds = readBooks.map(b => b.book_id).filter(Boolean);
    sb.from("books_ai_metadata")
      .select("book_id, vita_vissuta, mondo")
      .in("book_id", bookIds)
      .then(({ data }) => {
        setBookMeta((data ?? []) as BookMetaRow[]);
        setViteLoaded(true);
      });
  }, [activeTab, authLoading, booksLoading, books, viteLoaded]); // eslint-disable-line

  // ── Generate timeline (prima volta) ──────────────────────────────────────
  async function generateTimeline() {
    setGeneratingTimeline(true);
    setTimelineError(null);
    try {
      const res = await fetch("/api/ai/jobs/timeline-refresh", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const { data } = await sb
        .from("user_timeline_years")
        .select("year, nome_anno, archetype, mood, narrative, libro_simbolo, book_count, generated_at")
        .eq("user_id", user!.id).order("year", { ascending: true });
      setDbYears((data ?? []) as TimelineYearRow[]);
      if (data?.length) setActiveYear(data[data.length - 1].year);
    } catch (e) {
      setTimelineError(e instanceof Error ? e.message : "Errore durante la generazione");
    } finally {
      setGeneratingTimeline(false);
    }
  }

  // ── Generate vite (prima volta o rigenerazione forzata) ───────────────────
  async function generateVite(force = false) {
    setGeneratingVite(true);
    setViteError(null);
    try {
      const res = await fetch("/api/ai/jobs/vite-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      // Ricarica dal DB
      const readBooks = books.filter(b => b.status === "letto" || b.status === "rileggendo");
      const bookIds   = readBooks.map(b => b.book_id).filter(Boolean);
      const { data } = await sb.from("books_ai_metadata").select("book_id, vita_vissuta, mondo").in("book_id", bookIds);
      setBookMeta((data ?? []) as BookMetaRow[]);
    } catch (e) {
      setViteError(e instanceof Error ? e.message : "Errore durante la generazione");
    } finally {
      setGeneratingVite(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const chapters = useMemo((): MergedChapter[] => {
    return dbYears.map((dy, i) => {
      const realBooks = books.filter(b => {
        const y = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
        return y && parseInt(y) === dy.year;
      });
      const genreCount: Record<string, number> = {};
      realBooks.forEach(b => b.genres?.forEach(g => { genreCount[g] = (genreCount[g] ?? 0) + 1; }));
      const total = realBooks.length || 1;
      const genreBars = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([name, cnt]) => ({ name, pct: Math.round((cnt / total) * 100), color: GENRE_COLORS[name] ?? "#8A8A8A" }));
      return {
        ...dy, Icon: archetypeIcon(dy.archetype), color: YEAR_COLORS[i % YEAR_COLORS.length],
        chapterNum: romanNumeral(i + 1), realBooks,
        pages: realBooks.reduce((s, b) => s + (b.page_count ?? 0), 0), genreBars,
      };
    });
  }, [dbYears, books]);

  const vite = useMemo((): VitaVissuta[] => {
    const readBooks = books.filter(b => b.status === "letto" || b.status === "rileggendo");
    const metaMap   = new Map(bookMeta.map(m => [m.book_id, m]));
    return readBooks.map(b => {
      const m = metaMap.get(b.book_id);
      if (!m) return null;
      const yRaw = b.finished_at?.slice(0, 4) ?? b.created_at?.slice(0, 4);
      return { id: b.id, book_id: b.book_id, title: b.title, author: b.authors[0] ?? "", vita_vissuta: m.vita_vissuta, mondo: m.mondo, year: yRaw ? parseInt(yRaw) : null };
    }).filter((v): v is VitaVissuta => v !== null);
  }, [books, bookMeta]);

  // Anni disponibili per il filtro
  const viteYears = useMemo(
    () => Array.from(new Set(vite.map(v => v.year).filter((y): y is number => y != null))).sort((a, b) => b - a),
    [vite]);
  // Applica il filtro anno, poi raggruppa per mondo
  const viteShown = useMemo(
    () => (viteYear ? vite.filter(v => v.year === viteYear) : vite),
    [vite, viteYear]);
  const vitaByMondo     = useMemo(() => {
    const map = new Map<string, VitaVissuta[]>();
    viteShown.forEach(v => { if (!map.has(v.mondo)) map.set(v.mondo, []); map.get(v.mondo)!.push(v); });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [viteShown]);
  const mondi           = vitaByMondo.map(([m]) => m);
  const filteredByMondo = activeMondo ? vitaByMondo.filter(([m]) => m === activeMondo) : vitaByMondo;
  const chapter         = chapters.find(c => c.year === activeYear);
  const totalPages      = chapters.reduce((s, c) => s + c.pages, 0);
  const latestYear      = dbYears.length > 0 ? dbYears[dbYears.length - 1] : null;

  const isLoading       = authLoading || booksLoading || loadingYears;
  const hasNoBooks      = !isLoading && books.length === 0;
  const needsTimeline   = !isLoading && dbYears.length === 0 && books.length > 0;

  // ── Empty / loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center" style={{ background: "#16120f" }}>
        <Loader2 size={24} className="text-gold animate-spin" />
      </div>
    );
  }
  if (hasNoBooks) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center flex-col gap-4" style={{ background: "#16120f" }}>
        <Sparkles size={32} className="text-gold/30" />
        <p className="font-display text-xl italic text-text-muted">La tua storia inizia con il primo libro</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: "#16120f" }}>

      {/* ── Year nav sidebar — desktop only ──────────────────────────────── */}
      {activeTab === "anni" && chapters.length > 0 && (
        <nav className="hidden md:flex w-[148px] shrink-0 flex-col py-6 overflow-y-auto"
          style={{ background: "linear-gradient(180deg, #0d0b08 0%, #110e0a 100%)", borderRight: "1px solid rgba(212,161,94,0.07)" }}>
          <div className="px-4 pb-5">
            <p className="font-ui text-[11px] uppercase tracking-[0.22em] text-text-muted">La tua storia</p>
            <p className="font-ui text-[12px] text-text-muted mt-0.5">
              {chapters.length} capitoli · {totalPages.toLocaleString("it-IT")} pagine
            </p>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {chapters.map(ch => {
              const isActive = ch.year === activeYear;
              return (
                <button key={ch.year} onClick={() => setActiveYear(ch.year)}
                  className={cn("relative text-left px-3 py-2.5 rounded transition-all duration-200 group",
                    isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.025]")}>
                  {isActive && (
                    <div className="absolute left-0 top-[12%] bottom-[12%] w-[2px] rounded-full" style={{ background: ch.color }} />
                  )}
                  <div className="font-display font-semibold text-[17px] leading-tight transition-colors"
                    style={{ color: isActive ? ch.color : "#7a6050" }}>{ch.year}</div>
                  <div className={cn("font-ui text-[11px] uppercase tracking-[0.08em] mt-0.5 transition-colors",
                    isActive ? "text-text-tert" : "text-text-tert group-hover:text-text-muted")}>
                    {ch.archetype.replace(/^(Il |Lo |La |L')/i, "").slice(0, 12)}
                  </div>
                  <div className={cn("font-ui text-[12px]", isActive ? "text-text-muted/70" : "text-text-muted")}>
                    {ch.realBooks.length} {ch.realBooks.length === 1 ? "libro" : "libri"}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Data ultimo aggiornamento — niente rigenera manuale */}
          {latestYear && (
            <div className="mt-auto px-4 pt-4 pb-2">
              <p className="font-ui text-[12px] text-text-muted leading-relaxed">
                Aggiornato il<br />{formatDate(latestYear.generated_at)}
              </p>
            </div>
          )}
        </nav>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Tab switcher */}
        <div className="shrink-0 flex items-center gap-1 px-4 md:px-6 pt-4 md:pt-5 pb-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {([
            { id: "anni", label: "La mia storia", icon: BookOpen },
            { id: "vite", label: "Vite vissute",  icon: ScrollText },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 md:px-4 py-2.5 font-ui text-[11px] md:text-[11px] uppercase tracking-[0.12em] transition-all border-b-[1.5px] -mb-px",
                activeTab === id ? "text-gold border-gold/60" : "text-text-muted border-transparent hover:text-text-sec hover:border-white/10"
              )}>
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile year selector — horizontal pills (hidden on desktop) */}
        {activeTab === "anni" && chapters.length > 0 && (
          <div className="md:hidden shrink-0 flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", scrollbarWidth: "none" }}>
            {chapters.map(ch => {
              const isActive = ch.year === activeYear;
              return (
                <button key={ch.year} onClick={() => setActiveYear(ch.year)}
                  className="shrink-0 px-3 py-1 rounded-full font-ui text-[11px] transition-all"
                  style={isActive
                    ? { background: ch.color + "20", border: `1px solid ${ch.color}50`, color: ch.color }
                    : { border: "1px solid rgba(255,255,255,0.07)", color: "#5a4535" }}>
                  {ch.year}
                </button>
              );
            })}
          </div>
        )}

        {/* ── ANNI TAB ─────────────────────────────────────────────────── */}
        {activeTab === "anni" && (
          needsTimeline ? (
            <FirstGenCard
              title="Scrivi la tua storia"
              description="L'AI costruisce un capitolo narrativo per ogni anno della tua vita di lettore. Si aggiorna in automatico ogni mese, solo per gli anni con nuovi libri — non serve rigenerarla a mano."
              checks={[
                "Hai caricato tutti i libri che hai letto",
                "Le date di lettura (inizio / fine) sono inserite e corrette",
                "La libreria riflette tutto quello che hai davvero letto",
              ]}
              confirmed={confirmedTimeline}
              generating={generatingTimeline}
              error={timelineError}
              onConfirm={() => setConfirmedTimeline(true)}
              onGenerate={generateTimeline}
              cta="Scrivi la mia storia"
            />
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {chapter && (
                  <motion.div key={activeYear}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="px-4 py-6 md:px-10 md:py-10 max-w-[720px]">

                    {/* Header */}
                    <div className="mb-7">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="font-ui text-[11px] uppercase tracking-[0.3em] text-text-muted">
                          Capitolo {chapter.chapterNum}
                        </span>
                        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${chapter.color}25, transparent)` }} />
                        <span className="font-ui text-[11px] uppercase tracking-[0.15em]" style={{ color: chapter.color + "bb" }}>
                          {chapter.mood}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute -top-2 -left-2 font-display font-bold select-none pointer-events-none leading-none"
                          style={{ fontSize: "88px", letterSpacing: "-0.04em", color: `${chapter.color}10` }}>
                          {chapter.year}
                        </div>
                        <div className="relative z-10 pt-1">
                          <h1 className="font-display text-[28px] md:text-[38px] font-bold leading-none mb-2"
                            style={{ color: "rgba(245,239,230,0.90)" }}>
                            {chapter.year}
                          </h1>
                          <p className="font-display text-[20px] font-medium mb-3 leading-tight" style={{ color: chapter.color }}>
                            {chapter.nome_anno}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-ui text-[11px] font-medium"
                              style={{ background: `${chapter.color}18`, border: `1px solid ${chapter.color}35`, color: chapter.color }}>
                              <chapter.Icon size={11} />
                              {chapter.archetype}
                            </div>
                            <span className="font-ui text-[12px] text-text-muted">
                              {chapter.realBooks.length} {chapter.realBooks.length === 1 ? "libro" : "libri"} · {chapter.pages.toLocaleString("it-IT")} pagine
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Narrative */}
                    {chapter.narrative && (
                      <div className="mb-8">
                        <p className="font-body text-[15px] leading-[1.85]" style={{ color: "rgba(201,168,122,0.80)" }}>
                          {chapter.narrative}
                        </p>
                      </div>
                    )}

                    {/* Libro simbolo */}
                    {chapter.libro_simbolo?.title && (
                      <div className="mb-8 px-5 py-4 rounded-lg"
                        style={{ background: `${chapter.color}0c`, border: `1px solid ${chapter.color}20` }}>
                        <p className="font-ui text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: chapter.color + "99" }}>
                          Libro simbolo
                        </p>
                        <p className="font-display text-[14px] font-medium text-text-warm">{chapter.libro_simbolo.title}</p>
                        <p className="font-ui text-[11px] text-text-muted mt-0.5 mb-2">{chapter.libro_simbolo.author}</p>
                        {chapter.libro_simbolo.reason && (
                          <p className="font-body text-[12px] italic leading-relaxed" style={{ color: "rgba(168,138,106,0.65)" }}>
                            {chapter.libro_simbolo.reason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Books */}
                    <div className="mb-9">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-ui text-[11px] uppercase tracking-[0.22em] text-text-muted">I libri di quest&apos;anno</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {chapter.realBooks.map((book, i) => (
                          <motion.div key={book.id}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, delay: i * 0.04 }}
                            className="px-3 py-2 rounded-md"
                            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-ui text-[11px] font-medium text-text-tert">{book.title}</span>
                              {book.is_favorite && <span style={{ color: "#d4a15e", fontSize: 9 }}>♥</span>}
                            </div>
                            <div className="font-ui text-[12px] text-text-muted mt-0.5 flex items-center gap-1.5">
                              <span>{book.authors[0]}</span>
                              {book.rating !== null && <span style={{ color: "#d4a15e" }}>{book.rating}/10</span>}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Genre bars */}
                    {chapter.genreBars.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="font-ui text-[11px] uppercase tracking-[0.22em] text-text-muted">Generi letti</span>
                          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                        </div>
                        <div className="space-y-3">
                          {chapter.genreBars.map((g, i) => (
                            <div key={g.name}>
                              <div className="flex justify-between items-baseline mb-1.5">
                                <span className="font-ui text-[11px] text-text-tert">{g.name}</span>
                                <span className="font-ui text-[11px] font-medium" style={{ color: g.color }}>{g.pct}%</span>
                              </div>
                              <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${g.pct}%` }}
                                  transition={{ duration: 0.65, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                                  className="h-full rounded-full" style={{ background: g.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        )}

        {/* ── VITE VISSUTE TAB ──────────────────────────────────────────── */}
        {activeTab === "vite" && (
          !viteLoaded ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={22} className="text-gold animate-spin" />
            </div>
          ) : vite.length === 0 ? (
            <FirstGenCard
              title="Le vite che hai vissuto"
              description="L'AI analizza ogni libro che hai letto e costruisce una descrizione immersiva dell'avventura che hai vissuto attraverso i suoi protagonisti. I dati sono salvati globalmente — ogni libro viene analizzato una sola volta per tutti gli utenti."
              checks={[
                "Hai segnato come 'Letto' tutti i libri che hai completato",
              ]}
              confirmed={confirmedVite}
              generating={generatingVite}
              error={viteError}
              onConfirm={() => setConfirmedVite(true)}
              onGenerate={generateVite}
              cta="Genera le mie vite vissute"
            />
          ) : (
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="px-4 py-6 md:px-10 md:py-8 max-w-[820px]">

                {/* Header */}
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-ui text-[11px] uppercase tracking-[0.3em] text-text-muted mb-2">Esperienze letterarie</p>
                    <h2 className="font-display text-[28px] font-bold leading-tight"
                      style={{ color: "rgba(245,239,230,0.88)", letterSpacing: "-0.02em" }}>
                      Le vite che hai vissuto
                    </h2>
                    <p className="font-body text-[13px] italic mt-2" style={{ color: "rgba(168,138,106,0.55)" }}>
                      {vite.length} avventure · si aggiorna in automatico ogni mese, solo per i nuovi libri
                    </p>
                  </div>
                  <button onClick={() => generateVite(true)} disabled={generatingVite}
                    title="Rigenera tutte le descrizioni con luoghi e date reali (sovrascrive)"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui text-[11px] uppercase tracking-[0.1em] transition-all disabled:opacity-50"
                    style={{ background: "rgba(212,161,94,0.10)", border: "1px solid rgba(212,161,94,0.25)", color: "#d4a15e" }}>
                    {generatingVite ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {generatingVite ? "Rigenero…" : "Rigenera"}
                  </button>
                </div>
                {viteError && (
                  <p className="font-ui text-[12px] text-red-400 -mt-4 mb-5">{viteError}</p>
                )}

                {/* Year filter pills */}
                {viteYears.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-muted mr-1">Anno</span>
                    <button onClick={() => setViteYear(null)}
                      className={cn("px-3 py-1 rounded-full font-ui text-[11px] transition-all",
                        viteYear === null ? "bg-gold/15 border border-gold/30 text-gold" : "border border-white/[0.07] text-text-muted hover:border-white/15")}>
                      Tutti
                    </button>
                    {viteYears.map(y => {
                      const count = vite.filter(v => v.year === y).length;
                      return (
                        <button key={y} onClick={() => setViteYear(prev => prev === y ? null : y)}
                          className={cn("px-3 py-1 rounded-full font-ui text-[11px] transition-all",
                            viteYear === y ? "bg-gold/15 border border-gold/30 text-gold" : "border border-white/[0.07] text-text-muted hover:border-white/15")}>
                          {y} · {count}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mondo filter pills */}
                {mondi.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-8">
                    <button onClick={() => setActiveMondo(null)}
                      className={cn("px-3 py-1 rounded-full font-ui text-[11px] uppercase tracking-[0.1em] transition-all",
                        activeMondo === null ? "bg-gold/15 border border-gold/30 text-gold" : "border border-white/[0.07] text-text-muted hover:border-white/15")}>
                      Tutti · {vite.length}
                    </button>
                    {mondi.map(m => {
                      const count = vite.filter(v => v.mondo === m).length;
                      const color = mondoColor(m);
                      return (
                        <button key={m}
                          onClick={() => setActiveMondo(prev => prev === m ? null : m)}
                          className={cn("px-3 py-1 rounded-full font-ui text-[11px] uppercase tracking-[0.1em] transition-all border",
                            activeMondo === m ? "" : "border-white/[0.06] text-text-muted hover:border-white/12")}
                          style={activeMondo === m ? { background: color + "20", borderColor: color + "50", color } : undefined}>
                          {m} · {count}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Vite grouped by mondo */}
                <div className="space-y-10">
                  {filteredByMondo.map(([mondo, mondoVite]) => {
                    const color = mondoColor(mondo);
                    return (
                      <div key={mondo}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="font-ui text-[11px] uppercase tracking-[0.25em]" style={{ color: color + "cc" }}>{mondo}</span>
                          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
                          <span className="font-ui text-[12px] text-text-muted">
                            {mondoVite.length} {mondoVite.length === 1 ? "vita" : "vite"}
                          </span>
                        </div>
                        <div className="space-y-0">
                          {mondoVite.map((v, i) => (
                            <motion.div key={v.id}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.03 }}
                              className="py-4"
                              style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                              <p className="font-body text-[14px] leading-[1.75] italic mb-1.5"
                                style={{ color: "rgba(212,178,130,0.85)" }}>
                                {v.vita_vissuta}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-[12px] font-medium" style={{ color: "rgba(245,239,230,0.50)" }}>
                                  {v.title}
                                </span>
                                {v.author && (
                                  <>
                                    <span className="text-text-muted text-[12px]">·</span>
                                    <span className="font-ui text-[11px] text-text-tert">{v.author}</span>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )
        )}

      </div>
    </div>
  );
}
