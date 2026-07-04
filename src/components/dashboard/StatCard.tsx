"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: boolean;
  delay?: number;
}

export function StatCard({ label, value, sub, icon: Icon, accent, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative rounded-xl p-5 border overflow-hidden",
        "bg-surface-2 border-white/[0.06] transition-colors duration-200",
        "hover:border-gold/25",
        accent && "border-gold/20"
      )}
    >
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent pointer-events-none" />
      )}
      {/* glow caldo all'hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(212,161,94,0.06) 0%, transparent 55%)" }} />

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <p className="font-ui text-[11px] uppercase tracking-widest text-text-muted">{label}</p>
        <div className={cn(
          "p-1.5 rounded-lg transition-colors duration-200",
          accent ? "bg-gold/15 text-gold" : "bg-surface-3 text-text-tert group-hover:text-gold/70"
        )}>
          <Icon size={14} />
        </div>
      </div>

      <p className={cn(
        "relative font-mono text-3xl font-medium leading-none",
        accent ? "text-gold" : "text-text-warm"
      )}>
        {value}
      </p>

      {sub && (
        <p className="relative mt-1.5 font-ui text-[11px] text-text-muted truncate">{sub}</p>
      )}
    </motion.div>
  );
}
