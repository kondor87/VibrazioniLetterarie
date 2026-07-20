import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Se Supabase non è ancora configurato, passa tutto senza controlli
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // 🔒 Route AI: richiedono login (evitano costi OpenAI da chiamate anonime).
  // Il cron mensile si autoprotegge col CRON_SECRET → escluso.
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/ai/") && !path.startsWith("/api/ai/cron") && !user) {
    return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
                      request.nextUrl.pathname.startsWith("/signup") ||
                      request.nextUrl.pathname.startsWith("/auth");

  // Landing pubblica (/) e scaffali pubblici (/u/...) accessibili senza login
  const isLanding = request.nextUrl.pathname === "/";
  const isPublicRoute = request.nextUrl.pathname.startsWith("/u/") || isLanding;

  // Proteggi le rotte private
  if (!user && !isAuthRoute && !isPublicRoute && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Chi è già loggato non vede la landing né le pagine di auth → va ai libri
  if (user && (isAuthRoute || isLanding)) {
    return NextResponse.redirect(new URL("/libri", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
