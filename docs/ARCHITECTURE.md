# Architettura Software — Biblioteca Digitale Personale

---

## 1. Stack Tecnologico

### Frontend
| Layer | Tecnologia | Motivazione |
|---|---|---|
| Framework | **Next.js 14+** (App Router) | SSR/SSG, routing, performance |
| Language | **TypeScript** | Type safety, IDE support |
| Styling | **Tailwind CSS + CSS Variables** | Utility + design tokens custom |
| UI Components | **shadcn/ui** (personalizzato) | Accessibile, headless, customizable |
| Icons | **Lucide React** | SVG, tree-shakable |
| 3D/Libreria | **Three.js / React Three Fiber** (opzionale v2) | Libreria 3D immersiva |
| Animazioni | **Framer Motion** | Animazioni fluide, spring physics |
| Charts | **Recharts** | Charts responsive per dashboard |
| Form | **React Hook Form + Zod** | Validation type-safe |
| State | **Zustand** | State management leggero |
| Query | **TanStack Query** | Server state, caching, sync |

### Backend
| Layer | Tecnologia | Motivazione |
|---|---|---|
| Backend | **Supabase** | Auth + DB + Storage + Realtime |
| Database | **PostgreSQL** (Supabase hosted) | ACID, full-text search, JSON |
| Auth | **Supabase Auth** | OAuth Google, magic link |
| Storage | **Supabase Storage** | Copertine custom, export files |
| Functions | **Supabase Edge Functions** | Logica serverless (AI calls) |

### AI & Integrazioni
| Servizio | Uso | Note |
|---|---|---|
| **Claude API** (Anthropic) | Profilo lettore, suggerimenti, analisi | claude-sonnet-4-6 |
| **OpenAI** (alternativa) | GPT-4o per fallback | Opzionale |
| **Open Library API** | Metadata libri (gratuita, no key) | Primo lookup |
| **Google Books API** | Metadata + copertine (key necessaria) | Fallback + copertine |
| **ISBNdb** | Lookup ISBN preciso | Piano a pagamento, opzionale |
| **Readwise API** | Import highlight/citazioni | Token OAuth |

---

