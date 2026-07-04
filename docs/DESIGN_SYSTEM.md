# Design System — Biblioteca Digitale Personale
> Generato con metodologia **UI/UX Pro Max v2.5** · Categoria: Personal Cultural Platform

---

## 1. Analisi di Prodotto (UI/UX Pro Max Reasoning Engine)

| Campo | Valore |
|---|---|
| Categoria prodotto | Personal Knowledge + Cultural Platform |
| Stile primario | **Victorian Dark Mode** + Glassmorphism |
| Stile secondario | Warm OLED Dark + Neumorphism leggero |
| Landing pattern | — (app personale, no landing pubblica) |
| Dashboard style | Executive Dashboard + Data Storytelling |
| Focus colore | Warm amber-gold + Mahogany dark |
| Font pairing | Cormorant Garamond / Inter |
| Anti-pattern da evitare | Design flat sterile, neon freddi, Comic Sans, palette blu-corporate |

---

## 2. Palette Colori

### Colori Base (Dark Victorian Library)

```css
:root {
  /* Backgrounds */
  --bg-void:        #080503;   /* Nero caldo profondo — sfondo principale */
  --bg-room:        #100A05;   /* Stanza/base della libreria */
  --bg-surface-1:   #1A1008;   /* Superfici primarie (sidebar) */
  --bg-surface-2:   #231508;   /* Card, pannelli */
  --bg-surface-3:   #2E1C0A;   /* Elementi sollevati, hover */
  --bg-shelf:       #3D2510;   /* Scaffale legno scuro */
  --bg-shelf-light: #5C3A1E;   /* Scaffale legno chiaro (dettaglio) */

  /* Accenti */
  --accent-gold:    #C89010;   /* Oro primario — CTA, attivo, evidenziato */
  --accent-amber:   #E8B040;   /* Ambra — hover, focus */
  --accent-copper:  #B06020;   /* Rame — secondario */
  --accent-cream:   #F0D8A8;   /* Crema calda — icone selezionate */

  /* Testo */
  --text-primary:   #F5E6C8;   /* Testo principale — crema calda */
  --text-secondary: #C4A068;   /* Testo secondario — ambra desaturata */
  --text-tertiary:  #8A6040;   /* Testo terziario — brown chiaro */
  --text-muted:     #5A3820;   /* Muted — decorativo */
  --text-inverse:   #0D0804;   /* Su sfondi chiari */

  /* Bordi */
  --border-subtle:  #3D250F40; /* Bordi sottili (16% opacità) */
  --border-medium:  #6B3E1A60; /* Bordi medi (38% opacità) */
  --border-accent:  #C8901050; /* Bordi oro (32% opacità) */

  /* Glow / Ambient */
  --glow-gold:      #C8901020; /* Ambient glow oro */
  --glow-amber:     #E8B04015; /* Ambient glow ambra */
  --glow-lamp:      #FF8C0008; /* Effetto lampada distante */

  /* Semantici */
  --color-success:  #4A8C2A;   /* Verde foresta */
  --color-warning:  #D4870A;   /* Arancio ambra */
  --color-error:    #9B2D20;   /* Rosso bordò */
  --color-info:     #2A6080;   /* Blu inchiostro */

  /* Rating Stars */
  --star-filled:    #E8B040;
  --star-empty:     #3D2510;
}
```

### Palette Semantica Generi

```css
:root {
  --genre-narrativa:    #7B3F8A;  /* Viola narrativo */
  --genre-fantasy:      #2A6B3A;  /* Verde foresta */
  --genre-saggistica:   #2A5080;  /* Blu inchiostro */
  --genre-business:     #8A5020;  /* Bronzo */
  --genre-crescita:     #3D7A5A;  /* Verde salvia */
  --genre-psicologia:   #5A3080;  /* Viola profondo */
  --genre-biografie:    #7A3020;  /* Rosso borgogna */
  --genre-altro:        #5A5A5A;  /* Grigio neutro */
}
```

---

## 3. Tipografia

### Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Display — titoli grandi, nome app, titoli libri */
  --font-display: 'Cormorant Garamond', 'Georgia', serif;

  /* Body — testo lungo, recensioni, descrizioni */
  --font-body: 'EB Garamond', 'Georgia', serif;

  /* UI — elementi funzionali, label, navigazione */
  --font-ui: 'Inter', -apple-system, sans-serif;

  /* Monospace — statistiche, numeri, date */
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

### Scale Tipografica

```css
:root {
  /* Scale */
  --text-xs:   0.75rem;   /* 12px — meta, label tiny */
  --text-sm:   0.875rem;  /* 14px — caption, meta */
  --text-base: 1rem;      /* 16px — body standard */
  --text-lg:   1.125rem;  /* 18px — body grande */
  --text-xl:   1.25rem;   /* 20px — subheading */
  --text-2xl:  1.5rem;    /* 24px — heading */
  --text-3xl:  1.875rem;  /* 30px — heading grande */
  --text-4xl:  2.25rem;   /* 36px — title */
  --text-5xl:  3rem;      /* 48px — display */
  --text-6xl:  3.75rem;   /* 60px — hero display */

  /* Line Height */
  --leading-tight:  1.25;
  --leading-snug:   1.375;
  --leading-normal: 1.5;
  --leading-relaxed:1.625;
  --leading-loose:  2;

  /* Letter Spacing */
  --tracking-tight:  -0.025em;
  --tracking-normal: 0em;
  --tracking-wide:   0.025em;
  --tracking-wider:  0.05em;
  --tracking-widest: 0.1em;
}
```

### Utilizzo Tipografico

| Elemento | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Nome app / Logo | Cormorant Garamond | 24px | 600 | tracking-wider, uppercase |
| Titolo libro (shelf) | Cormorant Garamond | 14px | 500 | italic |
| Titolo libro (detail) | Cormorant Garamond | 32px | 600 | |
| Autore | Inter | 14px | 400 | text-secondary |
| Recensione | EB Garamond | 17px | 400 | leading-relaxed |
| Citazione | EB Garamond | 18px | 400 italic | border-left gold |
| Nav sidebar | Inter | 13px | 500 | uppercase, tracking-wide |
| Statistiche label | Inter | 11px | 500 | uppercase, tracking-widest |
| Statistiche valore | JetBrains Mono | 24px | 500 | accent-gold |
| Tag / badge | Inter | 11px | 600 | uppercase |
| Bottone primario | Inter | 14px | 600 | |

---

## 4. Spaziatura e Layout

```css
:root {
  /* Spacing scale (8dp base) */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;

  /* Layout */
  --sidebar-width:     220px;
  --sidebar-collapsed: 64px;
  --panel-right-width: 280px;
  --panel-bottom-h:    320px;
  --topbar-height:     56px;

  /* Border Radius */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-book:   0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(200,144,16,0.1);
  --shadow-card:   0 4px 16px rgba(0,0,0,0.4);
  --shadow-panel:  0 0 40px rgba(0,0,0,0.8);
  --shadow-glow:   0 0 20px rgba(200,144,16,0.2);
  --shadow-inset:  inset 0 1px 0 rgba(255,255,255,0.05);
}
```

---

## 5. Effetti Visivi e Animazioni

### Effetti Ambiente Libreria

```css
/* Effetto luce lampada — applicare al container della libreria */
.library-room {
  background:
    radial-gradient(ellipse 60% 40% at 75% 20%, rgba(255,140,0,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 40% 60% at 15% 80%, rgba(200,144,16,0.05) 0%, transparent 50%),
    linear-gradient(180deg, #100A05 0%, #080503 100%);
}

/* Vignetting ai bordi */
.library-room::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(0,0,0,0.7) 100%);
  pointer-events: none;
}

/* Scaffale con profondità */
.bookshelf {
  background: linear-gradient(180deg, #3D2510 0%, #2A1A08 30%, #3D2510 60%, #2A1A08 100%);
  box-shadow: 
    inset 0 2px 4px rgba(0,0,0,0.8),
    inset 0 -1px 2px rgba(200,144,16,0.1),
    0 4px 12px rgba(0,0,0,0.8);
}
```

### Animazioni (rispetta prefers-reduced-motion)

