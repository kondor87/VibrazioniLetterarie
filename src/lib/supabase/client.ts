import { createBrowserClient } from "@supabase/ssr";

// Supporta sia il vecchio formato ANON_KEY (eyJ...) sia il nuovo PUBLISHABLE_KEY (sb_publishable_...)
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
  );
}