## 2. Struttura Directory Next.js

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx           # Login con Supabase Auth
│   │   └── layout.tsx
│   │
│   ├── (app)/                     # Area autenticata
│   │   ├── layout.tsx             # Shell: sidebar + topbar
│   │   ├── libreria/
│   │   │   └── page.tsx           # Vista scaffale principale
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard statistiche
│   │   ├── libri/
│   │   │   ├── page.tsx           # Lista libri
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx       # Dettaglio libro
│   │   │   └── nuovo/
│   │   │       └── page.tsx       # Aggiungi libro
│   │   ├── da-leggere/
│   │   │   └── page.tsx
│   │   ├── preferiti/
│   │   │   └── page.tsx
│   │   ├── citazioni/
│   │   │   └── page.tsx
│   │   ├── autori/
│   │   │   └── page.tsx
│   │   ├── generi/
│   │   │   └── page.tsx
│   │   ├── statistiche/
│   │   │   └── page.tsx           # Analytics avanzate + timeline
│   │   └── ai/
│   │       └── page.tsx           # Profilo AI + suggerimenti
│   │
│   ├── api/
│   │   ├── books/
│   │   │   ├── search/route.ts    # Search Open Library + Google Books
│   │   │   └── isbn/[isbn]/route.ts
│   │   ├── ai/
│   │   │   ├── profile/route.ts   # Genera profilo lettore AI
│   │   │   ├── suggestions/route.ts
│   │   │   └── timeline/route.ts
│   │   └── import/
│   │       ├── goodreads/route.ts
│   │       └── readwise/route.ts
│   │
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Redirect a /libreria se autenticato
│   └── globals.css
│
├── components/
│   ├── library/
│   │   ├── Bookshelf.tsx          # Scaffale con libri
│   │   ├── BookCover.tsx          # Copertina singola con hover
│   │   ├── BookSpine.tsx          # Dorso libro (vista alternativa)
│   │   ├── BookDetail.tsx         # Pannello dettaglio inferiore
│   │   ├── ShelfRow.tsx           # Riga scaffale singola
│   │   ├── RoomBackground.tsx     # Sfondo stanza con ambient light
│   │   ├── EmptyShelf.tsx         # Stato vuoto scaffold
│   │   └── LibraryFilters.tsx     # Filtri genere/anno/voto
│   │
│   ├── books/
│   │   ├── BookCard.tsx           # Card lista libri
│   │   ├── BookForm.tsx           # Form aggiungi/modifica libro
│   │   ├── BookSearch.tsx         # Search autocomplete con API
│   │   ├── EditionPicker.tsx      # Selettore edizione
│   │   ├── RatingStars.tsx        # Componente stelle
│   │   ├── ReadingStatus.tsx      # Badge stato lettura
│   │   └── QuoteCard.tsx          # Card citazione
│   │
│   ├── dashboard/
│   │   ├── StatCard.tsx           # Card statistica singola
│   │   ├── ReadingChart.tsx       # Grafico letture nel tempo
│   │   ├── GenrePieChart.tsx      # Distribuzione generi
│   │   ├── YearlyProgress.tsx     # Progressione annuale
│   │   ├── Timeline.tsx           # Timeline intellettuale
│   │   └── ReadingVelocity.tsx    # Velocità lettura
│   │
│   ├── ai/
│   │   ├── ReaderProfile.tsx      # Profilo lettore AI
│   │   ├── BookSuggestions.tsx    # Lista suggerimenti AI
│   │   ├── ReadingPath.tsx        # Percorso lettura suggerito
│   │   └── AIInsights.tsx         # Insight testuali AI
│   │
│   ├── layout/
│   │   ├── Sidebar.tsx            # Navigazione laterale
│   │   ├── TopBar.tsx             # Barra superiore + search
│   │   ├── RightPanel.tsx         # Pannello statistiche destra
│   │   └── MobileNav.tsx          # Navigazione mobile (bottom)
│   │
│   └── ui/                        # shadcn/ui components personalizzati
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── tooltip.tsx
│       ├── skeleton.tsx
│       └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase browser client
│   │   ├── server.ts              # Supabase server client (SSR)
│   │   └── middleware.ts          # Auth middleware
│   │
│   ├── api/
│   │   ├── openLibrary.ts         # Open Library API wrapper
│   │   ├── googleBooks.ts         # Google Books API wrapper
│   │   ├── readwise.ts            # Readwise API wrapper
│   │   └── ai.ts                  # Claude/OpenAI wrapper
│   │
│   ├── hooks/
│   │   ├── useBooks.ts            # TanStack Query hooks per libri
│   │   ├── useStats.ts            # Hooks statistiche
│   │   └── useLibrary.ts          # State libreria (Zustand)
│   │
│   └── utils/
│       ├── bookUtils.ts           # Utilities libri (durata lettura, etc.)
│       ├── dateUtils.ts           # Formatting date
│       └── importUtils.ts         # Parse CSV Goodreads/Kindle
│
└── types/
    ├── book.ts                    # Tipi libro, edizione, stato
    ├── stats.ts                   # Tipi statistiche
    ├── ai.ts                      # Tipi risposta AI
    └── supabase.ts                # Tipi generati da Supabase
```

---

## 3. Architettura Dati — Flusso

```
[Utente cerca libro]
        ↓
[BookSearch component]
        ↓
[API Route: /api/books/search]
        ↓
[Open Library API] → merge → [Google Books API]
        ↓
[EditionPicker: selezione edizione]
        ↓
[Supabase: salva libro + metadati]
        ↓
[Bookshelf: aggiorna vista scaffale]
```

```
[AI Analysis Pipeline]
        ↓
[Utente richiede profilo/suggerimenti]
        ↓
[Supabase: fetch libri + voti + recensioni utente]
        ↓
[Edge Function: prepara contesto + chiama Claude API]
        ↓
[Claude: analizza pattern lettura, genera output strutturato]
        ↓
[Frontend: mostra profilo lettore + suggerimenti]
```

---

## 4. Autenticazione

```
Supabase Auth con:
- Email + Password (primary)
- Google OAuth (secondary, per semplicità)
- Magic Link (fallback)

Row Level Security (RLS):
- Tutti i dati filtrati per user_id
- Nessun dato pubblico (libreria privata)
- Policies su tutte le tabelle
```

---

## 5. Deployment

```
Frontend:  Vercel (Next.js native, edge functions, CI/CD auto)
Database:  Supabase (hosted PostgreSQL, free tier sufficiente per uso personale)
Storage:   Supabase Storage (copertine custom, max 1GB free)
Domain:    Vercel domain gratuito o custom

Costo stimato MVP: ~0€/mese (free tier Vercel + Supabase)
Costo con AI:      ~5-20€/mese (Claude API pay-per-use)
```

---

## 6. Performance

- Immagini copertine: Next.js Image component (WebP automatico, lazy loading)
- Static Generation per pagine senza dati utente
- Server Components dove possibile (App Router)
- TanStack Query: caching aggressive lato client
- Supabase indexes su campi di ricerca frequenti
- Lazy loading scaffale (virtualizzazione per >100 libri)
