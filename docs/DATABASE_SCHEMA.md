# Schema Database — PostgreSQL / Supabase

---

## Tabelle Principali

### `profiles`
Profilo utente esteso (estende auth.users di Supabase).

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  bio           text,
  reading_goal  integer default 12,     -- libri/anno obiettivo
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
create policy "User owns profile" on profiles
  for all using (auth.uid() = id);
```

---

### `books` — Catalogo libri (dati bibliografici)
Dati oggettivi del libro (separati dai dati personali).

```sql
create table books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,

  -- Identificatori
  isbn_13         text,
  isbn_10         text,
  open_library_id text,    -- es: OL123456W
  google_books_id text,    -- es: xxxxxxxxxxxxxx

  -- Bibliografici
  title           text not null,
  subtitle        text,
  authors         text[] not null default '{}',  -- array autori
  publisher       text,
  published_year  integer,
  language        text default 'it',
  page_count      integer,
  genres          text[] default '{}',           -- generi bibliografici

  -- Copertina
  cover_url       text,                   -- URL esterno (Open Library / Google Books)
  cover_custom_url text,                  -- URL Supabase Storage (se caricata custom)

  -- Edizione scelta
  edition_note    text,                   -- es: "Edizione BUR 2020"

  -- Formato
  format          text default 'ebook'    -- 'ebook' | 'cartaceo' | 'audio'
    check (format in ('ebook','cartaceo','audio')),

  -- Provenienza
  source          text default 'manual'   -- 'manual'|'kindle'|'goodreads'|'csv'|'readwise'
    check (source in ('manual','kindle','goodreads','csv','readwise')),

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index books_user_id_idx on books(user_id);
create index books_isbn_idx on books(isbn_13, isbn_10);
create index books_authors_idx on books using gin(authors);
create index books_genres_idx on books using gin(genres);
create index books_fts_idx on books using gin(
  to_tsvector('italian', coalesce(title,'') || ' ' || coalesce(array_to_string(authors,' '),''))
);

alter table books enable row level security;
create policy "User owns books" on books
  for all using (auth.uid() = user_id);
```

---

### `reading_entries` — Letture personali
Dati soggettivi: quando hai letto, voto, recensione.

```sql
create table reading_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  book_id         uuid not null references books(id) on delete cascade,

  -- Stato
  status          text not null default 'da_leggere'
    check (status in ('da_leggere','in_corso','letto','abbandonato','rileggendo')),

  -- Date lettura
  started_at      date,
  finished_at     date,
  reading_time_h  numeric(6,2),  -- ore di lettura (se tracciato manualmente)

  -- Valutazione
  rating          smallint check (rating >= 1 and rating <= 10),
  review          text,
  is_favorite     boolean default false,

  -- Rileggiture
  reread_count    integer default 0,

  -- Meta
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  unique (user_id, book_id)  -- un utente → una entry per libro
);

create index re_user_id_idx on reading_entries(user_id);
create index re_book_id_idx on reading_entries(book_id);
create index re_status_idx on reading_entries(user_id, status);
create index re_finished_idx on reading_entries(user_id, finished_at desc);

alter table reading_entries enable row level security;
create policy "User owns reading entries" on reading_entries
  for all using (auth.uid() = user_id);
```

---

### `quotes` — Citazioni e highlight

```sql
create table quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,

  content     text not null,
  page_number integer,
  location    text,          -- posizione Kindle (es: "Location 1234")
  chapter     text,
  note        text,          -- nota personale alla citazione
  is_favorite boolean default false,
  source      text default 'manual'  -- 'manual'|'kindle'|'readwise'
    check (source in ('manual','kindle','readwise')),

  created_at  timestamptz default now()
);

create index quotes_user_book_idx on quotes(user_id, book_id);
create index quotes_fts_idx on quotes using gin(
  to_tsvector('italian', content)
);

alter table quotes enable row level security;
create policy "User owns quotes" on quotes
  for all using (auth.uid() = user_id);
```

---

### `user_genres` — Generi personalizzati

```sql
create table user_genres (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  color       text,           -- colore hex custom
  icon        text,           -- nome icona Lucide
  sort_order  integer default 0,
  created_at  timestamptz default now(),

  unique (user_id, name)
);

alter table user_genres enable row level security;
create policy "User owns genres" on user_genres
  for all using (auth.uid() = user_id);
```

---

### `book_genres` — Relazione libro ↔ genere utente

```sql
create table book_genres (
  book_id     uuid not null references books(id) on delete cascade,
  genre_id    uuid not null references user_genres(id) on delete cascade,
  primary key (book_id, genre_id)
);

alter table book_genres enable row level security;
create policy "User owns book genres" on book_genres
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );
```

---

### `shelf_layout` — Posizione libri sullo scaffale
Permette all'utente di riordinare i libri sugli scaffali.

```sql
create table shelf_layout (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  book_id     uuid not null references books(id) on delete cascade,
  shelf_row   integer not null default 0,    -- riga scaffale (0 = prima riga)
  position    integer not null default 0,    -- posizione nella riga
  updated_at  timestamptz default now(),

  unique (user_id, book_id)
);

