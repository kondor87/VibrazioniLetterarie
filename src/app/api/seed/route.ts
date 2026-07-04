import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MY_BOOKS } from "@/lib/books-data";

const USER_EMAIL    = "marcolarocca.p@gmail.com";
const INITIAL_PASS  = "VibrazioniLetterarie!1";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-seed-secret") !== "seed-vibrazioni-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── 1. Crea o recupera l'utente ─────────────────────────────────────────────
  let userId: string;
  const { data: listData } = await sb.auth.admin.listUsers({ perPage: 100 });
  const existing = listData?.users.find((u) => u.email === USER_EMAIL);

  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email: USER_EMAIL, password: INITIAL_PASS, email_confirm: true,
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message }, { status: 500 });
    userId = data.user.id;
  }

  // ── 2. Reset completo: elimina user_books e books senza google_books_id ──────
  await sb.from("user_books").delete().eq("user_id", userId);
  await sb.from("books").delete().is("google_books_id", null);

  // ── 3. Deduplica MY_BOOKS per titolo (rilettori come "Fiori per Algernon") ───
  // Per ogni titolo duplicato: usa l'ultima occorrenza come data, incrementa reread_count
  type BookRow = {
    title: string; subtitle: string | null; authors: string[];
    publisher: string | null; published_year: number | null; language: string;
    page_count: number | null; genres: string[]; cover_url: string | null;
    // dati lettura (non vanno in books, vanno in user_books)
    _status: string; _rating: number | null; _favorite: boolean;
    _started: string | null; _finished: string | null; _reread: number;
  };

  const deduped = new Map<string, BookRow>();

  for (const b of MY_BOOKS) {
    const key = b.title.toLowerCase().trim();
    if (deduped.has(key)) {
      // Già visto: è una rilettura — incrementa contatore, aggiorna date all'ultima
      const prev = deduped.get(key)!;
      prev._reread += 1;
      if ((b.finished_at ?? "") > (prev._finished ?? "")) {
        prev._started  = b.started_at;
        prev._finished = b.finished_at;
      }
    } else {
      deduped.set(key, {
        title:          b.title,
        subtitle:       b.subtitle,
        authors:        b.authors,
        publisher:      b.publisher,
        published_year: b.published_year,
        language:       b.language ?? "it",
        page_count:     b.page_count,
        genres:         b.genres ?? [],
        cover_url:      b.cover_url,
        _status:        b.status ?? "letto",
        _rating:        b.rating,
        _favorite:      b.is_favorite,
        _started:       b.started_at,
        _finished:      b.finished_at,
        _reread:        0,
      });
    }
  }

  const uniqueBooks = Array.from(deduped.values());

  // ── 4. Inserisci libri nel catalogo (batch da 20) ────────────────────────────
  const booksPayload = uniqueBooks.map(({ title, subtitle, authors, publisher,
    published_year, language, page_count, genres, cover_url }) => ({
    title, subtitle, authors, publisher, published_year, language,
    page_count, genres, cover_url,
  }));

  const insertedBooks: { id: string; title: string }[] = [];
  const BATCH = 20;
  for (let i = 0; i < booksPayload.length; i += BATCH) {
    const { data, error } = await sb
      .from("books")
      .insert(booksPayload.slice(i, i + BATCH))
      .select("id, title");
    if (error) return NextResponse.json({ error: `books[${i}]: ${error.message}` }, { status: 500 });
    insertedBooks.push(...(data ?? []));
  }

  // ── 5. Mappa titolo → book_id ────────────────────────────────────────────────
  const titleToId = new Map<string, string>();
  for (const row of insertedBooks) titleToId.set(row.title.toLowerCase().trim(), row.id);

  // ── 6. Inserisci user_books ──────────────────────────────────────────────────
  const userBooksPayload = uniqueBooks.map((b) => {
    const bookId = titleToId.get(b.title.toLowerCase().trim());
    if (!bookId) return null;
    return {
      user_id:      userId,
      book_id:      bookId,
      status:       b._status,
      format:       "ebook" as const,
      rating:       b._rating,
      is_favorite:  b._favorite,
      started_at:   b._started,
      finished_at:  b._finished,
      reread_count: b._reread,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const { error: ubErr } = await sb.from("user_books").insert(userBooksPayload);
  if (ubErr) return NextResponse.json({ error: `user_books: ${ubErr.message}` }, { status: 500 });

  return NextResponse.json({
    ok:          true,
    user_id:     userId,
    books:       insertedBooks.length,
    user_books:  userBooksPayload.length,
    message:     `Seed OK: ${insertedBooks.length} libri, ${userBooksPayload.length} letture`,
    login_email: USER_EMAIL,
    login_pass:  INITIAL_PASS,
  });
}
