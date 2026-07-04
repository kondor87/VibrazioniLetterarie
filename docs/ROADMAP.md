# Roadmap di Sviluppo — Biblioteca Digitale Personale
> Sviluppatore singolo · Competenze intermedie React/Next.js/Supabase

---

## Visione Prodotto

**Non un catalogo libri. Una stanza virtuale che racconta il tuo viaggio intellettuale.**

---

## Fase 0 — Setup Iniziale (Settimana 1)

### Obiettivo
Ambiente di sviluppo funzionante, progetto scaffolded, Supabase configurato.

### Task
- [ ] `npx create-next-app@latest biblioteca --typescript --tailwind --app`
- [ ] Setup shadcn/ui: `npx shadcn@latest init`
- [ ] Installa dipendenze: framer-motion, zustand, @tanstack/react-query, recharts, lucide-react, zod, react-hook-form
- [ ] Crea progetto Supabase (free tier)
- [ ] Esegui migration schema database (da `docs/DATABASE_SCHEMA.md`)
- [ ] Configura `.env.local` con SUPABASE_URL, SUPABASE_ANON_KEY
- [ ] Setup Google Books API key (gratuita, 1000 req/giorno)
- [ ] Configura Vercel project (deploy continuo da git)
- [ ] Personalizza `tailwind.config.ts` con colori/font del design system

### Output
Un Next.js app vuota deployata su Vercel con DB Supabase pronto.

---

## Fase 1 — MVP (Settimane 2-6)
**Obiettivo: puoi aggiungere i tuoi 80 libri e vederli sullo scaffale.**

### 1.1 — Autenticazione (Settimana 2)
- [ ] Login page con Supabase Auth (email/password)
- [ ] Google OAuth (opzionale, ma consigliato)
- [ ] Middleware auth (proteggi rotte `/app/*`)
- [ ] Creazione profilo automatica al primo login (trigger Supabase)
- [ ] Redirect post-login a `/libreria`

### 1.2 — Aggiunta libri manuale (Settimana 2-3)
- [ ] Pagina `/libri/nuovo`
- [ ] Form con campi: titolo, autori, editore, anno, pagine, lingua, formato
- [ ] Salvataggio su Supabase
- [ ] Upload copertina custom (Supabase Storage)
- [ ] Validazione con Zod

### 1.3 — Ricerca libri automatica (Settimana 3)
- [ ] API Route `/api/books/search` che interroga Open Library + Google Books
- [ ] Componente `BookSearch` con autocomplete (debounce 300ms)
- [ ] `EditionPicker`: mostra edizioni disponibili con copertine
- [ ] Pre-fill automatico del form con dati selezionati
- [ ] Gestione fallback: se Open Library fallisce → Google Books

### 1.4 — Scaffale Visivo (Settimana 4)
- [ ] Componente `Bookshelf` con libri su scaffali
- [ ] `BookCover`: copertina 80×120px, hover sollevamento + glow dorato
- [ ] `ShelfRow`: riga singola con legno texture CSS
- [ ] `RoomBackground`: sfondo stanza con ambient light CSS
- [ ] Distribuzione automatica libri sulle righe (max 12-15 per riga)
- [ ] Click su libro → apre `BookDetail` panel inferiore
- [ ] Stato loading: skeleton copertine

### 1.5 — Pannello Dettaglio Libro (Settimana 4-5)
- [ ] Slide-up panel con: copertina, titolo, autore, metadati
- [ ] Voto 1-10 con stelle interattive
- [ ] Campo recensione (textarea, salvataggio live)
- [ ] Stato lettura (da leggere / in corso / letto / abbandonato)
- [ ] Date inizio/fine lettura
- [ ] Tag generi
- [ ] Aggiungi citazione

### 1.6 — Navigazione e Layout (Settimana 5)
- [ ] `Sidebar` con navigazione (Libreria, Dashboard, Libri, etc.)
- [ ] `TopBar` con ricerca globale
- [ ] Filtri libreria: genere, anno, voto, stato
- [ ] Vista lista alternativa (oltre a scaffale)
- [ ] Responsive: funziona su desktop (focus) + tablet

