import { NextRequest, NextResponse } from "next/server";

// Proxy immagini same-origin: serve a far funzionare l'export PNG (html-to-image)
// con le copertine di Google Books, che non inviano header CORS.
// Whitelist di host per evitare un open proxy.
const ALLOWED_HOSTS = [
  "books.google.com",
  "books.googleusercontent.com",
  "covers.openlibrary.org",
  "lh3.googleusercontent.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith("." + h))) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 VibrazioniLetterarie" },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
