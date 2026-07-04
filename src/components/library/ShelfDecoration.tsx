"use client";

import { motion } from "framer-motion";

// ── Globo terrestre ────────────────────────────────────────────────────────────
export function Globe({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginBottom: 3 }}
    >
      {/* Sfera */}
      <div style={{
        width: 32, height: 32,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #4A7A9A 0%, #2A4A6A 45%, #121E30 100%)",
        border: "1px solid rgba(140,190,230,0.18)",
        boxShadow: "0 5px 16px rgba(0,0,0,0.7), 2px 3px 0 rgba(0,0,0,0.35), inset 0 -2px 5px rgba(0,0,0,0.4)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Paralleli */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(180,215,245,0.09) 8px, rgba(180,215,245,0.09) 9px)"
        }} />
        {/* Meridiano */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px",
          background: "rgba(180,215,245,0.10)", transform: "translateX(-50%)"
        }} />
        {/* Continente suggerito */}
        <div style={{
          position: "absolute", top: 8, left: 6, width: 12, height: 8,
          background: "rgba(60,120,60,0.30)", borderRadius: "3px 5px 2px 4px"
        }} />
        {/* Highlight */}
        <div style={{
          position: "absolute", top: 5, left: 8, width: 8, height: 8,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 70%)"
        }} />
      </div>
      {/* Anello supporto */}
      <div style={{
        width: 26, height: 4, marginTop: 2,
        background: "linear-gradient(180deg, #5A3A18 0%, #3A2010 100%)",
        borderRadius: "2px", boxShadow: "0 2px 6px rgba(0,0,0,0.7)"
      }} />
      {/* Piedistallo */}
      <div style={{
        width: 10, height: 9, margin: "0 auto",
        background: "#2A1508", borderRadius: "0 0 4px 4px",
        boxShadow: "0 3px 8px rgba(0,0,0,0.8)"
      }} />
    </motion.div>
  );
}

// ── Candela con fiamma ─────────────────────────────────────────────────────────
export function Candle({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}
    >
      {/* Fiamma */}
      <div style={{
        width: 7, height: 12,
        background: "radial-gradient(ellipse 60% 85% at 50% 65%, rgba(255,220,80,0.95) 0%, rgba(255,140,20,0.75) 55%, transparent 100%)",
        borderRadius: "50% 50% 30% 30%",
        boxShadow: "0 0 10px rgba(255,170,30,0.65), 0 0 24px rgba(255,120,20,0.30), 0 0 40px rgba(200,80,10,0.15)",
        marginBottom: "-1px",
        filter: "blur(0.3px)",
      }} />
      {/* Alone della fiamma */}
      <div style={{
        width: 20, height: 20,
        position: "absolute",
        marginTop: -10,
        background: "radial-gradient(circle, rgba(255,160,30,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Stoppino */}
      <div style={{ width: 1.5, height: 5, background: "#1A0A02", marginBottom: "0px" }} />
      {/* Cera */}
      <div style={{
        width: 13, height: 46,
        background: "linear-gradient(90deg, rgba(245,235,195,0.55) 0%, rgba(255,248,220,0.72) 40%, rgba(245,235,195,0.55) 100%)",
        borderRadius: "2px 2px 1px 1px",
        boxShadow: "0 5px 14px rgba(0,0,0,0.65), inset 1px 0 0 rgba(255,255,255,0.14), inset -1px 0 0 rgba(0,0,0,0.10)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Cera colata */}
        <div style={{
          position: "absolute", top: 5, right: 2, width: 3, height: 14,
          background: "rgba(255,248,220,0.4)", borderRadius: "0 0 3px 3px",
        }} />
        {/* Ombra interna cima */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 6,
          background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 100%)"
        }} />
      </div>
      {/* Piattino */}
      <div style={{
        width: 22, height: 4,
        background: "linear-gradient(180deg, #6A4020 0%, #3A2010 100%)",
        borderRadius: "50%", boxShadow: "0 3px 10px rgba(0,0,0,0.8)"
      }} />
    </motion.div>
  );
}

// ── Pila di libri orizzontali ──────────────────────────────────────────────────
const STACKED_BOOKS = [
  { w: 54, h: 13, color: "#2A5A3A", title: "•••" },
  { w: 46, h: 12, color: "#2A3A7A", title: "" },
  { w: 58, h: 14, color: "#5A2A1A", title: "•••" },
  { w: 50, h: 11, color: "#3A3A1A", title: "" },
];

export function BookStack({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        alignSelf: "flex-end",
        display: "flex", flexDirection: "column", alignItems: "center",
        flexShrink: 0, marginBottom: 4, gap: 1,
      }}
    >
      {STACKED_BOOKS.map((b, i) => (
        <div key={i} style={{
          width: b.w, height: b.h,
          background: `linear-gradient(180deg, ${b.color}dd 0%, ${b.color}88 100%)`,
          borderRadius: "2px",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "2px 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Bordo dorso */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
            background: "rgba(0,0,0,0.3)"
          }} />
          {/* Titolo simulato */}
          {b.title && (
            <div style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 5, color: "rgba(255,255,255,0.25)", letterSpacing: "2px"
            }}>{b.title}</div>
          )}
        </div>
      ))}
    </motion.div>
  );
}

// ── Piccolo busto / statuetta ──────────────────────────────────────────────────
export function Bust({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginBottom: 3 }}
    >
      {/* Testa */}
      <div style={{
        width: 16, height: 18,
        background: "linear-gradient(160deg, #8A7A6A 0%, #6A5A4A 55%, #4A3A2A 100%)",
        borderRadius: "50% 50% 30% 30%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.7), 2px 0 0 rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
      }} />
      {/* Collo */}
      <div style={{
        width: 8, height: 6,
        background: "linear-gradient(180deg, #7A6A5A 0%, #5A4A3A 100%)",
      }} />
      {/* Busto */}
      <div style={{
        width: 26, height: 20,
        background: "linear-gradient(160deg, #7A6A5A 0%, #5A4A3A 50%, #3A2A1A 100%)",
        borderRadius: "2px 2px 0 0",
        boxShadow: "0 4px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)"
      }} />
      {/* Piedistallo */}
      <div style={{
        width: 30, height: 6,
        background: "linear-gradient(180deg, #3A2810 0%, #251808 100%)",
        borderRadius: "1px",
        boxShadow: "0 3px 10px rgba(0,0,0,0.8)"
      }} />
    </motion.div>
  );
}