### 1.7 — Import Dati (Settimana 6)
- [ ] Parser CSV Goodreads (formato standard)
- [ ] Import manuale CSV custom
- [ ] Pagina import con preview + conferma
- [ ] Mapping campi Goodreads → schema DB
- [ ] Gestione duplicati (deduplication per ISBN)

### MVP Completato
Puoi importare i tuoi 80 libri e vederli su un bello scaffale dark. ✓

---

## Fase 2 — Beta (Settimane 7-14)
**Obiettivo: app completa con dashboard, statistiche, citazioni, ricerca avanzata.**

### 2.1 — Dashboard Statistiche (Settimana 7-8)
- [ ] `StatCard` componenti: libri letti, pagine, media voti, autore preferito
- [ ] Grafico libri per anno (bar chart, Recharts)
- [ ] Grafico pagine per mese (area chart)
- [ ] Distribuzione generi (pie chart con colori genere)
- [ ] Velocità lettura media (pagine/giorno)
- [ ] Record personali (libro più lungo, più breve, lettura più veloce)
- [ ] Obiettivo annuale con progress bar

### 2.2 — Gestione Citazioni (Settimana 8)
- [ ] Lista citazioni con filtri (libro, autore, preferite)
- [ ] Aggiungi citazione da pannello libro
- [ ] Card citazione con stile elegante (border-left oro, EB Garamond italic)
- [ ] Search full-text nelle citazioni
- [ ] Export citazioni (copia testo, export PDF semplice)

### 2.3 — Pagine Autori e Generi (Settimana 9)
- [ ] Pagina autori: lista con foto (Open Library), numero libri, avg rating
- [ ] Pagina generi: griglia generi con percentuali e libri
- [ ] Click autore/genere → filtra scaffale
- [ ] Generi custom: aggiungi/modifica/cancella

### 2.4 — Timeline Intellettuale (Settimana 10)
- [ ] Visualizzazione verticale anni → libri letti
- [ ] Raggruppamento per anno con generi dominanti
- [ ] Animazione scroll con reveal progressivo
- [ ] Note personali per anno (es: "Anno in cui ho scoperto la filosofia stoica")
- [ ] Mini-stat per anno: libri, pagine, media voti

### 2.5 — Sezione "Da Leggere" (Settimana 11)
- [ ] Lista wishlist con ordinamento priorità
- [ ] Drag & drop per riordinare (usare @dnd-kit)
- [ ] Vista scaffale "scaffale futuro" (separato da letti)
- [ ] Stima tempo lettura basata su velocità storica
- [ ] Aggiungi da suggerimenti AI (Fase 3)

### 2.6 — Preferiti e Scaffale Custom (Settimana 12)
- [ ] Toggle preferito su ogni libro
- [ ] Vista "preferiti" con scaffale dedicato
- [ ] Riordinamento manuale scaffale (drag & drop)
- [ ] Scaffali tematici custom (es: "I 10 libri che mi hanno cambiato")

### 2.7 — Ricerca e Filtri Avanzati (Settimana 13)
- [ ] Search globale: titolo, autore, citazione, nota
- [ ] Filtri combinati: genere + anno + voto + stato + lingua + formato
- [ ] Sort: per data lettura, voto, titolo, autore, pagine
- [ ] Salvataggio filtri come "viste salvate"

### 2.8 — Polish e Performance (Settimana 14)
- [ ] Ottimizzazione copertine (Next Image, WebP, lazy loading)
- [ ] Virtualizzazione scaffale per >100 libri (react-window)
- [ ] PWA: manifest + service worker (offline básico)
- [ ] Meta tags SEO (per condivisione link personale)
- [ ] Testing: componenti critici

---

## Fase 3 — AI Features (Settimane 15-22)
**Obiettivo: la libreria "ti conosce" e ti suggerisce il prossimo libro.**

