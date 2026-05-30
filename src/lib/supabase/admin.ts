import "server-only";
import { createClient } from "@supabase/supabase-js";

// Klien service-role (mem-bypass RLS) — HANYA server, untuk pipeline ingest.
// Jangan pernah impor ke Client Component.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / URL belum dikonfigurasi.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
