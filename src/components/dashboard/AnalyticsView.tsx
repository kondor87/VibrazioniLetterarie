"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from "recharts";
import {
  BookOpen, FileText, Star, Zap, Award, Clock, TrendingUp,
  Calendar, Flame,
} from "lucide-react";
import { StatCard } from "./StatCard";
import {
  BooksPerYearChart, PagesPerMonthChart,
  GenreDonutChart, ReadingSpeedSparkline,
} from "./ReadingCharts";
import { GoalProgress } from "./GoalProgress";
import { TopBooks } from "./TopBooks";
import type { ReadingStats } from "@/lib/hooks/useReadingStats";

const axisStyle = { fill: "#8A6040", fontSize: 11, fontFamily: "var(--font-ui)" };

function ChartTooltip({ active, payload, label, unit = "" }: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-gold/20 rounded-lg px-3 py-2 shadow-panel text-xs font-ui">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-gold font-mono font-medium">{p.value}{unit}</p>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted mb-4">{children}</p>;
}

function RecordRow({ icon: Icon, label, value }: { icon: typeof Award; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 rounded-lg bg-surface-3 shrink-0">
        <Icon size={12} className="text-gold" />
      </div>
      <div className="min-w-0">
        <p className="font-ui text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
        <p className="font-ui text-[12px] text-text-warm truncate">{value}</p>
      </div>
    </div>
  );
}

/**
 * Vista analitica completa (KPI, grafici, generi, traguardi).
 * Estratta dalla vecchia Dashboard — ora accessibile on-demand da "La mia stanza".
 */
