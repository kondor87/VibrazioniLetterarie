"use client";

import { BookOpen } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AnalyticsView } from "@/components/dashboard/AnalyticsView";
import { useReadingStats } from "@/lib/hooks/useReadingStats";

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 h-[104px]" />
        ))}
      </div>
      {/* Goal + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-surface-2 h-[156px]" />
        <div className="rounded-xl border border-white/[0.06] bg-surface-2 h-[156px] lg:col-span-2" />
      </div>
      {/* Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-surface-2 h-[280px] lg:col-span-2" />
        <div className="rounded-xl border border-white/[0.06] bg-surface-2 h-[280px]" />
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-4 max-w-sm mx-auto">
      <div className="w-16 h-24 rounded bg-surface-3 border border-white/[0.06] flex items-center justify-center shadow-book">
        <BookOpen size={26} className="text-gold/40" />
      </div>
      <p className="font-display text-2xl italic text-text-warm">Ancora nessun dato da raccontare</p>
      <p className="font-ui text-sm text-text-tert leading-relaxed">
        Aggiungi e segna come letti i tuoi libri: qui prenderanno forma i grafici del tuo percorso di lettore.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, loading, totalBooks } = useReadingStats();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : totalBooks === 0 ? (
          <EmptyDashboard />
        ) : (
          <AnalyticsView stats={stats} />
        )}
      </div>
    </div>
  );
}
