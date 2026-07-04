-- ============================================================
-- Vibrazioni Letterarie — Schema iniziale
-- Esegui nel SQL Editor di supabase.com/dashboard
-- ============================================================

-- Abilita estensioni
create extension if not exists "uuid-ossp";

-- ── Tabella books ──────────────────────────────────────────
create table if not exists public.books (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  isbn_13           text,
  isbn_10           text,
  open_library_id   text,
  google_books_id   text,
  title             text not null,
  subtitle          text,
  authors           text[] not null default '{}',
  publisher         text,
  published_year    integer,
  language          text not null default 'it',
  page_count        integer,
  genres            text[] not null default '{}',
  cover_url         text,
  cover_custom_url  text,
  edition_note      text,
  format            text not null default 'ebook' check (format in ('ebook','cartaceo','audio')),
  source            text not null default 'manual',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Tabella reading_entries ────────────────────────────────
create table if not exists public.reading_entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  book_id         uuid not null references public.books(id) on delete cascade,
  status          text not null default 'da_leggere'
                    check (status in ('da_leggere','in_corso','letto','abbandonato','rileggendo')),
  started_at      date,
  finished_at     date,
  reading_time_h  numeric(6,2),
  rating          integer check (rating between 1 and 10),
  review          text,
  is_favorite     boolean not null default false,
  reread_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, book_id)
);

-- ── Tabella quotes ─────────────────────────────────────────
create table if not exists public.quotes (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  book_id      uuid not null references public.books(id) on delete cascade,
  content      text not null,
  page_number  integer,
  location     text,
  chapter      text,
  note         text,
  is_favorite  boolean not null default false,
  source       text not null default 'manual',
  created_at   timestamptz not null default now()
);

-- ── Tabella wishlist (Da leggere con priorità) ──────────────
create table if not exists public.wishlist (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  priority   integer not null default 999,
  notes      text,
  added_at   timestamptz not null default now(),
  unique (user_id, book_id)
);

-- ── RLS (Row Level Security) ───────────────────────────────
alter table public.books           enable row level security;
alter table public.reading_entries enable row level security;
alter table public.quotes          enable row level security;
alter table public.wishlist        enable row level security;

-- Policy: ogni utente vede e modifica solo i propri dati
create policy "books_own"     on public.books           for all using (auth.uid() = user_id);
create policy "entries_own"   on public.reading_entries for all using (auth.uid() = user_id);
create policy "quotes_own"    on public.quotes          for all using (auth.uid() = user_id);
create policy "wishlist_own"  on public.wishlist        for all using (auth.uid() = user_id);

-- ── Vista books_with_reading (join utile) ─────────────────
create or replace view public.books_with_reading as
  select
    b.*,
    r.status,
    r.rating,
    r.review,
    r.is_favorite,
    r.started_at,
    r.finished_at,
    r.reading_time_h,
    r.reread_count
  from public.books b
  left join public.reading_entries r
    on b.id = r.book_id and b.user_id = r.user_id;

-- ── Funzione updated_at automatico ────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create trigger entries_updated_at
  before update on public.reading_entries
  for each row execute function public.set_updated_at();

-- ── Storage bucket per copertine personalizzate ────────────
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "covers_read"   on storage.objects for select using (bucket_id = 'covers');
create policy "covers_upload" on storage.objects for insert with check (
  bucket_id = 'covers' and auth.uid() is not null
);
create policy "covers_delete" on storage.objects for delete using (
  bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1]
);
