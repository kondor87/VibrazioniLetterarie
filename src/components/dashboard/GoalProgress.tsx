"use client";

import { motion } from "framer-motion";
import { Target } from "lucide-react";

interface GoalProgressProps {
  current: number;
  goal: number;
  year: number;
}

export function GoalProgress({ current, goal, year }: GoalProgressProps) {
  const pct = Math.min((current / goal) * 100, 100);
  const onTrack = current >= Math.floor((new Date().getMonth() + 1) / 12 * goal);

  return (
    <div className="rounded-xl p-5 border border-white/[0.06] bg-surface-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-gold" />
          <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
            Obiettivo {year}
          </p>
        </div>
        <span className={`font-ui text-[11px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full ${
          onTrack ? "text-green-400 bg-green-400/10" : "text-amber bg-amber/10"
        }`}>
          {onTrack ? "In anticipo" : "In ritardo"}
        </span>
      </div>

      {/* Barra progresso */}
      <div className="relative h-2 bg-surface-3 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, #C89010 0%, #E8B040 100%)",
            boxShadow: "0 0 8px rgba(200,144,16,0.4)",
          }}
        />
      </div>

      <div className="flex items-baseline justify-between">
        <p className="font-mono text-2xl font-medium text-gold">
          {current}
          <span className="font-ui text-sm text-text-muted font-normal ml-1">/ {goal} libri</span>
        </p>
        <p className="font-ui text-[11px] text-text-muted">
          {Math.round(pct)}% completato
        </p>
      </div>
    </div>
  );
}
