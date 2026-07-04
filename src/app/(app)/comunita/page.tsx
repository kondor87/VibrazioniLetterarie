"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, Flame, BookmarkX, BookOpen, Loader2, Search, Star, Zap, type LucideIcon } from "lucide-react";
import type { CommunityLeaderboards, LeaderboardEntry, CommunitySearchResult } from "@/lib/community";
import { AffinityShelf } from "@/components/community/AffinityShelf";

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

export default function ComunitaPage() {
  const [data, setData] = useState<CommunityLeaderboards | null>(null);
  const [loading, setLoading] = useState(true);

  // Ricerca community
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunitySearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounced = useDebounce(query.trim(), 300);

  useEffect(() => {
    let active = true;
    fetch("/api/community/leaderboards")
      .then(r => r.json())
      .then(d => { if (active) setData(d as CommunityLeaderboards); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (debounced.length < 2) { setResults(null); return; }
    let active = true;
    setSearching(true);
    fetch(`/api/community/search?q=${encodeURIComponent(debounced)}`)
      .then(r => r.json())
      .then(d => { if (active) setResults((d.results ?? []) as CommunitySearchResult[]); })
      .catch(() => { if (active) setResults([]); })
      .finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [debounced]);

  const empty = data &&
    data.most_added.length === 0 &&
    data.most_devoured.length === 0 &&
    data.most_abandoned.length === 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-void">
      <div className="w-full max-w-5xl mx-auto px-8 py-10 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-ui text-[11px] uppercase tracking-[0.2em] text-gold/60 flex items-center gap-1.5 mb-2">
            <Users size={12} /> La comunità di Vibrazioni
          </p>
          <h1 className="font-display text-3xl font-semibold text-text-warm leading-tight">
            L&apos;intelligenza collettiva dei lettori
          </h1>
          <p className="font-body text-[15px] text-text-sec mt-2 max-w-2xl leading-relaxed">
            Non stelline, ma <span className="text-text-warm">comportamenti</span>: cosa la comunità divora,
            cosa abbandona, cosa sta leggendo proprio ora. Tutto in forma anonima e aggregata.
          </p>
          {data && (
            <p className="font-ui text-[12px] text-text-muted mt-3">
              {data.books_tracked} libri tracciati dalla comunità
            </p>
          )}
        </motion.div>

        {/* Ricerca community */}
        <div className="relative">
          <div className="flex items-center gap-2.5 px-4 h-12 rounded-xl border border-white/[0.08] bg-surface-2 focus-within:border-gold/40 transition-colors">
            {searching
              ? <Loader2 size={16} className="text-gold animate-spin shrink-0" />
              : <Search size={16} className="text-text-muted shrink-0" />}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca un libro nella community — com'è il suo comportamento?"
              className="flex-1 bg-transparent font-ui text-sm text-text-warm placeholder:text-text-muted outline-none"
            />
          </div>
        </div>

        {/* Risultati ricerca (sostituiscono le classifiche mentre cerchi) */}
        <AnimatePresence mode="wait">
          {results !== null && (
            <motion.div key="search" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-2">
              {results.length === 0 ? (
                <p className="font-body text-[14px] italic text-text-muted py-8 text-center">
                  {searching ? "Cerco…" : `Nessun libro tracciato dalla community corrisponde a “${debounced}”. Forse sei tra i primi a leggerlo.`}
                </p>
              ) : (
                results.map(r => <SearchRow key={r.book_id} r={r} />)
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anime gemelle di lettura (personale, nascosto durante la ricerca) */}
        {results === null && <AffinityShelf />}

        {loading && results === null && (
          <div className="flex items-center gap-3 text-text-muted py-20 justify-center">
            <Loader2 size={20} className="animate-spin text-gold" />
            <span className="font-ui text-sm">Raccolgo le vibrazioni…</span>
          </div>
        )}

        {empty && !loading && results === null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl px-6 py-10 text-center"
            style={{ background: "rgba(212,161,94,0.04)", border: "1px solid rgba(212,161,94,0.12)" }}>
            <BookOpen size={32} className="text-gold/30 mx-auto mb-3" />
            <p className="font-display text-xl italic text-text-sec">La comunità sta nascendo</p>
            <p className="font-body text-[14px] text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Le classifiche prendono vita quando più lettori condividono gli stessi libri.
              Ogni libro che leggi e voti contribuisce alle vibrazioni collettive.
            </p>
          </motion.div>
        )}

        {data && !empty && !loading && results === null && (
          <div className="grid md:grid-cols-3 gap-5">
            <Board title="Più aggiunti" subtitle="Ultimi 7 giorni" icon={TrendingUp}
              accent="#d4a15e" entries={data.most_added} />
            <Board title="Most devoured" subtitle="Divorati più in fretta" icon={Flame}
              accent="#e8896a" entries={data.most_devoured} />
            <Board title="Più abbandonati" subtitle="Il cimitero dei segnalibri" icon={BookmarkX}
              accent="#8a8a9a" entries={data.most_abandoned} />
          </div>
        )}
      </div>
    </div>
  );
}

function SearchRow({ r }: { r: CommunitySearchResult }) {
  const abandonPct = r.abandon_rate != null ? Math.round(r.abandon_rate * 100) : null;
  return (
    <Link href={`/comunita/${r.book_id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.06] bg-surface-2 hover:border-gold/30 hover:bg-surface-3 transition-all group">
      <div className="w-10 h-15 rounded-sm overflow-hidden shrink-0 bg-surface-3 flex items-center justify-center" style={{ height: 60 }}>
        {r.cover_url
          ? <Image src={r.cover_url} alt={r.title} width={40} height={60} className="w-full h-full object-cover" />
          : <BookOpen size={14} className="text-text-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[15px] font-medium text-text-warm truncate leading-snug">{r.title}</p>
        <p className="font-ui text-[12px] text-text-tert truncate">{r.authors.join(", ")}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Users size={10} className="text-text-muted" />
          <span className="font-ui text-[11px] text-text-muted">{r.readers} lettori</span>
          {r.reading_now > 0 && <span className="font-ui text-[11px] text-amber/80">· {r.reading_now} ora</span>}
        </div>
      </div>
      <div className="flex items-center gap-5 shrink-0">
        {r.avg_rating != null && (
          <Stat icon={Star} color="#d4a15e" value={r.avg_rating.toFixed(1)} unit="/10" />
        )}
        {r.avg_days_to_finish != null && (
          <Stat icon={Zap} color="#e8896a" value={String(Math.round(r.avg_days_to_finish))} unit="gg" />
        )}
        {abandonPct != null && abandonPct > 0 && (
          <Stat icon={BookmarkX} color="#8a8a9a" value={`${abandonPct}%`} unit="" />
        )}
      </div>
    </Link>
  );
}

function Stat({ icon: Icon, color, value, unit }: { icon: LucideIcon; color: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[44px]">
      <Icon size={12} style={{ color }} />
      <span className="font-mono text-[13px]" style={{ color }}>{value}<span className="text-text-muted text-[10px]">{unit}</span></span>
    </div>
  );
}

function Board({ title, subtitle, icon: Icon, accent, entries }: {
  title: string; subtitle: string;
  icon: LucideIcon;
  accent: string; entries: LeaderboardEntry[];
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-xl border border-white/[0.06] bg-surface-2 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <p className="font-display text-[15px] font-semibold text-text-warm flex items-center gap-2">
          <Icon size={15} style={{ color: accent }} /> {title}
        </p>
        <p className="font-ui text-[11px] uppercase tracking-wider text-text-muted mt-0.5">{subtitle}</p>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-8 font-body text-[13px] italic text-text-muted text-center">
          Ancora pochi dati
        </p>
      ) : (
        <ol className="divide-y divide-white/[0.04]">
          {entries.map((e, i) => (
            <li key={e.book_id}>
              <Link href={`/comunita/${e.book_id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-3 transition-colors group">
                <span className="font-mono text-[13px] w-4 shrink-0 text-text-muted">{i + 1}</span>
                <div className="w-7 h-10 rounded-sm overflow-hidden shrink-0 bg-surface-3 flex items-center justify-center">
                  {e.cover_url
                    ? <Image src={e.cover_url} alt={e.title} width={28} height={40} className="w-full h-full object-cover" />
                    : <BookOpen size={11} className="text-text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[13px] font-medium text-text-warm truncate leading-snug group-hover:text-gold transition-colors">{e.title}</p>
                  <p className="font-ui text-[11px] text-text-tert truncate">{e.authors.join(", ")}</p>
                </div>
                <span className="font-mono text-[12px] shrink-0" style={{ color: accent }}>{e.label}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </motion.div>
  );
}
