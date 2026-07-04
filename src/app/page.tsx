"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Dna, Sparkles, Share2 } from "lucide-react";

// ── Palette (token system, ancorato all'identità "dark academia / la tua stanza") ──
// void #0d0b08 · mogano #3f2b1f · oro #d4a15e · ambra #e8c07a · crema #f5efe6
const GOLD = "#d4a15e";

// Dorsi sullo "scaffale-orizzonte" del hero. Palette calda e tonale (cuoio, mogano,
// cognac, con rari accenti freddi tenui) — come libri veri, non barre arcobaleno.
// `band`: un filo dorato come titolo inciso sul dorso.
const SPINES: { w: number; h: number; c: string; band?: boolean }[] = [
  { w: 26, h: 78, c: "#5a3b28", band: true },
  { w: 20, h: 96, c: "#6b3420" },
  { w: 30, h: 70, c: "#3d2510", band: true },
  { w: 17, h: 104, c: "#7a5526" },
  { w: 24, h: 84, c: "#2f3d52" },          // blu-notte tenue
  { w: 22, h: 92, c: "#4a2c1a", band: true },
  { w: 28, h: 74, c: "#3d4a2a" },          // oliva scuro
  { w: 19, h: 100, c: "#5a2820", band: true },
  { w: 27, h: 82, c: "#6b4a1a" },
  { w: 21, h: 94, c: "#3f2b1f", band: true },
  { w: 30, h: 72, c: "#2d4a35" },          // verde bosco
  { w: 18, h: 90, c: "#7a4a2a" },
  { w: 25, h: 98, c: "#4a3520", band: true },
  { w: 22, h: 80, c: "#5a3b28" },
  { w: 27, h: 76, c: "#33405a" },          // blu-notte
  { w: 20, h: 92, c: "#6b3420", band: true },
];

// ── Targa in ottone inciso — il signature element ──────────────────────────────
function BrassPlate({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`relative inline-block pl-7 pr-7 py-1.5 rounded-[3px] ${className}`}
      style={{
        background: "linear-gradient(180deg, #cB9a5e 0%, #9a7038 45%, #7a5526 55%, #b58a4e 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,235,180,0.5), inset 0 -1px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
      }}
    >
      {/* rivetti agli estremi, come una targa avvitata */}
      {["left", "right"].map(side => (
        <span key={side} className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            [side]: 6, width: 4, height: 4,
            background: "radial-gradient(circle at 35% 30%, #5a3a16 0%, #2a1808 80%)",
            boxShadow: "inset 0 1px 0 rgba(255,235,180,0.4), 0 1px 0 rgba(255,235,180,0.2)",
          } as React.CSSProperties}
        />
      ))}
      <span
        className="font-ui uppercase tracking-[0.34em] text-[11px] font-semibold"
        style={{ color: "#231405", textShadow: "0 1px 0 rgba(255,235,180,0.35)" }}
      >
        {children}
      </span>
    </span>
  );
}

