# Guida Sviluppo Step-by-Step
> Per un singolo sviluppatore con competenze intermedie React/Next.js/Supabase

---

## Prima di Iniziare — Checklist Prerequisiti

- [ ] Node.js 20+ installato
- [ ] Account Vercel (gratuito)
- [ ] Account Supabase (gratuito)
- [ ] Account Google Cloud Console (per Books API key gratuita)
- [ ] Account Anthropic (per Claude API — pay per use)
- [ ] Git configurato

---

## STEP 1 — Crea il Progetto Next.js

```bash
npx create-next-app@latest biblioteca-digitale \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd biblioteca-digitale
```

---

## STEP 2 — Installa Dipendenze

```bash
# UI e animazioni
npm install framer-motion lucide-react

# Shadcn/ui setup
npx shadcn@latest init
# → Scegli: Dark theme, CSS variables: yes

# Componenti shadcn necessari
npx shadcn@latest add button input dialog sheet badge tooltip skeleton
npx shadcn@latest add dropdown-menu popover command

# State management e query
npm install zustand @tanstack/react-query

# Form e validazione
npm install react-hook-form @hookform/resolvers zod

# Charts
npm install recharts

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Utilities
npm install date-fns clsx tailwind-merge

# Dev
npm install -D @types/node
```

---

## STEP 3 — Configura Tailwind con Design System

Modifica `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Background
        "bg-void":      "#080503",
        "bg-room":      "#100A05",
        "surface-1":    "#1A1008",
        "surface-2":    "#231508",
        "surface-3":    "#2E1C0A",
        "shelf":        "#3D2510",
        "shelf-light":  "#5C3A1E",
        // Accenti
        "gold":         "#C89010",
        "amber":        "#E8B040",
        "copper":       "#B06020",
        "cream":        "#F0D8A8",
        // Testo
        "text-prim":    "#F5E6C8",
        "text-sec":     "#C4A068",
        "text-tert":    "#8A6040",
        "text-muted":   "#5A3820",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body:    ["EB Garamond", "Georgia", "serif"],
        ui:      ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        "book":  "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(200,144,16,0.1)",
        "glow":  "0 0 20px rgba(200,144,16,0.2)",
        "panel": "0 0 40px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## STEP 4 — Setup Supabase

### 4.1 — Crea progetto su supabase.com

1. Vai su [supabase.com](https://supabase.com) → New Project
2. Nome: `biblioteca-digitale`
3. Genera una password sicura e salvala
4. Scegli la regione più vicina

### 4.2 — Copia le variabili d'ambiente

```bash
# File .env.local (MAI committare su git!)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxx...

# Solo server-side (Edge Functions, API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxx...

# Google Books API
GOOGLE_BOOKS_API_KEY=AIzaxxxxxxxx

# Claude API (Anthropic)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

### 4.3 — Esegui le migration

Copia i contenuti di `docs/DATABASE_SCHEMA.md` e incollali nell'SQL Editor di Supabase, nell'ordine indicato.

### 4.4 — Crea i client Supabase

**`src/lib/supabase/client.ts`** (browser):
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/lib/supabase/server.ts`** (server components):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

---

## STEP 5 — Fonts Google

Aggiungi in `src/app/layout.tsx`:

```typescript
import { Cormorant_Garamond, EB_Garamond, Inter, JetBrains_Mono } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});
```

---

## STEP 6 — Struttura CSS Globale

**`src/app/globals.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-void: #080503;
  --bg-room: #100A05;
  /* ... tutti i token dal DESIGN_SYSTEM.md ... */
}

body {
  background-color: var(--bg-void);
  color: #F5E6C8;
  font-family: var(--font-ui);
}

