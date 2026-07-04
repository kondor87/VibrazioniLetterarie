import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ImportBook {
  title: string;
  authors: string[];
  rating: number | null;
  page_count: number | null;
  published_year: number | null;
  finished_at: string | null;
  started_at: string | null;
  status: string;
  format: string;
  genres: string[];
  review: string | null;
  reread_count: number;
  isbn_13: string | null;
  isbn_10: string | null;
}

export async function POST(req: Request) {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  let books: ImportBook[];
  try {
    const body = await req.json();
    books = body.books;
    if (!Array.isArray(books) || books.length === 0) {
      return NextResponse.json({ error: "Nessun libro" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const BATCH = 20;
  const errors: string[] = [];
  let saved = 0;

  // 1. Insert books in batches — plain insert (duplicates will error, shown in UI)
  const booksPayload = books.map(b => ({
    title: b.title,
    subtitle: null as string | null,
    authors: b.authors,
    publisher: null as string | null,
    published_year: b.published_year,
    language: "it",
    page_count: b.page_count,
    genres: b.genres,
    cover_url: null as string | null,
    isbn_13: b.isbn_13,
    isbn_10: b.isbn_10,
  }));

  const inserted: { id: string; title: string }[] = [];
  for (let i = 0; i < booksPayload.length; i += BATCH) {
    const { data, error } = await admin
      .from("books")
      .insert(booksPayload.slice(i, i + BATCH))
      .select("id, title");
    if (error) { errors.push(`Batch libri ${i + 1}-${i + BATCH}: ${error.message}`); continue; }
    inserted.push(...(data ?? []));
  }

  // 2. Map title → book id
  const titleToId = new Map<string, string>();
  for (const r of inserted) titleToId.set(r.title.toLowerCase().trim(), r.id);

  // 3. Insert user_books for successfully inserted books
  const ubPayload = books
    .map(b => {
      const bookId = titleToId.get(b.title.toLowerCase().trim());
      if (!bookId) return null;
      return {
        user_id:      user.id,
        book_id:      bookId,
        status:       b.status,
        format:       b.format,
        rating:       b.rating,
        is_favorite:  false,
        started_at:   b.started_at,
        finished_at:  b.finished_at,
        reread_count: b.reread_count,
        review:       b.review,
      };
    })
    .filter(Boolean) as object[];

  for (let i = 0; i < ubPayload.length; i += BATCH) {
    const { error } = await admin
      .from("user_books")
      .insert(ubPayload.slice(i, i + BATCH));
    if (error) {
      errors.push(`Batch letture ${i + 1}-${i + BATCH}: ${error.message}`);
    } else {
      saved += Math.min(BATCH, ubPayload.length - i);
    }
  }

  return NextResponse.json({ saved, total: books.length, errors });
}
