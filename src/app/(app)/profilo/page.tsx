"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, Loader2, Sparkles, Globe, Copy, Check } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { createClient } from "@/lib/supabase/client";

function buildUsername(email: string): string {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}
function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}
function deriveName(email: string): string {
  return email.split("@")[0].replace(/[._-]/g, " ").split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function initials(name: string): string {
  const p = name.trim().split(" ");
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

interface ArchetypeData {
  name: string;
  motto: string;
  description: string;
  strengths: string[];
  blind_spots: string[];
}

interface ProfileRow {
  archetype: ArchetypeData;
  book_count_at_generation: number;
  generated_at: string;
}

export default function ProfiloPage() {
  const { user, loading: authLoading } = useAuth();
  const { books, loading: booksLoading } = useUserBooks();
  const sb = createClient();

  const [profile, setProfile]             = useState<ProfileRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [genError, setGenError]           = useState<string | null>(null);
  const [confirmed, setConfirmed]         = useState(false);

  // Scaffale pubblico
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [publicUsername, setPublicUsername] = useState<string | null>(null);
  const [togglingShelf, setTogglingShelf] = useState(false);
  const [urlCopied, setUrlCopied]         = useState(false);

  const displayName    = user?.email ? deriveName(user.email) : "Lettore";
  const avatarInitials = initials(displayName);
  const memberSince    = user?.created_at ? formatMemberSince(user.created_at) : "—";

  const ctx = useMemo(() => {
    const read    = books.filter(b => b.status === "letto" || b.status === "rileggendo");
    const ratings = read.filter(b => b.rating != null).map(b => b.rating!);
    return {
      readBooks:  read.length,
      totalPages: read.reduce((s, b) => s + (b.page_count ?? 0), 0),
      avgRating:  ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : 0,
    };
  }, [books]);

  // Legge profilo AI e public shelf dal DB
  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      sb.from("user_ai_profiles")
        .select("archetype, book_count_at_generation, generated_at")
        .eq("user_id", user.id).maybeSingle(),
      sb.from("user_profiles")
        .select("username, public_shelf_enabled")
        .eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: aiData }, { data: pubData }]) => {
      setProfile(aiData as ProfileRow | null);
      if (pubData) {
        setPublicUsername(pubData.username);
        setPublicEnabled(pubData.public_shelf_enabled);
      }
      setLoadingProfile(false);
    });
  }, [user, authLoading]); // eslint-disable-line

  async function togglePublicShelf() {
    if (!user) return;
    setTogglingShelf(true);
    const newEnabled = !publicEnabled;
    if (!publicUsername) {
      // Prima attivazione: crea riga con username auto-generato
      const username = buildUsername(user.email ?? "lettore");
      const { error } = await sb.from("user_profiles").upsert(
        { user_id: user.id, username, public_shelf_enabled: true },
        { onConflict: "user_id" }
      );
      if (!error) { setPublicUsername(username); setPublicEnabled(true); }
    } else {
      await sb.from("user_profiles")
        .update({ public_shelf_enabled: newEnabled })
        .eq("user_id", user.id);
      setPublicEnabled(newEnabled);
    }
    setTogglingShelf(false);
  }

  function copyShelfUrl() {
    if (!publicUsername) return;
    navigator.clipboard.writeText(`${window.location.origin}/u/${publicUsername}`);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  async function generateProfile() {
    setGenerating(true);
    setGenError(null);
    try {
      const res  = await fetch("/api/ai/jobs/profile-refresh", { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const { data } = await sb
        .from("user_ai_profiles")
        .select("archetype, book_count_at_generation, generated_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      setProfile(data as ProfileRow | null);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Errore durante la generazione");
    } finally {
      setGenerating(false);
    }
  }

  const loading = authLoading || booksLoading || loadingProfile;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto" style={{ background: "#16120f" }}>
        <div className="max-w-[680px] mx-auto px-4 py-8 md:px-10 md:py-12 space-y-8 md:space-y-10">

          {/* ── Avatar + identità ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center font-display text-2xl font-bold text-gold shrink-0"
              style={{ background: "rgba(212,161,94,0.08)", border: "1.5px solid rgba(212,161,94,0.25)" }}>
              {avatarInitials}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold" style={{ color: "rgba(245,239,230,0.92)" }}>
                {displayName}
              </h1>
              <p className="font-ui text-[12px] mt-0.5" style={{ color: "rgba(168,138,106,0.55)" }}>{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar size={10} className="text-text-muted" />
                <span className="font-ui text-[11px] text-text-muted">Lettore dal {memberSince}</span>
              </div>
            </div>
          </motion.div>

          {/* ── Profilo AI ────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {loading ? (
              <PortraitSkeleton />
            ) : profile ? (
              <PortraitCard archetype={profile.archetype}
                bookCountAtGen={profile.book_count_at_generation}
                generatedAt={profile.generated_at} />
            ) : books.length === 0 ? (
              <EmptyLibrary />
            ) : (
              <FirstGenCard
                confirmed={confirmed}
                generating={generating}
                error={genError}
                onConfirm={() => setConfirmed(true)}
                onGenerate={generateProfile}
              />
            )}
          </motion.div>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          {books.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              {[
                { label: "Libri letti",  value: ctx.readBooks },
                { label: "Pagine",       value: ctx.totalPages > 0 ? ctx.totalPages.toLocaleString("it") : "—" },
                { label: "Voto medio",   value: ctx.avgRating > 0 ? `${ctx.avgRating}/10` : "—" },
              ].map((s, i, arr) => (
                <div key={s.label} className="py-5 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="font-display text-[22px] md:text-[28px] font-bold leading-none mb-1" style={{ color: "#d4a15e" }}>{s.value}</div>
                  <div className="font-ui text-[11px] uppercase tracking-[0.15em] text-text-muted">{s.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── CTA DNA ──────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Link href="/identita"
              className="flex items-center justify-between px-5 py-4 rounded-xl group transition-all"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="font-display text-[14px] font-medium" style={{ color: "rgba(245,239,230,0.75)" }}>
                  Esplora il tuo DNA di lettura
                </p>
                <p className="font-ui text-[11px] text-text-muted mt-0.5">Analisi completa · Punti di forza · Zone d&apos;ombra</p>
              </div>
              <ChevronRight size={16} className="text-text-muted group-hover:text-gold transition-colors" />
            </Link>
          </motion.div>

          {/* ── Scaffale pubblico ─────────────────────────────────────────── */}
          {!loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="rounded-xl px-5 py-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe size={15} className="text-text-muted shrink-0" />
                  <div>
                    <p className="font-ui text-[12px] font-medium text-text-warm">Scaffale pubblico</p>
                    <p className="font-ui text-[12px] text-text-muted mt-0.5">
                      {publicEnabled ? "Il tuo scaffale è visibile via link" : "Condividi la tua libreria via link"}
                    </p>
                  </div>
                </div>
                {/* Toggle switch */}
                <button onClick={togglePublicShelf} disabled={togglingShelf}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 disabled:opacity-60"
                  style={{ background: publicEnabled ? "#d4a15e" : "rgba(255,255,255,0.08)" }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: publicEnabled ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              {/* URL visibile quando attivo */}
              {publicEnabled && publicUsername && (
                <div className="mt-3 flex items-center gap-2 pl-[27px]">
                  <span className="font-mono text-[11px] flex-1 truncate" style={{ color: "rgba(212,161,94,0.70)" }}>
                    {typeof window !== "undefined" ? window.location.origin : ""}/u/{publicUsername}
                  </span>
                  <button onClick={copyShelfUrl}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded font-ui text-[12px] transition-all"
                    style={{ background: "rgba(212,161,94,0.08)", color: urlCopied ? "#6B8C5A" : "rgba(212,161,94,0.6)" }}>
                    {urlCopied ? <Check size={11} /> : <Copy size={11} />}
                    {urlCopied ? "Copiato" : "Copia"}
                  </button>
                  <Link href={`/u/${publicUsername}`} target="_blank"
                    className="shrink-0 px-2 py-1 rounded font-ui text-[12px] transition-all"
                    style={{ background: "rgba(212,161,94,0.08)", color: "rgba(212,161,94,0.6)" }}>
                    Apri →
                  </Link>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FirstGenCard({ confirmed, generating, error, onConfirm, onGenerate }: {
  confirmed: boolean;
  generating: boolean;
  error: string | null;
  onConfirm: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,161,94,0.15)" }}>
      <div className="px-7 pt-7 pb-5" style={{ background: "rgba(212,161,94,0.03)" }}>
        <p className="font-ui text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: "rgba(212,161,94,0.50)" }}>
          Prima generazione
        </p>
        <h2 className="font-display text-[22px] font-semibold mb-2" style={{ color: "rgba(245,239,230,0.85)" }}>
          Genera il tuo profilo AI
        </h2>
        <p className="font-body text-[13px] leading-relaxed" style={{ color: "rgba(168,138,106,0.65)" }}>
          L&apos;AI analizza l&apos;intera libreria e costruisce il tuo archetipo di lettore.
          Il profilo si aggiorna automaticamente ogni mese — non potrai rigenerarlo manualmente.
        </p>
      </div>

      <div className="px-7 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="font-ui text-[11px] uppercase tracking-[0.15em] mb-3 text-text-muted">
          Prima di procedere, verifica che:
        </p>
        <ul className="space-y-2.5">
          {[
            "Hai caricato tutti i libri che hai letto",
            "I voti e i preferiti sono aggiornati",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 text-gold/60 text-[11px]">✓</span>
              <span className="font-ui text-[12px] text-text-tert">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-7 pb-7" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {!confirmed ? (
          <div className="pt-5 flex items-center gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" onChange={onConfirm}
                className="w-4 h-4 rounded border-gold/30 bg-transparent accent-gold cursor-pointer" />
              <span className="font-ui text-[12px] text-text-tert group-hover:text-text-sec transition-colors">
                Ho verificato, la libreria è completa
              </span>
            </label>
          </div>
        ) : (
          <div className="pt-5 flex flex-col gap-3">
            <button onClick={onGenerate} disabled={generating}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-lg font-ui text-[12px] font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(212,161,94,0.12)", border: "1px solid rgba(212,161,94,0.30)", color: "#d4a15e" }}>
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {generating ? "Elaborazione in corso…" : "Genera il mio profilo"}
            </button>
            {generating && (
              <p className="font-ui text-[11px] text-text-muted">
                L&apos;AI sta analizzando la tua libreria — può richiedere qualche decina di secondi.
              </p>
            )}
            {error && <p className="font-ui text-[11px] text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PortraitCard({ archetype, bookCountAtGen, generatedAt }: {
  archetype: ArchetypeData;
  bookCountAtGen: number;
  generatedAt: string;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(212,161,94,0.12)" }}>
      <div className="px-7 pt-7 pb-5" style={{ background: "rgba(212,161,94,0.04)" }}>
        <p className="font-ui text-[11px] uppercase tracking-[0.3em] text-text-muted mb-3">Chi stai diventando</p>
        <h2 className="font-display font-bold leading-none mb-3"
          style={{ fontSize: "clamp(32px, 5vw, 48px)", color: "#d4a15e", letterSpacing: "-0.02em" }}>
          {archetype.name}
        </h2>
        <p className="font-body text-[13px] italic leading-relaxed" style={{ color: "rgba(168,138,106,0.70)" }}>
          &laquo;{archetype.motto}&raquo;
        </p>
      </div>
      <div className="px-7 py-6" style={{ borderTop: "1px solid rgba(212,161,94,0.08)" }}>
        <p className="font-body text-[14px] leading-[1.9]" style={{ color: "rgba(201,168,122,0.82)" }}>
          {archetype.description}
        </p>
      </div>
      <div className="px-7 pb-5 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="font-ui text-[12px] text-text-muted">
          Generato su {bookCountAtGen} libri
        </span>
        <span className="font-ui text-[12px] text-text-muted">
          Aggiornato il {formatDate(generatedAt)} · si rinnova ogni mese
        </span>
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Sparkles size={28} className="text-gold/30" />
      <p className="font-ui text-sm text-text-muted">Aggiungi libri per generare il tuo profilo</p>
    </div>
  );
}

function PortraitSkeleton() {
  return (
    <div className="rounded-xl animate-pulse overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="px-7 pt-7 pb-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="h-2 bg-white/[0.06] rounded w-32 mb-4" />
        <div className="h-10 bg-white/[0.05] rounded w-56 mb-3" />
        <div className="h-3 bg-white/[0.04] rounded w-72" />
      </div>
      <div className="px-7 py-6 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {[1, 0.8, 0.9, 0.7].map((w, i) => (
          <div key={i} className="h-3 bg-white/[0.04] rounded" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