### 3.1 — Setup AI Pipeline (Settimana 15)
- [ ] Supabase Edge Function per chiamate AI (protegge la API key)
- [ ] Wrapper Claude API con streaming
- [ ] Rate limiting (1 analisi AI ogni 24h)
- [ ] Cache risultati AI in DB (evita costi ripetuti)

### 3.2 — Profilo Lettore AI (Settimana 16)
- [ ] Analisi di: titoli, autori, generi, voti, recensioni, timeline
- [ ] Output strutturato: tipo lettore, temi ricorrenti, evoluzione nel tempo
- [ ] UI: card profilo animata con tipo lettore + descrizione
- [ ] Rigenerazione manuale (+ risparmio nella cache)

**Prompt esempio Claude:**
```
Analizza la libreria di questo lettore:
- Libri letti: [lista con generi, voti, recensioni]
- Timeline: [libri per anno]
- Autori preferiti (voto > 8): [lista]

Genera un profilo lettore con:
1. Tipo (uno tra: Esploratore/Strategico/Introspettivo/Tecnico/Umanista)
2. Titolo evocativo (es: "Il Cercatore di Pattern")
3. Descrizione 150 parole
4. 5 temi ricorrenti rilevati
5. Nota sull'evoluzione degli interessi nel tempo
```

### 3.3 — Suggerimenti AI (Settimana 17-18)
- [ ] 3 categorie: "Molto compatibile", "Ti sfiderà", "Probabilmente non gradiresti"
- [ ] Per ogni suggerimento: titolo, autore, motivo in 1 frase
- [ ] Link a Open Library / Goodreads
- [ ] "Aggiungi a Da Leggere" con un click
- [ ] Refresh settimanale automatico

### 3.4 — Percorsi di Lettura AI (Settimana 19)
- [ ] AI genera percorso tematico (es: "Percorso Stoicismo: 6 libri ordinati")
- [ ] Visualizzazione a timeline/progressione
- [ ] Basato su interessi rilevati + lacune nella libreria
- [ ] 3 percorsi suggeriti attivi alla volta

### 3.5 — Insight AI sulla Dashboard (Settimana 20)
- [ ] Frase settimanale su un pattern interessante della libreria
- [ ] "Hai letto molto [genere] nel [periodo], ecco perché potrebbe interessarti..."
- [ ] Confronto con media lettori simili (dati generali, non personali)
- [ ] Previsione: "Al ritmo attuale finirai l'obiettivo annuale entro..."

### 3.6 — Analisi Timeline con AI (Settimana 21-22)
- [ ] AI analizza l'evoluzione degli interessi anno per anno
- [ ] Genera testo narrativo: "Dal 2021 al 2025, il tuo percorso..."
- [ ] Visualizzazione grafica dell'evoluzione temi
- [ ] Export come PDF "Il Mio Viaggio da Lettore"

---

## Fase 4 — Libreria Immersiva Avanzata (Settimane 23-32)
**Obiettivo: la stanza virtuale diventa davvero immersiva.**

### 4.1 — Vista Stanza 3D (Settimane 23-26)
- [ ] React Three Fiber + Three.js
- [ ] Modello 3D stanza (semplice, ottimizzato)
- [ ] Scaffali 3D con dorsi libri visibili
- [ ] Click su libro → zoom + dettaglio
- [ ] Ambient lighting (simula lampada)
- [ ] Performance: LOD (Level of Detail) per libri distanti
- [ ] Toggle 2D/3D (fallback per dispositivi deboli)

### 4.2 — Dorso Libro Dinamico (Settimana 27)
- [ ] Generazione automatica dorso con: titolo, autore, colore basato su genere
- [ ] Font elegante sul dorso (Cormorant Garamond verticale)
- [ ] Spessore proporzionale al numero di pagine
- [ ] Opzione: caricare foto del dorso reale

### 4.3 — Effetti Atmosferici (Settimana 28)
- [ ] Particelle polvere fluttuanti (CSS/canvas sottile)
- [ ] Effetto luce dinamica (mouse parallax sulla luce)
- [ ] Transizioni tra scaffali fluide
- [ ] Suono opzionale: ambience biblioteca (toggle off by default)

