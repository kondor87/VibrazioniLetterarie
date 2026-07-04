"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, Sparkles, BookOpen, TrendingUp,
  MessageSquare, ChevronRight, Star, User, Lightbulb, Target, Brain, Dna,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/layout/TopBar";
import { useReaderContext } from "@/lib/hooks/useReaderContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { IdentitaData } from "@/app/api/ai/identita/route";
import type { InsightData } from "@/app/api/ai/insights/route";

// ── Genre color palette ────────────────────────────────────────────────────────
const GENRE_PALETTE = [
  "#8A5020", "#2A5080", "#3D7A5A", "#5A3080",
  "#7B3F8A", "#805020", "#1A6B6B", "#6B4A1A",
];

const QUICK_QUESTIONS = [
  "Cosa rivela la mia libreria sul mio carattere?",
  "Quale libro potrei leggere dopo Stephen King?",
  "Analizza i miei pattern di lettura",
  "Crea una reading challenge personalizzata",
];

const TYPE_META: Record<InsightData["type"], { icon: typeof Brain; accent: string }> = {
  profile:    { icon: User,       accent: "from-gold/10 to-amber/5 border-gold/20" },
  pattern:    { icon: TrendingUp, accent: "from-blue-500/10 to-blue-400/5 border-blue-500/20" },
  suggestion: { icon: Lightbulb,  accent: "from-green-500/10 to-green-400/5 border-green-500/20" },
  challenge:  { icon: Target,     accent: "from-amber/10 to-orange-500/5 border-amber/20" },
};

interface InsightCard extends InsightData { id: string }
interface ChatMessage { role: "user" | "assistant"; content: string }

type Tab = "profilo" | "insights" | "chat";

