"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookText, Mail, Lock, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "Email o password non corretti.";
  if (m.includes("email not confirmed"))
    return "Devi confermare l'email prima di accedere. Controlla la tua casella.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Questo indirizzo email è già registrato. Accedi invece di registrarti.";
  if (m.includes("password should be at least"))
    return "La password deve essere di almeno 6 caratteri.";
  if (m.includes("unable to validate email address") || m.includes("invalid email"))
    return "Indirizzo email non valido.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Troppi tentativi. Riprova tra qualche minuto.";
  if (m.includes("network") || m.includes("fetch"))
    return "Errore di rete. Controlla la connessione e riprova.";
  return msg;
}

export default function LoginPage() {
  const [mode, setMode]           = useState<Mode>("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Apre direttamente la registrazione se si arriva da /login?mode=signup (CTA landing)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/libri";
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/libri`,
          },
        });
        if (error) throw error;
        setEmailSent(true);
      }
    } catch (err) {
      const e = err as { message?: string };
      setError(translateError(e.message ?? "Errore durante l'autenticazione"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-library-room">

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookText size={22} className="text-gold" />
            <span className="font-display text-xl font-semibold text-gold tracking-[0.12em] uppercase">
              Vibrazioni
            </span>
          </div>
          <p className="font-display text-[11px] text-text-muted tracking-[0.2em] uppercase">
            Letterarie
          </p>
        </div>

        <AnimatePresence mode="wait">
          {emailSent ? (
            /* ── Email confirmation screen ── */
            <motion.div key="email-sent"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-2 rounded-2xl border border-white/[0.06] shadow-panel p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
                <MailCheck size={28} className="text-gold" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-text-warm mb-1">
                  Controlla la tua email
                </h2>
                <p className="font-ui text-sm text-text-muted leading-relaxed">
                  Abbiamo inviato un link di conferma a{" "}
                  <span className="text-gold font-medium">{email}</span>.
                  Clicca il link per attivare il tuo account ed entrare nella libreria.
                </p>
              </div>
              <p className="font-ui text-[11px] text-text-muted opacity-60">
                Non trovi l'email? Controlla lo spam.
              </p>
              <button onClick={() => { setEmailSent(false); setMode("login"); }}
                className="font-ui text-[12px] text-gold hover:text-amber transition-colors">
                Torna al login
              </button>
            </motion.div>
          ) : (
            /* ── Login / Signup card ── */
            <motion.div key="form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-surface-2 rounded-2xl border border-white/[0.06] overflow-hidden shadow-panel">

              {/* Mode tabs */}
              <div className="flex border-b border-white/[0.06]">
                {(["login", "signup"] as Mode[]).map(m => (
                  <button key={m} onClick={() => { setMode(m); setError(null); }}
                    className={cn(
                      "flex-1 py-3.5 font-ui text-[11px] uppercase tracking-widest transition-colors",
                      mode === m
                        ? "text-gold bg-gold/5 border-b-2 border-gold"
                        : "text-text-muted hover:text-text-sec"
                    )}>
                    {m === "login" ? "Accedi" : "Registrati"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      required placeholder="la@tua.email"
                      className="w-full bg-surface-3 border border-white/[0.06] rounded-xl pl-9 pr-4 py-3
                                 font-ui text-sm text-text-warm placeholder:text-text-muted
                                 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="font-ui text-[11px] uppercase tracking-widest text-text-muted">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input type={showPwd ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      required placeholder="••••••••" minLength={6}
                      className="w-full bg-surface-3 border border-white/[0.06] rounded-xl pl-9 pr-10 py-3
                                 font-ui text-sm text-text-warm placeholder:text-text-muted
                                 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20" />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-warm">
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="font-ui text-[12px] text-text-muted opacity-60">
                      Minimo 6 caratteri
                    </p>
                  )}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="font-ui text-[12px] text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button type="submit" disabled={loading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-gold text-void font-ui text-sm font-bold
                             hover:bg-amber transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {mode === "login" ? "Accedi alla libreria" : "Crea il tuo account"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center font-ui text-[11px] text-text-muted mt-5 opacity-50">
          I tuoi dati sono al sicuro · Nessun tracciamento
        </p>
      </motion.div>
    </div>
  );
}
