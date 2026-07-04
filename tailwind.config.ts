import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — Dark Academia palette (#16120f base)
        "void":         "#16120f",
        "room":         "#1a140e",
        "surface-1":    "#1d1811",
        "surface-2":    "#252013",
        "surface-3":    "#2c2518",
        "shelf-dark":   "#3f2b1f",
        "shelf-light":  "#5a3b28",
        // Accenti — oro caldo naturale
        "gold":         "#d4a15e",
        "amber":        "#e8c07a",
        "copper":       "#b07840",
        "cream":        "#f5efe6",
        // Testo — WCAG AA su bg dark
        "text-warm":    "#f5efe6",  // ~14.5:1 su void
        "text-sec":     "#c9a87a",  //  ~7.2:1
        "text-tert":    "#a88a6a",  //  ~5.2:1
        "text-muted":   "#a58f7e",  //  ~6.5:1 WCAG AA
        // Generi
        "genre-narrativa":   "#7B3F8A",
        "genre-fantasy":     "#2A6B3A",
        "genre-saggistica":  "#2A5080",
        "genre-business":    "#8A5020",
        "genre-crescita":    "#3D7A5A",
        "genre-psicologia":  "#5A3080",
        "genre-biografie":   "#7A3020",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body:    ["var(--font-body)",    "Georgia", "serif"],
        ui:      ["var(--font-ui)",      "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "Consolas", "monospace"],
      },
      boxShadow: {
        "book":      "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(212,161,94,0.08)",
        "book-hover":"0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(212,161,94,0.25)",
        "glow":      "0 0 20px rgba(212,161,94,0.2)",
        "glow-lg":   "0 0 40px rgba(212,161,94,0.15)",
        "panel":     "0 0 40px rgba(0,0,0,0.8)",
        "card":      "0 4px 16px rgba(0,0,0,0.4)",
        "inset":     "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "shelf-wood":      "linear-gradient(180deg, #3f2b1f 0%, #2a1a0b 35%, #3f2b1f 65%, #2a1a0b 100%)",
        "room-ambient":    "radial-gradient(ellipse 60% 40% at 75% 15%, rgba(255,140,0,0.07) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 15% 75%, rgba(212,161,94,0.04) 0%, transparent 50%), linear-gradient(180deg, #1a140e 0%, #16120f 100%)",
        "sidebar-gradient":"linear-gradient(180deg, #1d1811 0%, #16120f 100%)",
        "gold-subtle":     "linear-gradient(135deg, rgba(212,161,94,0.15) 0%, transparent 50%)",
      },
      animation: {
        "book-float": "bookFloat 3s ease-in-out infinite",
        "fade-up":    "fadeUp 0.4s ease forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "count-up":   "countUp 0.8s ease forwards",
        "shimmer":    "shimmer 1.5s infinite",
      },
      keyframes: {
        bookFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(212,161,94,0.2)" },
          "50%":      { boxShadow: "0 0 20px rgba(212,161,94,0.4)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      spacing: {
        sidebar: "220px",
        "sidebar-collapsed": "64px",
        "panel-right": "280px",
        topbar: "56px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
