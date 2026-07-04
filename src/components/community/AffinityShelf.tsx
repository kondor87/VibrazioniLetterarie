"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Star, Users, BookOpen } from "lucide-react";
import type { AffinityResult } from "@/lib/community";
import { MIN_MY_BOOKS } from "@/lib/community";

export function AffinityShelf() {
  const [data, setData] = useState<AffinityResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/community/affinity")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (active) setData(d as AffinityResult); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !data) return null;

  const header = (
    <div className="flex items-center gap-3 mb-1">
      <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-gold/70 whitespace-nowrap flex items-center gap-1.5">
        <Sparkles size={13} /> Le tue anime gemelle di lettura
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
    </div>
  );

  // Cold-start onesto
  if (data.recommendations.length === 0) {
    return (
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        {header}
        <p className="font-body text-[14px] italic text-text-muted leading-relaxed">
          {data.my_books < MIN_MY_BOOKS
            ? "Aggiungi e vota qualche libro in più: troveremo i lettori che vibrano come te."
            : "Ancora nessun lettore con una libreria affine alla tua. Appena la community cresce, qui appariranno i libri amati da chi legge come te."}
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {header}

      {/* Spiegazione: chi sono e perché sono affini */}
      <div className="space-y-1.5 -mt-1">
        <p className="font-body text-[14px] text-text-sec">
          Ho trovato <span className="text-text-warm font-semibold">{data.twins}</span>{" "}
          {data.twins === 1 ? "lettore che legge" : "lettori che leggono"} come te. Hanno amato questi libri, che tu non hai ancora.
        </p>
        {data.shared_sample.length > 0 && (
          <p className="font-ui text-[12px] text-text-muted flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="uppercase tracking-wider text-text-muted/70">Affini perché avete letto:</span>
            {data.shared_sample.map((t, i) => (
              <span key={t} className="text-text-tert">
                {t}{i < data.shared_sample.length - 1 ? " ·" : ""}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {data.recommendations.map(rec => (
          <Link key={rec.book_id} href={`/comunita/${rec.book_id}`}
            className="shrink-0 w-[150px] rounded-xl border border-white/[0.06] bg-surface-2 overflow-hidden
                       hover:border-gold/30 hover:bg-surface-3 transition-all group">
            <div className="relative w-full h-[200px] bg-surface-3 flex items-center justify-center">
              {rec.cover_url
                ? <Image src={rec.cover_url} alt={rec.title} width={150} height={200} className="w-full h-full object-cover" />
                : <BookOpen size={22} className="text-text-muted" />}
              <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm font-mono text-[11px] text-amber">
                <Star size={9} fill="currentColor" /> {rec.avg_twin_rating.toFixed(1)}
              </span>
            </div>
            <div className="p-2.5 space-y-1">
              <p className="font-display text-[13px] font-medium text-text-warm leading-snug line-clamp-2 group-hover:text-gold transition-colors">{rec.title}</p>
              <p className="font-ui text-[11px] text-text-tert truncate">{rec.authors.join(", ")}</p>
              <p className="font-ui text-[11px] text-gold/70 flex items-center gap-1 pt-0.5">
                <Users size={10} /> {rec.twin_count} {rec.twin_count === 1 ? "affine" : "affini"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </motion.section>
  );
}
