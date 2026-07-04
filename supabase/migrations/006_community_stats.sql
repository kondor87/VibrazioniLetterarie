-- ============================================================
-- 006 — Community: layer di aggregazione cross-utente (anonimo)
-- ============================================================
-- Modello reale: `books` è il catalogo GLOBALE (dedup per
-- google_books_id/isbn_13 in fase di add), `user_books` è il join
-- per-utente. Quindi l'identità "stesso libro tra utenti" è
-- direttamente `book_id`. La matview espone SOLO aggregati anonimi
-- per libro: nessun user_id ne esce. La soglia k-anonimato è
-- applicata lato API, così la matview resta sorgente grezza riusabile.

create materialized view if not exists public.community_book_stats as
with e as (
  select
    ub.book_id,
    ub.user_id,
    ub.status,
    ub.rating,
    ub.created_at,
    -- pagine/giorno: velocità normalizzata (non i giorni grezzi)
    case
      when ub.started_at is not null and ub.finished_at is not null
       and b.page_count > 0 and ub.finished_at >= ub.started_at
      then b.page_count::numeric / greatest(1, (ub.finished_at - ub.started_at))
      else null
    end as ppd,
    case
      when ub.started_at is not null and ub.finished_at is not null
       and ub.finished_at >= ub.started_at
      then greatest(1, (ub.finished_at - ub.started_at))
      else null
    end as days
  from public.user_books ub
  join public.books b on b.id = ub.book_id
)
select
  e.book_id,
  b.title,
  b.authors,
  b.cover_url,
  b.isbn_13,
  b.page_count,
  count(distinct e.user_id)                                                      as readers,
  count(distinct e.user_id) filter (where e.status in ('letto','rileggendo'))    as completed,
  count(distinct e.user_id) filter (where e.status = 'abbandonato')              as abandoned,
  count(distinct e.user_id) filter (where e.status = 'in_corso')                 as reading_now,
  count(distinct e.user_id) filter (where e.created_at > now() - interval '7 days') as added_7d,
  avg(e.rating)             filter (where e.rating is not null)                  as avg_rating,
  count(e.rating)                                                                as rating_count,
  avg(e.ppd)                filter (where e.ppd is not null and e.ppd <= 400)    as avg_pages_per_day,
  avg(e.days)               filter (where e.days is not null)                    as avg_days_to_finish,
  count(*)                  filter (where e.ppd is not null)                     as velocity_sample
from e
join public.books b on b.id = e.book_id
group by e.book_id, b.title, b.authors, b.cover_url, b.isbn_13, b.page_count;

-- indice unico → consente REFRESH ... CONCURRENTLY
create unique index if not exists community_book_stats_book_id
  on public.community_book_stats (book_id);

-- solo il service role legge la matview (le API server applicano la soglia)
grant select on public.community_book_stats to service_role;

-- funzione di refresh (chiamata da route cron-protetta)
create or replace function public.refresh_community_stats()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.community_book_stats;
exception when others then
  -- primo refresh (matview mai popolata) non può essere CONCURRENTLY
  refresh materialized view public.community_book_stats;
end;
$$;
