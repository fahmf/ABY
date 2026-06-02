import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Apakah analisis AI on-demand terbuka untuk semua pengunjung (kontribusi
 * publik), atau hanya staff. Default: false (tertutup/aman). Dibaca via policy
 * "settings public read". Di-cache per-request.
 */
export const getPublicAnalyze = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "public_analyze")
      .maybeSingle();
    return (data as { value: unknown } | null)?.value === true;
  } catch {
    return false;
  }
});