export function AnalyticsView({ stats: s }: { stats: ReadingStats }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      {/* KPI row (5) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Libri letti"    value={s.totalRead}                       icon={BookOpen} accent delay={0}    />
        <StatCard label="Pagine totali"  value={s.totalPages.toLocaleString("it")} icon={FileText}        delay={0.05} />
        <StatCard label="Media voti"     value={s.avgRating}                       icon={Star}            delay={0.1}  />
        <StatCard label="Velocità media" value={s.avgSpeed} sub="pagine/giorno"    icon={Zap}             delay={0.15} />
        <StatCard label="Costanza" value={s.maxStreak} sub={s.maxStreak === 1 ? "mese di fila" : "mesi di fila a leggere"} icon={Flame} delay={0.2} />
      </div>

      {/* Goal + Libri/anno */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GoalProgress current={s.booksThisYear} goal={24} year={currentYear} />
        <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 lg:col-span-2">
          <SectionLabel>Libri letti per anno</SectionLabel>
          <BooksPerYearChart data={s.booksPerYear} />
        </div>
      </div>

      {/* Pagine/mese + Generi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 lg:col-span-2">
          <SectionLabel>Pagine lette per mese</SectionLabel>
          <PagesPerMonthChart data={s.pagesPerMonth} />
        </div>
        <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2">
          <SectionLabel>Distribuzione generi</SectionLabel>
          <GenreDonutChart data={s.genreData} />
        </div>
      </div>

      {/* Timeline trimestrale + Stagionalità */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-surface-2 rounded-xl p-5 border border-white/[0.06]">
          <SectionLabel>Timeline di lettura (per trimestre)</SectionLabel>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <AreaChart data={s.timelineQuarterly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C89010" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C89010" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="quarter" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit=" libri" />} />
                <Area type="monotone" dataKey="libri" stroke="#C89010" strokeWidth={2}
                  fill="url(#tl)" dot={{ fill: "#C89010", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-2 bg-surface-2 rounded-xl p-5 border border-white/[0.06]">
          <SectionLabel>Stagionalità di lettura</SectionLabel>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <RadarChart data={s.radarData} cx="50%" cy="50%">
                <PolarGrid stroke="rgba(200,144,16,0.1)" />
                <PolarAngleAxis dataKey="month" tick={{ fill: "#8A6040", fontSize: 9, fontFamily: "var(--font-ui)" }} />
                <Radar name="Libri" dataKey="libri" stroke="#C89010" fill="#C89010" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribuzione voti + Formato */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-surface-2 rounded-xl p-5 border border-white/[0.06]">
          <SectionLabel>Distribuzione voti</SectionLabel>
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={s.ratingData} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis dataKey="voto" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit=" libri" />} />
                <Bar dataKey="count" fill="#C89010" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-2 bg-surface-2 rounded-xl p-5 border border-white/[0.06]">
          <SectionLabel>Formato preferito</SectionLabel>
          <div className="space-y-3">
            {s.formatData.map(({ format, count }) => (
              <div key={format}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-ui text-[12px] text-text-sec capitalize">{format}</span>
                  <span className="font-mono text-[12px] text-gold">{count}</span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${s.totalLibrary ? (count / s.totalLibrary) * 100 : 0}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-gold to-amber" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top libri + Record + Velocità */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopBooks books={s.topRated} title="Libri con voto più alto" />

        <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 space-y-4">
          <SectionLabel>Record personali</SectionLabel>
          <RecordRow icon={Award} label="Libro più lungo"
            value={s.longestBook ? `${s.longestBook.title} · ${s.longestBook.page_count} pag.` : "—"} />
          <RecordRow icon={Zap} label="Letto più in fretta"
            value={s.fastestRead ? `${s.fastestRead.title} · ${s.fastestRead.days} gg` : "—"} />
          <RecordRow icon={Clock} label="Anno più prolifico"
            value={s.bestYearEntry ? `${s.bestYearEntry[0]} · ${s.bestYearEntry[1]} libri` : "—"} />
          <RecordRow icon={TrendingUp} label="Genere dominante"
            value={s.topGenre ? `${s.topGenre[0]} · ${s.topGenre[1]} libri` : "—"} />
        </div>

        <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">Velocità lettura</p>
            <span className="font-mono text-gold text-xl font-medium">
              {s.avgSpeed} <span className="font-ui text-[11px] text-text-muted">p/g</span>
            </span>
          </div>
          <ReadingSpeedSparkline data={s.speedData} />
          <p className="font-ui text-[11px] text-text-muted">Pagine/giorno per ogni libro completato</p>
        </div>
      </div>

      {/* Distribuzione generi (cards cliccabili) */}
      {s.genres.length > 0 && (
        <div>
          <SectionLabel>Distribuzione generi · clicca per filtrare</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {s.genres.map((genre, i) => (
              <motion.button key={genre.name}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                onClick={() => router.push(`/libri?genere=${encodeURIComponent(genre.name)}`)}
                className="relative rounded-xl p-4 border border-white/[0.05] overflow-hidden group hover:border-white/10 transition-colors cursor-pointer text-left"
                style={{ background: `${genre.color}18` }}>
                <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl" style={{ background: genre.color }} />
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display font-semibold text-[15px] text-text-warm group-hover:text-gold transition-colors">{genre.name}</h3>
                  <span className="font-mono text-2xl font-bold" style={{ color: genre.color }}>{genre.count}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-[12px] text-text-muted">Pagine totali</span>
                    <span className="font-mono text-[11px] text-text-sec">{genre.pages.toLocaleString("it")}</span>
                  </div>
                  {genre.avgRating && (
                    <div className="flex items-center justify-between">
                      <span className="font-ui text-[12px] text-text-muted">Media voto</span>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber" fill="currentColor" />
                        <span className="font-mono text-[11px] text-gold">{genre.avgRating}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 h-1 bg-black/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${genre.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                    className="h-full rounded-full" style={{ background: genre.color }} />
                </div>
                {genre.topBook && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <BookOpen size={10} className="text-text-muted shrink-0" />
                    <span className="font-ui text-[12px] text-text-muted truncate">{genre.topBook.title}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Traguardi */}
      <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2">
        <SectionLabel>Traguardi raggiunti</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Award, label: "Primo libro letto", value: s.firstBook?.title ?? "—", sub: s.firstBook?.started_at?.slice(0, 4) ?? "" },
            { icon: Star,  label: "Libro più votato",  value: s.topRatedTitles || "—", sub: `${s.maxRating}/10` },
            { icon: BookOpen, label: "Autore più letto", value: s.topAuthor?.[0].split(" ").pop() ?? "—", sub: `${s.topAuthor?.[1] ?? 0} libri letti` },
            { icon: Clock, label: "Lettura più lunga", value: s.longestReadBook ? s.longestReadBook.title.split(" ").slice(0, 3).join(" ") : "—", sub: s.longestReadBook ? `${s.longestReadBook.days} giorni` : "" },
            { icon: Calendar, label: "Mese più attivo", value: s.busyMonth?.month ?? "—", sub: `${s.busyMonth?.libri ?? 0} libri completati` },
            { icon: TrendingUp, label: "Libreria in crescita", value: `${s.totalRead} libri`, sub: `dal ${s.firstBook?.started_at?.slice(0, 4) ?? "—"} ad oggi` },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="flex items-start gap-3 bg-surface-3 rounded-lg p-3">
              <div className="p-1.5 rounded-lg bg-surface-1 shrink-0">
                <Icon size={11} className="text-gold" />
              </div>
              <div className="min-w-0">
                <p className="font-ui text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
                <p className="font-ui text-[12px] text-text-warm font-medium truncate">{value}</p>
                <p className="font-ui text-[12px] text-text-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
