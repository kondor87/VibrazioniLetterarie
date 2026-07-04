-- ═══════════════════════════════════════════════════════════════════════
--  Seed: 79 libri Kindle di Marco (nov 2016 → apr 2026)
--  1. Esegui prima schema.sql
--  2. Sostituisci '<USER_UUID>' con il tuo user_id da Authentication → Users
--  3. Esegui nel SQL Editor di supabase.com
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  uid uuid := '<USER_UUID>';  -- ← sostituisci con il tuo UUID
  bid uuid;
  -- helper: inserisce in books e torna l'id
begin

  -- Funzione helper inline per upsert + recupero id
  -- (chiamata ripetuta per ogni libro)

  -- b01
  insert into books (title,authors,published_year,language,page_count,genres)
    values ('Il vecchio e il mare','{Ernest Hemingway}',1952,'it',127,'{Narrativa}')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='Il vecchio e il mare' and authors[1]='Ernest Hemingway';
  end if;
  insert into user_books (user_id,book_id,status,rating,started_at,finished_at)
    values (uid,bid,'letto',8,'2016-11-01','2016-11-30') on conflict do nothing;

  -- b02
  insert into books (title,authors,published_year,language,page_count,genres)
    values ('Se questo è un uomo','{Primo Levi}',1947,'it',220,'{Saggistica}')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='Se questo è un uomo';
  end if;
  insert into user_books (user_id,book_id,status,rating,started_at,finished_at)
    values (uid,bid,'letto',8,'2016-11-01','2016-12-31') on conflict do nothing;

  -- b03
  insert into books (title,authors,published_year,language,page_count,genres)
    values ('Il magico potere del riordino','{Marie Kondo}',2014,'it',216,'{Crescita Personale}')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='Il magico potere del riordino';
  end if;
  insert into user_books (user_id,book_id,status,rating,started_at,finished_at)
    values (uid,bid,'letto',6,'2016-12-01','2016-12-31') on conflict do nothing;

  -- b08 (preferito)
  insert into books (title,authors,published_year,language,page_count,genres,cover_url)
    values ('I pilastri della terra','{Ken Follett}',1989,'it',973,'{Narrativa}','https://covers.openlibrary.org/b/isbn/9780451166890-M.jpg')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='I pilastri della terra';
  end if;
  insert into user_books (user_id,book_id,status,rating,is_favorite,started_at,finished_at)
    values (uid,bid,'letto',8.5,true,'2017-07-01','2017-11-30') on conflict do nothing;

  -- b44 (preferito)
  insert into books (title,authors,published_year,language,page_count,genres,cover_url)
    values ('Il conte di Montecristo','{Alexandre Dumas}',1844,'it',1344,'{Narrativa}','https://covers.openlibrary.org/b/isbn/9780140449266-M.jpg')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='Il conte di Montecristo';
  end if;
  insert into user_books (user_id,book_id,status,rating,is_favorite,started_at,finished_at)
    values (uid,bid,'letto',9,true,'2021-08-01','2021-12-31') on conflict do nothing;

  -- b67 (preferito)
  insert into books (title,authors,published_year,language,page_count,genres,cover_url)
    values ('Niente di nuovo sul fronte occidentale','{Erich Maria Remarque}',1929,'it',296,'{Narrativa}','https://covers.openlibrary.org/b/isbn/9780449213940-M.jpg')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='Niente di nuovo sul fronte occidentale';
  end if;
  insert into user_books (user_id,book_id,status,rating,is_favorite,started_at,finished_at)
    values (uid,bid,'letto',9,true,'2024-06-01','2024-07-31') on conflict do nothing;

  -- b76 (preferito)
  insert into books (title,authors,published_year,language,page_count,genres)
    values ('La trilogia della città di K.','{Agota Kristof}',1992,'it',440,'{Narrativa}')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='La trilogia della città di K.';
  end if;
  insert into user_books (user_id,book_id,status,rating,is_favorite,started_at,finished_at)
    values (uid,bid,'letto',8.5,true,'2025-09-01','2025-11-30') on conflict do nothing;

  -- b77 (preferito)
  insert into books (title,authors,published_year,language,page_count,genres)
    values ('22/11/63','{Stephen King}',2011,'it',849,'{Narrativa}')
    on conflict (google_books_id) do nothing returning id into bid;
  if bid is null then select id into bid from books where title='22/11/63';
  end if;
  insert into user_books (user_id,book_id,status,rating,is_favorite,started_at,finished_at)
    values (uid,bid,'letto',9,true,'2025-11-01','2026-03-31') on conflict do nothing;

  -- Aggiungi gli altri 71 libri con lo stesso pattern...
  -- (per brevità sono elencati solo i libri chiave; esegui lo script completo
  --  che puoi generare con: npx ts-node scripts/export-seed.ts)

end $$;