alter table shelf_layout enable row level security;
create policy "User owns shelf layout" on shelf_layout
  for all using (auth.uid() = user_id);
```

---

### `ai_profiles` — Profili lettore generati da AI

```sql
create table ai_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  profile_type    text,        -- 'esploratore'|'strategico'|'introspettivo'|'tecnico'
  profile_title   text,        -- Es: "Il Lettore Esploratore"
  profile_summary text,        -- Descrizione estesa
  top_themes      text[],      -- Temi principali rilevati
  top_authors     text[],      -- Autori preferiti rilevati dall'AI
  evolution_note  text,        -- Nota sull'evoluzione nel tempo
  generated_at    timestamptz default now(),
  model_used      text         -- 'claude-sonnet-4-6' | 'gpt-4o'
);

alter table ai_profiles enable row level security;
create policy "User owns ai profiles" on ai_profiles
  for all using (auth.uid() = user_id);
```

---

### `ai_suggestions` — Suggerimenti libri da AI

```sql
create table ai_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  title           text not null,
  authors         text[],
  reason          text,           -- perché l'AI lo suggerisce
  match_score     numeric(4,2),   -- 0-10
  category        text            -- 'compatibile'|'sfida'|'percorso'|'incompatibile'
    check (category in ('compatibile','sfida','percorso','incompatibile')),
  isbn_13         text,
  cover_url       text,
  added_to_list   boolean default false,
  generated_at    timestamptz default now()
);

alter table ai_suggestions enable row level security;
create policy "User owns suggestions" on ai_suggestions
  for all using (auth.uid() = user_id);
```

---

## Views Utili

### `v_books_with_reading` — Vista join libro + lettura

```sql
create view v_books_with_reading as
select
  b.*,
  re.status,
  re.rating,
  re.review,
  re.is_favorite,
  re.started_at,
  re.finished_at,
  re.reading_time_h,
  re.reread_count
from books b
left join reading_entries re on re.book_id = b.id and re.user_id = b.user_id;
```

### `v_user_stats` — Statistiche aggregated per utente

```sql
create view v_user_stats as
select
  b.user_id,
  count(*) filter (where re.status = 'letto')                     as books_read,
  count(*) filter (where re.status = 'da_leggere')               as books_to_read,
  count(*) filter (where re.status = 'in_corso')                 as books_reading,
  sum(b.page_count) filter (where re.status = 'letto')           as pages_read,
  round(avg(re.rating) filter (where re.rating is not null), 1)  as avg_rating,
  count(distinct unnest(b.authors))                               as unique_authors,
  max(re.rating)                                                  as max_rating,
  min(re.rating) filter (where re.rating is not null)            as min_rating
from books b
left join reading_entries re on re.book_id = b.id and re.user_id = b.user_id
group by b.user_id;
```

---

## Funzioni PostgreSQL

### Calcolo velocità lettura media

```sql
create or replace function reading_speed_pages_per_day(p_user_id uuid)
returns numeric as $$
  select round(avg(b.page_count / nullif(re.finished_at - re.started_at, 0)), 1)
  from books b
  join reading_entries re on re.book_id = b.id
  where b.user_id = p_user_id
    and re.status = 'letto'
    and re.started_at is not null
    and re.finished_at is not null
    and re.finished_at > re.started_at
    and b.page_count > 0;
$$ language sql security definer;
```

### Libri letti per anno

```sql
create or replace function books_per_year(p_user_id uuid)
returns table(year integer, count bigint) as $$
  select
    extract(year from re.finished_at)::integer as year,
    count(*) as count
  from reading_entries re
  join books b on b.id = re.book_id
  where re.user_id = p_user_id
    and re.status = 'letto'
    and re.finished_at is not null
  group by 1
  order by 1;
$$ language sql security definer;
```

---

## Seed Data — Generi Default

```sql
-- Eseguire dopo il primo login utente
insert into user_genres (user_id, name, color, icon, sort_order) values
  (auth.uid(), 'Narrativa',         '#7B3F8A', 'BookOpen',    1),
  (auth.uid(), 'Fantasy',           '#2A6B3A', 'Wand2',       2),
  (auth.uid(), 'Saggistica',        '#2A5080', 'GraduationCap',3),
  (auth.uid(), 'Business',          '#8A5020', 'Briefcase',   4),
  (auth.uid(), 'Crescita Personale','#3D7A5A', 'TrendingUp',  5),
  (auth.uid(), 'Psicologia',        '#5A3080', 'Brain',       6),
  (auth.uid(), 'Biografie',         '#7A3020', 'User',        7),
  (auth.uid(), 'Altro',             '#5A5A5A', 'Tag',         8);
```

---

## Migrations Ordine di Esecuzione

```
001_create_profiles.sql
002_create_books.sql
003_create_reading_entries.sql
004_create_quotes.sql
005_create_user_genres.sql
006_create_book_genres.sql
007_create_shelf_layout.sql
008_create_ai_tables.sql
009_create_views.sql
010_create_functions.sql
011_seed_genres.sql
```
