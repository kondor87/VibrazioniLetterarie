"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Zap, BookmarkX, Star, BookOpen, Gauge, type LucideIcon } from "lucide-react";
import type { CommunityBookStat } from "@/lib/community";

export function CommunityBookPanel({ bookId, myRating, myPpd }: {
  bookId: string; myRating: number | null; myPpd: number | null;
}) {
  const [stat, setStat] = useState<CommunityBookStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    let active = true;
    setLoading(true);
    const qs = `bookId=${encodeURIComponent(bookId)}${myPpd ? `&myPpd=${myPpd.toFixed(2)}` : ""}`;
    fetch(`/api/community/book?${qs}`)
      .then(r => r.json())
      .then(d => { if (active) setStat(d as CommunityBookStat); })
      .catch(() => { if (active) setStat(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookId, myPpd]);

  if (loading || !stat) return null;

  const title = (
    <p className="font-ui text-[11px] uppercase tracking-widest mb-3 flex items-center gap-1.5"
       style={{ color: "rgba(212,161,94,0.6)" }}>
      <Users size={11} /> Le vibrazioni della community
    </p>
  );

  // Cold start: pochi lettori → niente numeri (k-anonimato), invito a esserci
  if (!stat.enough) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
        className="rounded-xl px-5 py-4"
        style={{ background: "rgba(212,161,94,0.04)", border: "1px solid rgba(212,161,94,0.12)" }}>
        {title}
        <p className="font-body italic text-[14px] leading-relaxed text-text-sec">
          {stat.readers <= 1
            ? "Sei tra i primi a custodire questo libro su Vibrazioni. Le statistiche della community appariranno quando altri lettori lo aggiungeranno."
            : `Ancora pochi lettori (${stat.readers}) per dire qualcosa di significativo. Presto le vibrazioni di questo libro prenderanno forma.`}
        </p>
      </motion.div>
    );
  }

  const days = stat.avg_days_to_finish;
  const abandonPct = stat.abandon_rate != null ? Math.round(stat.abandon_rate * 100) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
      className="rounded-xl px-5 py-4"
      style={{ background: "rgba(212,161,94,0.05)", border: "1px solid rgba(212,161,94,0.14)" }}>
      {title}

      <div className="flex flex-wrap items-stretch gap-x-8 gap-y-4">
        {/* Voto: mio vs community */}
        {stat.avg_rating != null && (
          <Metric icon={Star} label={`Voto community · ${stat.rating_count} voti`}>
            <span className="font-mono text-[18px] text-gold">{stat.avg_rating.toFixed(1)}</span>
            <span className="font-mono text-[12px] text-text-muted">/10</span>
            {myRating != null && (
              <span className="font-ui text-[11px] text-text-muted ml-2">
                (il tuo {myRating})
              </span>
            )}
          </Metric>
        )}

        {/* Velocità media di completamento */}
        {days != null && (
          <Metric icon={Zap} label="Tempo medio">
            <span className="font-mono text-[18px] text-amber">{Math.round(days)}</span>
            <span className="font-ui text-[12px] text-text-muted ml-1">giorni</span>
          </Metric>
        )}

        {/* Tasso di abbandono */}
        {abandonPct != null && abandonPct > 0 && (
          <Metric icon={BookmarkX} label="Lo abbandona">
            <span className="font-mono text-[18px] text-text-sec">{abandonPct}%</span>
          </Metric>
        )}

        {/* Lettori / chi lo sta leggendo ora */}
        <Metric icon={stat.reading_now > 0 ? BookOpen : Users} label={stat.reading_now > 0 ? "Lo sta leggendo ora" : "Lettori"}>
          <span className="font-mono text-[18px] text-text-warm">
            {stat.reading_now > 0 ? stat.reading_now : stat.readers}
          </span>
          {stat.reading_now > 0 && (
            <span className="font-ui text-[11px] text-text-muted ml-2">({stat.readers} in tutto)</span>
          )}
        </Metric>
      </div>

      {/* Percentile personale di velocità */}
      {stat.velocity_percentile != null && (
        <div className="mt-4 pt-3 border-t border-gold/10 flex items-center gap-2">
          <Gauge size={14} className="text-amber shrink-0" />
          <p className="font-body text-[14px] leading-snug text-text-warm">
            {stat.velocity_percentile >= 50
              ? <>Hai <span className="text-amber font-semibold">divorato</span> questo libro più in fretta del{" "}
                  <span className="font-mono text-amber">{stat.velocity_percentile}%</span> dei lettori.</>
              : <>L&apos;hai assaporato con calma: più lento del{" "}
                  <span className="font-mono text-text-sec">{100 - stat.velocity_percentile}%</span> dei lettori.</>}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function Metric({ icon: Icon, label, children }: {
  icon: LucideIcon;
  label: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="font-ui text-[10px] uppercase tracking-wider text-text-muted flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <div className="flex items-baseline">{children}</div>
    </div>
  );
}
