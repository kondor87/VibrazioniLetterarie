-- ═══════════════════════════════════════════════════════════════════════
--  Biblioteca Digitale — Schema Supabase
--  Esegui questo file nel SQL Editor di supabase.com → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- UUID
create extension if not exists "uuid-ossp";

-- ─── Catalogo libri (globale, condiviso tra utenti) ──────────────────────────
create table if not exists books (
  id               uuid primary key default uuid_generate_v4(),
  google_books_id  text unique,
  open_library_id  text,
  isbn_13          text,
  isbn_10          text,
  title            text not null,
  subtitle         text,
  authors          text[] not null default '{}',
  publisher        text,
  published_year   int,
  language         text not null default 'it',
  page_count       int,
  genres           text[] not null default '{}',
  cover_url        text,
  description      text,
  created_at       timestamptz not null default now()
);

create index if not exists books_isbn13_idx on books (isbn_13);
create index if not exists books_google_idx on books (google_books_id);

-- ─── Libreria utente (relazione utente ↔ libro) ──────────────────────────────
create table if not exists user_books (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  book_id         uuid references books(id)      on delete cascade not null,
  status          text not null
                    check (status in ('da_leggere','in_corso','letto','abbandonato','rileggendo')),
  format          text not null default 'ebook'
                    check (format in ('ebook','cartaceo','audio')),
  rating          numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  review          text,
  is_favorite     boolean not null default false,
  started_at      date,
  finished_at     date,
  reading_time_h  numeric,
  reread_count    int not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, book_id)
);

create index if not exists user_books_user_idx on user_books (user_id);
create index if not exists user_books_status_idx on user_books (user_id, status);

-- ─── Citazioni ───────────────────────────────────────────────────────────────
create table if not exists quotes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  book_id      uuid references books(id)      on delete cascade not null,
  content      text not null,
  page_number  int,
  location     text,
  chapter      text,
  note         text,
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists quotes_user_idx on quotes (user_id);

-- ─── Vista: libreria utente con dati libro joinati ───────────────────────────
create or replace view user_library as
  select
    ub.id,
    ub.user_id,
    b.id               as book_id,
    b.google_books_id,
    b.open_library_id,
    b.isbn_13,
    b.isbn_10,
    b.title,
    b.subtitle,
    b.authors,
    b.publisher,
    b.published_year,
    b.language,
    b.page_count,
    b.genres,
    b.cover_url,
    b.description,
    ub.status,
    ub.format,
    ub.rating,
    ub.review,
    ub.is_favorite,
    ub.started_at,
    ub.finished_at,
    ub.reading_time_h,
    ub.reread_count,
    ub.notes,
    ub.created_at,
    ub.updated_at
  from user_books ub
  join books b on b.id = ub.book_id;

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on user_books;
create trigger set_updated_at
  before update on user_books
  for each row execute function update_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table books      enable row level security;
alter table user_books enable row level security;
alter table quotes     enable row level security;

-- Books: tutti possono leggere, solo utenti autenticati possono inserire
create policy "books_read_all"    on books for select using (true);
create policy "books_insert_auth" on books for insert with check (auth.role() = 'authenticated');
create policy "books_update_auth" on books for update using (auth.role() = 'authenticated');

-- User books: solo le proprie righe
create policy "user_books_all" on user_books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Quotes: solo le proprie
create policy "quotes_all" on quotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Seed di test: i tuoi 79 libri Kindle ────────────────────────────────────
-- Dopo aver creato il tuo utente (auth.users), esegui questo insert
-- sostituendo '<YOUR_USER_UUID>' con il tuo user_id (lo trovi in Authentication → Users)
--
-- Esempio:
-- insert into books (title, authors, published_year, genres, status_hint)
-- values ('Il vecchio e il mare', '{Ernest Hemingway}', 1952, '{Narrativa}', 'letto');
--
-- Poi aggiungi le entry in user_books per legarle al tuo account.
-- Lo script completo di seed è in supabase/seed.sql
