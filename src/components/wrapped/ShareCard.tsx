"use client";

import { forwardRef } from "react";
import type { BookWithReading } from "@/types/book";
import { GENRE_COLORS } from "@/types/book";

function proxied(url: string | null): string | null {
  if (!url) return null;
  // forza https (google books a volte serve http)
  const https = url.replace(/^http:\/\//, "https://");
  return `/api/img-proxy?url=${encodeURIComponent(https)}`;
}

interface ShareStats {
  year: number;
  count: number;
  pages: number;
  avgRating: number | null;
  topGenre: { name: string; count: number } | null;
  topBook: BookWithReading | null;
}

interface Props {
  stats: ShareStats;
  covers: BookWithReading[];
}

// Cartolina verticale 9:16 — target dell'export PNG.
// Tutto in inline-style + colori espliciti per fedeltà nel rendering off-screen.
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ stats, covers }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 340,
        aspectRatio: "9 / 16",
        background: "radial-gradient(ellipse 70% 45% at 50% 12%, rgba(212,161,94,0.14) 0%, transparent 60%), linear-gradient(180deg, #14100a 0%, #0d0b08 100%)",
        borderRadius: 18,
        border: "1px solid rgba(212,161,94,0.14)",
        padding: "30px 26px 26px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Brand */}
      <div style={{ textAlign: "center" }}>
        <p style={{
          fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: "0.32em",
          textTransform: "uppercase", color: "rgba(212,161,94,0.55)", margin: 0,
        }}>
          Vibrazioni Letterarie
        </p>
        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 52,
          lineHeight: 1, letterSpacing: "-0.02em", color: "#d4a15e",
          margin: "10px 0 0",
        }}>
          {stats.year}
        </h2>
        <p style={{
          fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: 12.5,
          color: "rgba(168,138,106,0.6)", margin: "8px 0 0",
        }}>
          il mio anno di letture
        </p>
      </div>

      {/* Collage copertine sovrapposte */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        height: 150, margin: "26px 0 24px",
      }}>
        {covers.slice(0, 5).map((b, i) => {
          const total = Math.min(covers.length, 5);
          const mid = (total - 1) / 2;
          const offset = i - mid;
          const src = proxied(b.cover_url);
          return (
            <div key={b.book_id}
              style={{
                width: 78, height: 117, marginLeft: i === 0 ? 0 : -26,
                borderRadius: 5, overflow: "hidden",
                transform: `rotate(${offset * 7}deg) translateY(${Math.abs(offset) * 9}px)`,
                boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: GENRE_COLORS[b.genres?.[0] ?? ""] ?? "#231508",
                zIndex: 10 - Math.abs(offset),
                flexShrink: 0,
              }}>
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Numeri */}
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 22 }}>
        <Stat value={String(stats.count)} label="libri" />
        <Divider />
        <Stat value={stats.pages >= 1000 ? `${(stats.pages / 1000).toFixed(1)}k` : String(stats.pages)} label="pagine" />
        {stats.avgRating != null && <><Divider /><Stat value={String(stats.avgRating)} label="voto" /></>}
      </div>

      {/* Highlight */}
      <div style={{
        marginTop: "auto", borderTop: "1px solid rgba(212,161,94,0.12)", paddingTop: 16,
      }}>
        {stats.topBook && (
          <div style={{ marginBottom: stats.topGenre ? 12 : 0 }}>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "rgba(212,161,94,0.5)", margin: "0 0 3px",
            }}>
              libro dell&apos;anno
            </p>
            <p style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16,
              lineHeight: 1.15, color: "rgba(245,239,230,0.92)", margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {stats.topBook.title}
            </p>
          </div>
        )}
        {stats.topGenre && (
          <div>
            <p style={{
              fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "rgba(212,161,94,0.5)", margin: "0 0 3px",
            }}>
              genere dominante
            </p>
            <p style={{
              fontFamily: "var(--font-display)", fontSize: 15,
              color: "rgba(245,239,230,0.9)", margin: 0,
            }}>
              {stats.topGenre.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32,
        lineHeight: 1, color: "rgba(245,239,230,0.92)", margin: 0, letterSpacing: "-0.02em",
      }}>
        {value}
      </p>
      <p style={{
        fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: "0.2em",
        textTransform: "uppercase", color: "rgba(168,138,106,0.55)", margin: "5px 0 0",
      }}>
        {label}
      </p>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "rgba(212,161,94,0.12)" }} />;
}