function Movement({
  index, eyebrow, title, body, align, visual,
}: {
  index: number; eyebrow: string; title: string; body: string;
  align: "left" | "right"; visual: React.ReactNode;
}) {
  const text = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 max-w-[440px]"
    >
      <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: "rgba(212,161,94,0.55)" }}>
        {eyebrow}
      </p>
      <h3 className="font-display font-medium leading-[1.1] mb-4"
        style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "rgba(245,239,230,0.94)" }}>
        {title}
      </h3>
      <p className="font-body text-[16px] leading-relaxed" style={{ color: "rgba(201,168,122,0.78)" }}>
        {body}
      </p>
    </motion.div>
  );

  const art = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex items-center justify-center w-full"
    >
      {visual}
    </motion.div>
  );

  return (
    <div className={`flex flex-col gap-10 md:gap-16 items-center ${align === "right" ? "md:flex-row-reverse" : "md:flex-row"}`}>
      {text}
      {art}
    </div>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ background: "linear-gradient(180deg, #100b06 0%, #0d0b08 100%)" }}>

      {/* Vignettatura cinematografica — coerente con la "stanza" */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 92% 78% at 50% 32%, transparent 56%, rgba(0,0,0,0.5) 100%)" }} />

      {/* ════════ HERO ════════ */}
      <section className="relative min-h-screen flex flex-col">
        {/* Luce della lampada — alone caldo che "respira" */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 55% 48% at 50% 8%, rgba(255,170,55,0.22) 0%, rgba(212,140,40,0.08) 34%, transparent 64%)" }}
          animate={reduce ? undefined : { opacity: [0.82, 1, 0.82] }}
          transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* secondo alone, basso a sinistra (brace del camino) */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 45% 40% at 8% 92%, rgba(200,90,20,0.10) 0%, transparent 60%)" }} />

        {/* contenuto hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pt-24 pb-10 max-w-[820px] mx-auto">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <BrassPlate>Vibrazioni Letterarie</BrassPlate>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-medium mt-9 mb-6"
            style={{ fontSize: "clamp(40px, 8vw, 84px)", lineHeight: 1.02, letterSpacing: "-0.02em", color: "rgba(245,239,230,0.95)" }}
          >
            La tua vita di lettore<br />
            merita{" "}
            <span className="italic" style={{ color: GOLD, textShadow: "0 0 50px rgba(212,161,94,0.35)" }}>
              una stanza.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="font-body max-w-[560px] mx-auto mb-10"
            style={{ fontSize: "clamp(16px, 2vw, 19px)", lineHeight: 1.7, color: "rgba(201,168,122,0.8)" }}
          >
            I libri che hai amato diventano un&apos;identità, un racconto, un luogo da abitare.
            Non un inventario di titoli — la tua biblioteca interiore, illuminata.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link href="/login?mode=signup"
              className="group flex items-center gap-2 px-7 py-3 rounded-lg font-ui text-[13px] uppercase tracking-[0.14em] font-semibold transition-all hover:shadow-[0_0_28px_rgba(212,161,94,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              style={{ background: GOLD, color: "#1a1209" }}>
              Crea il tuo scaffale
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login"
              className="px-7 py-3 rounded-lg font-ui text-[13px] uppercase tracking-[0.14em] transition-all hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              style={{ border: "1px solid rgba(212,161,94,0.28)", color: "rgba(212,161,94,0.85)" }}>
              Entra
            </Link>
          </motion.div>
        </div>

        {/* Scaffale-orizzonte: fila di dorsi che poggia su una tavola di legno */}
        <div className="relative z-10 w-full">
          <div className="flex items-end justify-center gap-[5px] px-4 max-w-[1100px] mx-auto">
            {SPINES.map((s, i) => (
              <motion.div key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: s.h, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.6 + i * 0.035, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
                style={{
                  width: s.w, height: s.h,
                  background: `linear-gradient(180deg, ${s.c} 0%, ${s.c}cc 60%, ${s.c}99 100%)`,
                  borderRadius: "2px 2px 0 0",
                  boxShadow: "inset 1px 0 0 rgba(255,255,255,0.07), inset -1px 0 0 rgba(0,0,0,0.4), 0 -2px 6px rgba(0,0,0,0.3)",
                }}
              >
                {s.band && (
                  <div className="absolute left-0 right-0" style={{
                    top: "24%", height: 1.5,
                    background: "rgba(212,161,94,0.5)",
                    boxShadow: "0 3px 0 rgba(212,161,94,0.14)",
                  }} />
                )}
              </motion.div>
            ))}
          </div>
          {/* tavola dello scaffale */}
          <div style={{
            height: 18,
            background: "linear-gradient(180deg, #7B4820 0%, #5A3212 24%, #3E2210 55%, #221306 100%)",
            boxShadow: "0 6px 28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,210,110,0.12), inset 0 -1px 0 rgba(0,0,0,0.7)",
          }} />
          {/* raccordo morbido verso il contenuto */}
          <div aria-hidden style={{ height: 72, background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)" }} />
        </div>
      </section>

      {/* ════════ MOVIMENTI ════════ */}
      <section className="relative px-5 md:px-10 py-24 md:py-32 max-w-[1080px] mx-auto space-y-24 md:space-y-36">
        <div className="text-center max-w-[560px] mx-auto">
          <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-4" style={{ color: "rgba(212,161,94,0.5)" }}>
            Cosa diventa la tua libreria
          </p>
          <h2 className="font-display italic font-medium" style={{ fontSize: "clamp(26px, 4vw, 40px)", color: "rgba(245,239,230,0.9)" }}>
            Tre modi in cui i tuoi libri prendono vita
          </h2>
        </div>

        <Movement
          index={0}
          align="left"
          eyebrow="Un ritratto"
          title="Diventi un archetipo."
          body="L'intelligenza artificiale legge ciò che hai letto e ti restituisce chi sei: il tuo DNA di generi, i tuoi punti di forza, le zone d'ombra che ti aspettano. Un profilo di lettore che evolve a ogni libro."
          visual={<DnaVisual />}
        />

        <Movement
          index={1}
          align="right"
          eyebrow="Un racconto"
          title="Il tuo anno, raccontato."
          body="Ogni dodici mesi la tua lettura diventa una cartolina: i libri che ti hanno tenuto sveglio, il genere che ti ha definito, le pagine attraversate. Da custodire, o da condividere nelle tue storie."
          visual={<WrappedVisual />}
        />

        <Movement
          index={2}
          align="left"
          eyebrow="Un luogo da mostrare"
          title="Uno scaffale che puoi aprire."
          body="La tua biblioteca diventa un link elegante: uno scaffale pubblico che racconta cosa leggi a chi vuoi tu. La tua identità di lettore, in una pagina sola."
          visual={<ShelfVisual />}
        />
      </section>

      {/* ════════ SIGNATURE: citazione incisa ════════ */}
      <section className="relative px-5 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-[640px] mx-auto text-center px-8 py-12 rounded-sm relative"
          style={{ border: "1px solid rgba(180,140,40,0.22)", background: "rgba(20,11,4,0.5)" }}
        >
          {/* angolini incisi */}
          {[{ t: -5, l: -5 }, { t: -5, r: -5 }, { b: -5, l: -5 }, { b: -5, r: -5 }].map((p, i) => (
            <div key={i} className="absolute w-2.5 h-2.5" style={{
              top: p.t, bottom: p.b, left: p.l, right: p.r,
              border: "1px solid rgba(200,160,50,0.4)", background: "rgba(30,15,4,0.9)",
            }} />
          ))}
          <p className="font-display italic" style={{ fontSize: "clamp(22px, 3.5vw, 34px)", lineHeight: 1.45, color: "rgba(220,185,110,0.9)" }}>
            «Una stanza senza libri è come un corpo senza anima.»
          </p>
          <p className="font-ui uppercase tracking-[0.25em] text-[11px] mt-5" style={{ color: "rgba(180,140,55,0.5)" }}>
            Marco Tullio Cicerone
          </p>
        </motion.div>
      </section>

      {/* ════════ CTA FINALE ════════ */}
      <section className="relative px-5 pt-8 pb-28 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(255,170,55,0.10) 0%, transparent 65%)" }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-[600px] mx-auto"
        >
          <h2 className="font-display font-medium mb-5"
            style={{ fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.08, color: "rgba(245,239,230,0.95)" }}>
            Apri la porta<br />della tua stanza.
          </h2>
          <p className="font-body text-[16px] mb-9" style={{ color: "rgba(201,168,122,0.75)" }}>
            Bastano pochi libri per cominciare. La luce è già accesa.
          </p>
          <Link href="/login?mode=signup"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-ui text-[13px] uppercase tracking-[0.14em] font-semibold transition-all hover:shadow-[0_0_32px_rgba(212,161,94,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            style={{ background: GOLD, color: "#1a1209" }}>
            Crea il tuo scaffale
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative z-10 border-t px-5 py-8" style={{ borderColor: "rgba(212,161,94,0.1)" }}>
        <div className="max-w-[1080px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-ui text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(168,138,106,0.5)" }}>
            Vibrazioni Letterarie · una biblioteca personale
          </p>
          <Link href="/login" className="font-ui text-[12px] transition-colors hover:text-gold" style={{ color: "rgba(168,138,106,0.6)" }}>
            Accedi →
          </Link>
        </div>
      </footer>
    </main>
  );
}

