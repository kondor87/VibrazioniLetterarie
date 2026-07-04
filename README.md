# Vibrazioni Letterarie

Biblioteca digitale personale e immersiva — non un gestionale, ma un luogo dove la tua
identità di lettore prende forma. Estetica *dark academia* (legno caldo, oro).

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI (GPT-4o / GPT-4o-mini)
- **UI**: Framer Motion + Lucide React
- **Deploy**: Vercel

## Funzionalità principali

- **La libreria** — griglia, lista e scaffali; censimento fisico opzionale (librerie, ripiani, file davanti/dietro).
- **Scheda libro** — sinossi ufficiale (Google Books, in italiano), bio autore disambiguata (Wikidata → Wikipedia), velocità di lettura, collocazione.
- **La community** — intelligenza collettiva *anonima* del comportamento di lettura: più aggiunti, *most devoured*, più abbandonati, percentile di velocità, ricerca, e "anime gemelle di lettura" (taste-twins).
- **AI** — raccomandazioni, "le vite che hai vissuto", timeline, profilo del lettore.

## Variabili d'ambiente

Crea `.env.local` (mai committarlo) con:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # SOLO server-side, mai esposta al client
GOOGLE_BOOKS_API_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...                      # protegge i cron (refresh community, batch AI mensile)
```

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build di produzione
```

## Database

Le migrazioni SQL sono in [`supabase/migrations/`](supabase/migrations/) e vanno applicate al
progetto Supabase (SQL Editor o client `pg`): catalogo libri, libreria per-utente, tabelle AI,
censimento fisico e aggregati anonimi della community.

## Deploy (Vercel)

1. Importa il repo in Vercel.
2. Imposta le variabili d'ambiente sopra elencate.
3. Aggiungi l'URL di produzione agli *URL di redirect / Site URL* dell'Auth Supabase.
4. I cron sono definiti in [`vercel.json`](vercel.json) (refresh community giornaliero, batch AI mensile).

## Documentazione

| File | Contenuto |
|---|---|
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colori, tipografia, componenti, animazioni |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack tecnico, struttura directory, deployment |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Schema PostgreSQL, RLS policies, views |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Roadmap e visione |

---

_Progetto personale. Fonti dei metadati ufficiali: sinossi da Google Books (edizione italiana),
bio autori da Wikipedia disambiguate via Wikidata._
