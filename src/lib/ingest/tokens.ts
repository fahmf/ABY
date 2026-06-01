import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { chunk } from "./text";

export type TokenInsert = {
  lesson_id: string;
  position: number;
  surface_ar: string;
  lemma_ar: string | null;
  root_id: string | null;
  char_start: number;
  char_end: number;
};

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Ganti seluruh token sebuah pelajaran secara ATOMIK lewat RPC
 * `replace_lesson_tokens` (delete+insert dalam satu transaksi).
 * Bila RPC belum tersedia (migrasi 0007 belum diterapkan), jatuh ke
 * delete+insert berbatch non-atomik agar tetap berfungsi.
 */
export async function replaceLessonTokens(
  supabase: AdminClient,
  lessonId: string,
  tokens: TokenInsert[]
): Promise<void> {
  const { error } = await supabase.rpc("replace_lesson_tokens", {
    p_lesson_id: lessonId,
    p_tokens: tokens,
  });
  if (!error) return;

  // Fallback non-atomik (mis. fungsi RPC belum di-deploy).
  await supabase.from("tokens").delete().eq("lesson_id", lessonId);
  for (const part of chunk(tokens, 500)) {
    await supabase.from("tokens").insert(part);
  }
}