// ── Skeleton (tab Profilo) ───────────────────────────────────────────────────────
function IdentitaSkeleton() {
  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12 animate-pulse space-y-10">
      <div className="text-center space-y-4">
        <div className="h-3 bg-white/5 rounded w-40 mx-auto" />
        <div className="h-16 bg-white/5 rounded w-72 mx-auto" />
        <div className="h-4 bg-white/5 rounded w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-4 gap-0 rounded-lg overflow-hidden border border-white/5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="py-8 bg-white/[0.02] border-r border-white/5 last:border-r-0" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-white/5 rounded w-48" />
              <div className="h-3 bg-white/5 rounded w-12" />
            </div>
            <div className="h-1.5 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IdentitaPage() {
  const { context, loading: booksLoading, totalBooks } = useReaderContext();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profilo");

  // — Profilo (archetipo) — caricato dal DB (user_ai_profiles), generato una sola volta —
  const [archetype, setArchetype] = useState<IdentitaData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // — Insights —
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  // — Chat —
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Profilo: genera archetipo (persiste su user_ai_profiles via profile-refresh) ──
  const generateProfile = useCallback(async () => {
    if (totalBooks === 0) return;
    setGenerating(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/ai/jobs/profile-refresh", { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setArchetype(json.archetype as IdentitaData);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Errore sconosciuto");
    } finally {
      setGenerating(false);
    }
  }, [totalBooks]);

  // 1. Carica il profilo salvato dal DB (come timeline/vite — niente rigenerazione a ogni visita)
  useEffect(() => {
    if (!user) return;
    let active = true;
    createClient()
      .from("user_ai_profiles")
      .select("archetype")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const a = data?.archetype as IdentitaData | undefined;
        if (a?.name) setArchetype(a);
        setProfileLoaded(true);
      });
    return () => { active = false; };
  }, [user]);

  // 2. Genera SOLO se non esiste un profilo salvato (prima volta). Poi ci pensa il cron mensile.
  useEffect(() => {
    if (profileLoaded && !archetype && !booksLoading && totalBooks > 0 && !generating) generateProfile();
  }, [profileLoaded, archetype, booksLoading, totalBooks, generating, generateProfile]);

  // ── Insights: genera al primo accesso al tab ───────────────────────────────
  const loadInsights = useCallback(async () => {
    if (totalBooks === 0) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context.insights),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore GPT");
      setInsights((data.insights as InsightData[]).map((ins, i) => ({ ...ins, id: `insight-${i}` })));
      setInsightsLoaded(true);
    } catch (e) {
      setInsightsError((e as Error).message);
    } finally {
      setInsightsLoading(false);
    }
  }, [context.insights, totalBooks]);

  useEffect(() => {
    if (tab === "insights" && !insightsLoaded && !insightsLoading && !booksLoading && totalBooks > 0) {
      loadInsights();
    }
  }, [tab, insightsLoaded, insightsLoading, booksLoading, totalBooks, loadInsights]);

  // ── Chat ────────────────────────────────────────────────────────────────────
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatLoading]);

  async function sendMessage(message: string) {
    if (!message.trim() || chatLoading) return;
    const newMessages = [...chatMessages, { role: "user", content: message } as ChatMessage];
    setChatMessages(newMessages);
    setInputValue("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, booksContext: context.insights }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.message ?? data.error ?? "Errore nella risposta" }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Errore di rete. Riprova tra qualche secondo." }]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Derived display ──────────────────────────────────────────────────────────
  const ci = context.identita;
  const dnaTotal = ci.topGenres.reduce((s, g) => s + g.count, 0) || 1;
  const stats = [
    { label: "Libri letti",     value: String(ci.readBooks) },
    { label: "Pagine totali",   value: ci.totalPages > 0 ? ci.totalPages.toLocaleString("it") : "—" },
    { label: "Anni di lettura", value: String(ci.yearsActive) },
    { label: "Voto medio",      value: ci.avgRating > 0 ? `${ci.avgRating}` : "—" },
  ];

  const TABS: { id: Tab; label: string; icon: typeof Dna }[] = [
    { id: "profilo",  label: "Profilo",  icon: Dna },
    { id: "insights", label: "Insights", icon: Sparkles },
    { id: "chat",     label: "Chat",     icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />

      {/* Tab switcher */}
      <div className="flex-none px-4 md:px-10 pt-4 border-b border-white/[0.05]" style={{ background: "#16120f" }}>
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 font-ui text-[12px] uppercase tracking-[0.12em] transition-colors",
                  active ? "text-gold" : "text-text-muted hover:text-text-sec"
                )}>
                <Icon size={13} />
                {label}
                {active && (
                  <motion.div layoutId="identita-tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "#16120f" }}>

        {/* Empty state condiviso */}
        {!booksLoading && totalBooks === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
            <Sparkles size={36} className="text-gold/40" />
            <p className="font-display text-xl text-text-muted">Aggiungi libri alla tua libreria</p>
            <p className="font-ui text-sm text-text-muted">Il tuo profilo si genera automaticamente dai tuoi libri</p>
          </div>
        ) : (
          <>
            {/* ════════ TAB PROFILO ════════ */}
            {tab === "profilo" && (
              <>
                {(booksLoading || generating || !profileLoaded) && !archetype ? (
                  <IdentitaSkeleton />
                ) : profileError && !archetype ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <p className="font-ui text-sm text-red-400">{profileError}</p>
                    <button onClick={generateProfile}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 border border-gold/20 text-gold font-ui text-sm hover:bg-gold/15 transition-colors">
                      <RefreshCw size={13} /> Riprova
                    </button>
                  </div>
                ) : (
                  <div className="max-w-[760px] mx-auto px-6 md:px-10 py-12">
                    {/* Hero archetipo */}
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
                      <p className="font-ui text-[11px] uppercase tracking-[0.35em] text-text-muted mb-6">Il tuo profilo del lettore</p>
                      {archetype ? (
                        <>
                          <div className="font-display font-bold leading-none mb-4"
                            style={{ fontSize: "clamp(48px, 8vw, 72px)", color: "#d4a15e", letterSpacing: "-0.02em", textShadow: "0 0 60px rgba(212,161,94,0.18)" }}>
                            {archetype.name}
                          </div>
                          <p className="font-body text-[13px] italic max-w-[480px] mx-auto leading-relaxed" style={{ color: "rgba(168,138,106,0.70)" }}>
                            &laquo;{archetype.motto}&raquo;
                          </p>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-6">
                          <Loader2 size={28} className="text-gold animate-spin" />
                          <p className="font-ui text-sm text-text-muted">Analisi in corso…</p>
                        </div>
                      )}
                    </motion.div>

                    {/* Stats strip */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                      className="grid grid-cols-4 gap-0 mb-10 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
                      {stats.map((stat, i) => (
                        <div key={stat.label} className="py-5 text-center"
                          style={{ background: "rgba(255,255,255,0.02)", borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <div className="font-display font-semibold text-[26px] leading-none mb-1" style={{ color: "#d4a15e" }}>{stat.value}</div>
                          <div className="font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted">{stat.label}</div>
                        </div>
                      ))}
                    </motion.div>

                    {/* Reading DNA */}
                    {ci.topGenres.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mb-10">
                        <div className="mb-5">
                          <h2 className="font-display text-[18px] font-semibold text-text-warm">Il tuo DNA di lettura</h2>
                          <p className="font-ui text-[12px] text-text-muted mt-0.5">Cosa leggi davvero, in numeri — su {ci.readBooks} libri completati</p>
                        </div>
                        <div className="space-y-4">
                          {ci.topGenres.map((genre, i) => {
                            const pct = Math.round((genre.count / dnaTotal) * 100);
                            const color = GENRE_PALETTE[i % GENRE_PALETTE.length];
                            return (
                              <div key={genre.name}>
                                <div className="flex justify-between items-baseline mb-2">
                                  <span className="font-ui text-[12px] font-medium text-text-sec">{genre.name}</span>
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-ui text-[12px] text-text-muted">{genre.count} libri</span>
                                    <span className="font-ui text-[13px] font-semibold tabular-nums w-[36px] text-right" style={{ color }}>{pct}%</span>
                                  </div>
                                </div>
                                <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                    className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Autori più letti */}
                    {ci.topAuthors.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="mb-10">
                        <h3 className="font-ui text-[11px] uppercase tracking-[0.25em] text-text-muted mb-4">Autori più letti</h3>
                        <div className="flex flex-wrap gap-2">
                          {ci.topAuthors.map(a => (
                            <span key={a} className="font-ui text-[12px] px-3 py-1.5 rounded-full"
                              style={{ background: "rgba(212,161,94,0.06)", border: "1px solid rgba(212,161,94,0.14)", color: "rgba(201,168,122,0.85)" }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Chi sei diventato */}
                    {archetype && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.26 }}
                        className="mb-10 p-7 rounded-lg relative overflow-hidden"
                        style={{ background: "rgba(212,161,94,0.04)", border: "1px solid rgba(212,161,94,0.12)" }}>
                        <div className="absolute top-3 left-5 font-display leading-none select-none pointer-events-none" style={{ fontSize: "72px", color: "rgba(212,161,94,0.06)" }}>&laquo;</div>
                        <h2 className="font-ui text-[11px] uppercase tracking-[0.25em] text-text-muted mb-4 relative z-10">Chi sei diventato</h2>
                        <p className="font-body text-[15px] leading-[1.9] relative z-10" style={{ color: "rgba(201,168,122,0.82)" }}>{archetype.description}</p>
                      </motion.div>
                    )}

                    {/* Strengths & Blind spots */}
                    {archetype && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div>
                          <h3 className="font-ui text-[11px] uppercase tracking-[0.25em] text-text-muted mb-4">I tuoi punti di forza</h3>
                          <div className="space-y-3">
                            {archetype.strengths.map((s, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className="mt-[3px] w-[14px] h-[14px] rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(61,122,90,0.18)", border: "1px solid rgba(61,122,90,0.35)" }}>
                                  <div className="w-[5px] h-[5px] rounded-full" style={{ background: "#3D7A5A" }} />
                                </div>
                                <span className="font-ui text-[12px] text-text-tert leading-snug">{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-ui text-[11px] uppercase tracking-[0.25em] text-text-muted mb-4">Le zone d&apos;ombra</h3>
                          <div className="space-y-3">
                            {archetype.blind_spots.map((b, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <div className="mt-[3px] w-[14px] h-[14px] rounded-full shrink-0 flex items-center justify-center" style={{ background: "rgba(122,96,80,0.12)", border: "1px solid rgba(122,96,80,0.25)" }}>
                                  <div className="w-[5px] h-[5px] rounded-full" style={{ background: "#7a6050" }} />
                                </div>
                                <span className="font-ui text-[12px] text-text-muted leading-snug">{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Rigenera */}
                    <div className="flex flex-col items-center gap-2 pb-4">
                      <button onClick={generateProfile} disabled={generating}
                        className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl border font-ui text-[12px] transition-all",
                          generating ? "border-white/10 text-text-muted cursor-not-allowed" : "border-gold/20 text-gold hover:bg-gold/5 hover:border-gold/35")}>
                        {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        {generating ? "Analisi in corso…" : "Rigenera profilo"}
                      </button>
                      <p className="font-ui text-[11px] text-text-muted">Si aggiorna in automatico ogni mese</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ════════ TAB INSIGHTS ════════ */}
            {tab === "insights" && (
              <div className="max-w-[860px] mx-auto px-4 md:px-10 py-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gold/10 border border-gold/20"><Sparkles size={16} className="text-gold" /></div>
                    <div>
                      <h1 className="font-display text-xl font-semibold text-text-warm">AI Insights</h1>
                      <p className="font-ui text-xs text-text-muted">Analisi personalizzata · Powered by GPT-4o</p>
                    </div>
                  </div>
                  <button onClick={loadInsights} disabled={insightsLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] bg-surface-2 font-ui text-xs text-text-muted hover:text-text-warm transition-colors disabled:opacity-50">
                    <RefreshCw size={12} className={insightsLoading ? "animate-spin" : ""} />
                    Aggiorna analisi
                  </button>
                </div>

                <div className="space-y-4">
                  {insightsLoading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Sparkles size={28} className="text-gold animate-pulse" />
                      <div className="text-center">
                        <p className="font-display text-base italic text-text-sec">GPT sta analizzando i tuoi {ci.totalBooks} libri…</p>
                        <p className="font-ui text-[11px] text-text-muted mt-1">Un momento, stiamo elaborando il tuo profilo di lettore</p>
                      </div>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-full h-16 rounded-xl border border-white/[0.04] bg-surface-2 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}

                  {insightsError && !insightsLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <p className="font-ui text-sm text-red-400">{insightsError}</p>
                      <button onClick={loadInsights} className="font-ui text-xs text-gold hover:underline">Riprova</button>
                    </div>
                  )}

                  {!insightsLoading && !insightsError && insights.map((insight, i) => {
                    const meta = TYPE_META[insight.type] ?? TYPE_META.profile;
                    const Icon = meta.icon;
                    const isExpanded = activeInsight === insight.id;
                    return (
                      <motion.div key={insight.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                        className={cn("rounded-xl border bg-gradient-to-br overflow-hidden cursor-pointer", meta.accent)}
                        onClick={() => setActiveInsight(isExpanded ? null : insight.id)}>
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-black/10 shrink-0 mt-0.5"><Icon size={14} className="text-text-warm" /></div>
                              <div>
                                <p className="font-display font-semibold text-[15px] text-text-warm">{insight.title}</p>
                                <AnimatePresence>
                                  {!isExpanded && (
                                    <motion.p initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-ui text-[12px] text-text-sec mt-1 line-clamp-2">
                                      {insight.body.replace(/\*\*/g, "")}
                                    </motion.p>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <ChevronRight size={14} className={cn("text-text-muted transition-transform shrink-0 mt-1", isExpanded && "rotate-90")} />
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <p className="font-ui text-[13px] text-text-sec leading-relaxed mt-4 pt-4 border-t border-white/[0.06]">
                                  {insight.body.split("**").map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-text-warm font-semibold">{part}</strong> : part)}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Stats summary */}
                  {!insightsLoading && !insightsError && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      {[
                        { label: "Libri analizzati", value: String(ci.totalBooks), icon: BookOpen },
                        { label: "Rating medio",     value: String(ci.avgRating),  icon: Star },
                        { label: "Generi esplorati", value: String(context.insights.topGenres.length), icon: TrendingUp },
                        { label: "Ore di lettura",   value: `~${context.insights.estHours}`, icon: Target },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-surface-2 rounded-xl p-4 border border-white/[0.06] text-center">
                          <Icon size={14} className="text-text-muted mx-auto mb-2" />
                          <p className="font-mono text-xl font-bold text-gold">{value}</p>
                          <p className="font-ui text-[12px] text-text-muted mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════ TAB CHAT ════════ */}
            {tab === "chat" && (
              <div className="max-w-[720px] mx-auto px-4 md:px-8 py-8 h-full">
                <div className="flex flex-col bg-surface-2 rounded-2xl border border-white/[0.06] overflow-hidden h-[calc(100%-1rem)] min-h-[460px]">
                  <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
                    <MessageSquare size={14} className="text-gold" />
                    <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Chatta con GPT</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="space-y-3">
                        <p className="font-ui text-[12px] text-text-muted text-center py-4">Fai una domanda sulla tua libreria</p>
                        {QUICK_QUESTIONS.map((q, i) => (
                          <button key={i} onClick={() => sendMessage(q)}
                            className="w-full text-left bg-surface-3 rounded-lg px-3 py-2.5 font-ui text-[12px] text-text-sec hover:text-text-warm hover:bg-surface-3/80 transition-colors border border-white/[0.04] hover:border-white/[0.08]">
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => (
                        <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[85%] rounded-xl px-3 py-2.5 font-ui text-[12px] leading-relaxed",
                            msg.role === "user" ? "bg-gold/15 text-text-warm border border-gold/20 rounded-br-sm" : "bg-surface-3 text-text-sec border border-white/[0.04] rounded-bl-sm")}>
                            {msg.content.split("**").map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-text-warm">{part}</strong> : part)}
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="flex items-center gap-2 bg-surface-3 rounded-xl rounded-bl-sm border border-white/[0.04] px-3 py-2.5 w-fit">
                        <div className="flex gap-1">
                          {[0, 0.2, 0.4].map(d => (
                            <motion.div key={d} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} className="w-1.5 h-1.5 rounded-full bg-gold/60" />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  <div className="p-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 bg-surface-3 rounded-xl border border-white/[0.06] px-3 py-2 focus-within:border-gold/30">
                      <input value={inputValue} onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage(inputValue)}
                        placeholder="Chiedi qualcosa…"
                        className="flex-1 bg-transparent font-ui text-[12px] text-text-warm placeholder:text-text-muted focus:outline-none" />
                      <button onClick={() => sendMessage(inputValue)} disabled={!inputValue.trim() || chatLoading}
                        className="p-1 rounded-lg text-text-muted hover:text-gold disabled:opacity-30 transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    <p className="font-ui text-[12px] text-text-muted mt-1.5 text-center opacity-60">Powered by GPT-4o mini · Vibrazioni AI</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