### 4.4 — Integrazione Readwise (Settimana 29-30)
- [ ] OAuth con Readwise
- [ ] Import highlight + note + citazioni
- [ ] Sync automatico giornaliero
- [ ] "Daily Quote" dalla propria libreria

### 4.5 — Import Kindle (Settimana 31)
- [ ] Parser `My Clippings.txt` (file Kindle highlight)
- [ ] Mapping automatico highlight → citazioni nel DB
- [ ] Istruzioni per esportare da Kindle

### 4.6 — Condivisione Selettiva (Settimana 32)
- [ ] Pagina pubblica condivisibile (opzionale, opt-in)
- [ ] Condividi: "Ho letto X libri in [anno]" come immagine
- [ ] Export scaffale come immagine (html2canvas)
- [ ] Export stats annuali come "wrapped" visuale

---

## Monetizzazione (dopo MVP stabile)

> L'app è personale, ma se vuoi renderla prodotto...

### Modello Freemium

| Feature | Free | Pro (€4.99/mese) |
|---|---|---|
| Libri nella libreria | fino a 25 | illimitati |
| Scaffale visivo 2D | ✓ | ✓ |
| Dashboard base | ✓ | ✓ |
| AI profilo lettore | 1 al mese | illimitato |
| AI suggerimenti | 3 | illimitati + percorsi |
| Vista 3D stanza | — | ✓ |
| Import Goodreads/Kindle | — | ✓ |
| Export PDF "Il mio viaggio" | — | ✓ |
| Readwise integration | — | ✓ |
| Scaffali custom illimitati | — | ✓ |

### Alternativa: Self-host gratuito
Poiché è Open Source, molti utenti tecnici useranno il self-host.
Il modello Pro funziona come SaaS hosted per chi non vuole configurare.

### Revenue secondario (futuro)
- Affiliate Amazon Kindle (link acquisto libri con tag affiliato)
- Partnership editoriali per promuovere nuove uscite ai lettori profilati

---

## Analisi Competitiva

### vs. Goodreads
| Aspetto | Goodreads | Biblioteca Digitale |
|---|---|---|
| Focus | Social + catalogo pubblico | Esperienza personale |
| UI | Datata, lenta | Immersiva, moderna |
| AI | Nessuna | Profilo + suggerimenti |
| Privacy | Pubblico per default | Privato per default |
| Vista scaffale | No | Sì (USP principale) |
| Integrazione Kindle | Sì (Amazon) | Parziale |
| Citazioni | Sì (limitate) | Completa |
| Timeline intellettuale | No | Sì |

### vs. StoryGraph
| Aspetto | StoryGraph | Biblioteca Digitale |
|---|---|---|
| Focus | Statistiche avanzate | Esperienza emotiva |
| UI | Moderna ma fredda | Calda, immersiva |
| AI | Raccomandazioni | Profilo profondo + evoluzione |
| Mood tracking | Sì | No (non previsto) |
| Vista scaffale | No | Sì |
| Prezzi | Gratuita (con Plus) | Freemium |

### Differenziatore Chiave
> StoryGraph analizza cosa leggi. Goodreads mostra agli altri cosa leggi.
> **Biblioteca Digitale ti fa SENTIRE la tua libreria.**

---

## Stima Tempi Totali

| Fase | Durata | Effort realistico (ore) |
|---|---|---|
| Setup | 1 settimana | 10-15h |
| MVP | 5 settimane | 60-80h |
| Beta | 8 settimane | 100-120h |
| AI Features | 8 settimane | 80-100h |
| Libreria 3D | 10 settimane | 100-150h |
| **Totale** | **~32 settimane** | **350-465h** |

> A 10-15 ore/settimana (sviluppatore part-time): circa 6-9 mesi per il prodotto completo.
> A 20-25 ore/settimana (focus intenso): circa 4-6 mesi.