// ── Visual 1: DNA di lettura (barre generi) ────────────────────────────────────
function DnaVisual() {
  const bars = [
    { g: "Narrativa", pct: 88, c: "#7B3F8A" },
    { g: "Saggistica", pct: 64, c: "#2A5080" },
    { g: "Thriller", pct: 52, c: "#3A2A6A" },
    { g: "Biografie", pct: 38, c: "#7A3020" },
  ];
  return (
    <div className="w-full max-w-[360px] rounded-xl p-6"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,161,94,0.14)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center gap-2 mb-5">
        <Dna size={15} style={{ color: GOLD }} />
        <span className="font-ui text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(212,161,94,0.7)" }}>Il Cronista delle Trame</span>
      </div>
      <div className="space-y-3.5">
        {bars.map((b, i) => (
          <div key={b.g}>
            <div className="flex justify-between mb-1.5">
              <span className="font-ui text-[12px]" style={{ color: "rgba(201,168,122,0.85)" }}>{b.g}</span>
              <span className="font-mono text-[12px]" style={{ color: b.c }}>{b.pct}%</span>
            </div>
            <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${b.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${b.c}cc, ${b.c})` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Visual 2: cartolina Wrapped (ventaglio) ────────────────────────────────────
function WrappedVisual() {
  return (
    <div className="relative w-full max-w-[340px] h-[300px] flex items-center justify-center">
      <Sparkles size={16} className="absolute top-4 right-10 z-20" style={{ color: "rgba(212,161,94,0.5)" }} />
      <div className="relative" style={{ width: 200, height: 280 }}>
        {/* cartolina */}
        <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center text-center p-6"
          style={{
            background: "radial-gradient(ellipse 70% 45% at 50% 12%, rgba(212,161,94,0.16) 0%, transparent 60%), linear-gradient(180deg, #14100a 0%, #0d0b08 100%)",
            border: "1px solid rgba(212,161,94,0.18)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}>
          <span className="font-ui text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: "rgba(212,161,94,0.55)" }}>il mio anno</span>
          <span className="font-display font-bold leading-none" style={{ fontSize: 56, color: GOLD }}>2025</span>
          <div className="flex gap-4 mt-6">
            <div><div className="font-display font-bold text-[22px]" style={{ color: "rgba(245,239,230,0.92)" }}>79</div><div className="font-ui text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(168,138,106,0.6)" }}>libri</div></div>
            <div className="w-px self-stretch" style={{ background: "rgba(212,161,94,0.15)" }} />
            <div><div className="font-display font-bold text-[22px]" style={{ color: "rgba(245,239,230,0.92)" }}>31k</div><div className="font-ui text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(168,138,106,0.6)" }}>pagine</div></div>
          </div>
          <p className="font-body italic text-[11px] mt-6" style={{ color: "rgba(168,138,106,0.65)" }}>«il tuo anno di letture»</p>
        </div>
      </div>
    </div>
  );
}

// ── Visual 3: scaffale pubblico (copertine + link) ─────────────────────────────
function ShelfVisual() {
  const covers = ["#3D1A5A", "#1A3D2A", "#3D2A10", "#2A1A3A", "#1A2D4A"];
  return (
    <div className="w-full max-w-[360px] rounded-xl p-6"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,161,94,0.14)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center gap-2 mb-5">
        <Share2 size={14} style={{ color: GOLD }} />
        <span className="font-mono text-[12px]" style={{ color: "rgba(212,161,94,0.75)" }}>vibrazioni.app/u/marco</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        {covers.map((c, i) => (
          <motion.div key={i}
            initial={{ y: 16, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
            className="flex-1 rounded-[3px]"
            style={{ height: 78 + (i % 3) * 10, background: `linear-gradient(155deg, ${c}f0, ${c}90)`, boxShadow: "0 6px 16px rgba(0,0,0,0.5)" }} />
        ))}
      </div>
      <p className="font-body italic text-[12px] mt-5 text-center" style={{ color: "rgba(168,138,106,0.6)" }}>
        Lo scaffale di Marco · 79 volumi
      </p>
    </div>
  );
}
