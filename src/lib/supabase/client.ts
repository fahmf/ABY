import { createBrowserClient } from "@supabase/ssr";

// Klien Supabase untuk Client Components (browser). Memakai anon key + RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