/* Scrollbar stilizzata */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-room); }
::-webkit-scrollbar-thumb { 
  background: #3D2510;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: #C89010; }

/* Selezione testo */
::selection {
  background: rgba(200,144,16,0.3);
  color: #F5E6C8;
}
```

---

## STEP 7 — Primo Componente: Sidebar

**`src/components/layout/Sidebar.tsx`**:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library, LayoutDashboard, BookOpen, BookMarked,
  Heart, Quote, Users, Tag, BarChart3, Sparkles,
  Settings, User
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/libreria",      label: "Libreria",       icon: Library },
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/libri",         label: "I miei libri",   icon: BookOpen },
  { href: "/da-leggere",    label: "Da leggere",     icon: BookMarked },
  { href: "/preferiti",     label: "Preferiti",      icon: Heart },
  { href: "/citazioni",     label: "Citazioni",      icon: Quote },
  { href: "/autori",        label: "Autori",         icon: Users },
  { href: "/generi",        label: "Generi",         icon: Tag },
  { href: "/statistiche",   label: "Statistiche",    icon: BarChart3 },
  { href: "/ai",            label: "AI Insights",    icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-h-screen bg-surface-1 border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <h1 className="font-display text-lg font-semibold text-gold tracking-wider uppercase">
          Vibrazioni
        </h1>
        <p className="font-display text-xs text-text-tert tracking-widest uppercase">
          Letterarie
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md",
                "text-xs font-ui font-medium uppercase tracking-wide",
                "transition-all duration-200",
                isActive
                  ? "bg-gold/10 text-gold border-l-2 border-gold pl-[10px]"
                  : "text-text-tert hover:text-text-sec hover:bg-surface-2"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        <Link href="/profilo" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-ui font-medium uppercase tracking-wide text-text-tert hover:text-text-sec hover:bg-surface-2 transition-all">
          <User size={16} /> Profilo
        </Link>
        <Link href="/impostazioni" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-ui font-medium uppercase tracking-wide text-text-tert hover:text-text-sec hover:bg-surface-2 transition-all">
          <Settings size={16} /> Impostazioni
        </Link>
      </div>
    </aside>
  );
}
```

---

## STEP 8 — API Route Ricerca Libri

**`src/app/api/books/search/route.ts`**:
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const [openLibrary, googleBooks] = await Promise.allSettled([
    searchOpenLibrary(q),
    searchGoogleBooks(q),
  ]);

  const results = mergeResults(
    openLibrary.status === "fulfilled" ? openLibrary.value : [],
    googleBooks.status === "fulfilled" ? googleBooks.value : []
  );

  return NextResponse.json({ results });
}

async function searchOpenLibrary(q: string) {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10&fields=key,title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i,language`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  return (data.docs || []).map((b: any) => ({
    source: "openlibrary",
    title: b.title,
    authors: b.author_name || [],
    isbn13: b.isbn?.find((i: string) => i.length === 13),
    publisher: b.publisher?.[0],
    year: b.first_publish_year,
    pages: b.number_of_pages_median,
    coverUrl: b.cover_i
      ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
      : null,
    openLibraryId: b.key,
  }));
}

async function searchGoogleBooks(q: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&key=${key}`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  return (data.items || []).map((item: any) => {
    const v = item.volumeInfo;
    return {
      source: "google",
      googleBooksId: item.id,
      title: v.title,
      subtitle: v.subtitle,
      authors: v.authors || [],
      isbn13: v.industryIdentifiers?.find((i: any) => i.type === "ISBN_13")?.identifier,
      publisher: v.publisher,
      year: v.publishedDate?.substring(0, 4),
      pages: v.pageCount,
      language: v.language,
      coverUrl: v.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
  });
}

function mergeResults(ol: any[], gb: any[]) {
  // Deduplica per ISBN, preferisce Open Library per metadati, Google per copertine
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const book of [...ol, ...gb]) {
    const key = book.isbn13 || `${book.title}-${book.authors?.[0]}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(book);
    }
  }
  return merged.slice(0, 15);
}
```

---

## Prossimi Passi dopo lo Scaffold

1. **Settimana 1**: Completa setup + prima pagina login funzionante
2. **Settimana 2**: Form aggiungi libro + salvataggio Supabase
3. **Settimana 3**: Search autocomplete con API esterne
4. **Settimana 4**: Scaffale visivo con copertine
5. **Settimana 5**: Pannello dettaglio libro completo
6. **Settimana 6**: Import CSV Goodreads + i tuoi 80 libri dentro!

---

## Risorse Utili

- [Next.js 14 App Router Docs](https://nextjs.org/docs)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Open Library API](https://openlibrary.org/developers/api)
- [Google Books API](https://developers.google.com/books/docs/v1/reference/volumes/list)
- [Claude API Docs](https://docs.anthropic.com)
- [shadcn/ui Components](https://ui.shadcn.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Recharts Docs](https://recharts.org/en-US/)
- [TanStack Query](https://tanstack.com/query/latest)