```css
/* Libro hover — sollevamento con glow */
.book-cover {
  transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 250ms ease;
}

.book-cover:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 
    0 16px 40px rgba(0,0,0,0.8),
    0 0 20px rgba(200,144,16,0.3),
    0 0 60px rgba(200,144,16,0.1);
}

/* Entrata scaffale */
@keyframes shelfReveal {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Particelle polvere (opzionale) */
@keyframes dustFloat {
  0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
  20%  { opacity: 0.6; }
  80%  { opacity: 0.3; }
  100% { transform: translateY(-60px) translateX(20px) rotate(360deg); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Componenti UI — Specifiche

### BookCard (copertina sullo scaffale)

```
Dimensioni:  80px × 120px (ratio 2:3)
Border radius: 2px (aspetto libro reale)
Shadow: var(--shadow-book)
Hover: sollevamento 8px + glow oro
Spine (dorso): 12px × 120px, titolo verticale (font-size 9px)
```

### Sidebar Navigation

```
Width: 220px
Background: var(--bg-surface-1) + blur(20px)
Border right: 1px solid var(--border-subtle)
Item height: 40px
Item padding: 0 16px
Active state: background var(--accent-gold)10, border-left 2px solid var(--accent-gold)
Icon size: 18px
Font: Inter 13px, weight 500, uppercase, tracking-wide
```

### BookDetailPanel (pannello inferiore)

```
Height: 320px
Background: var(--bg-surface-2) con gradient overlay
Border top: 1px solid var(--border-medium)
Layout: 3 colonne [copertina larga 200px] [info+recensione flex] [stats+citazioni]
```

### StatCard (pannello destro)

```
Background: var(--bg-surface-2)
Border: 1px solid var(--border-subtle)
Border radius: var(--radius-lg)
Padding: var(--space-4)
Valore: font-mono, text-3xl, accent-gold
Label: font-ui, text-xs, uppercase, tracking-widest, text-tertiary
```

### SearchBar

```
Background: var(--bg-surface-3)
Border: 1px solid var(--border-medium)
Placeholder color: var(--text-muted)
Focus: border-color var(--accent-gold), box-shadow var(--shadow-glow)
Border radius: var(--radius-full)
```

### Rating Stars

```
Filled: ★ var(--star-filled) E8B040
Empty:  ☆ var(--star-empty)
Interactive: cursor pointer, hover glow
```

---

## 7. Icone

- Libreria: usa **Lucide React** (consistente, SVG, tree-shakable)
- NON usare emoji come icone UI
- Dimensione standard: 18px (nav), 16px (inline), 20px (featured)
- Color: currentColor per adattarsi al tema

---

## 8. Breakpoints Responsive

```css
/* Mobile first */
--bp-sm:  640px;   /* Tablet piccolo */
--bp-md:  768px;   /* Tablet */
--bp-lg:  1024px;  /* Desktop piccolo */
--bp-xl:  1280px;  /* Desktop */
--bp-2xl: 1536px;  /* Desktop grande */
```

**Mobile (< 768px)**: sidebar collassata a bottom nav, scaffale in griglia 2 colonne, pannello dettaglio full-screen.

---

## 9. Anti-Pattern da Evitare (UI/UX Pro Max)

- NO palette fredde/blu corporate
- NO design flat sterile senza profondità
- NO animazioni rimbalzanti eccessive
- NO font sans-serif moderni come heading (no Poppins/Nunito per display)
- NO copertine libro senza ombra (sembrano flat)
- NO sidebar con hover troppo lampante (distrae)
- NO stats senza contesto visivo
- NO input senza visible label (solo placeholder)
- NO sezione vuota "nessun libro" senza CTA chiara

---

## 10. Accessibilità (WCAG 2.1 AA)

- Contrasto minimo 4.5:1 per testo normale (verificato: cream su dark bg ✓)
- Touch target minimi 44×44px (anche su copertine mobili)
- Focus visible su tutti gli elementi interattivi
- Alt text su tutte le copertine: `"{Titolo}" di {Autore} — copertina`
- Rispetta `prefers-reduced-motion`
- Rispetta `prefers-color-scheme` (il tema dark è il principale)
- Keyboard navigation completa sulla libreria
