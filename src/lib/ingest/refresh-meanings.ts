import "server-only";

import { normalize } from "@/lib/arabic";
import type { DictionaryExampleRow } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_GEMINI_MODEL, generateEntries, isGeminiConfigured } from "./gemini";

// Penyegaran makna massal — menyederhanakan entri kamus lama memakai persona
// prompt Gemini yang baru (gaya pemula). DAPAT DILANJUTKAN (resumable):
// memproses entri yang belum disegarkan (meaning_refreshed_at IS NULL) per
// batch sampai anggaran waktu habis, lalu mengembalikan kemajuan agar admin
// bisa menekan tombol lagi untuk melanjutkan dari tempat berhenti.

const BATCH_SIZE = 60;
// Sisakan margin di bawah maxDuration (300s di Vercel Pro) agar respons sempat
// dikembalikan; bila platform memutus lebih awal, kemajuan tetap tersimpan.
const TIME_BUDGET_MS = 240_000;

export type RefreshResult = {
  /** Entri yang diproses pada panggilan ini (termasuk yang tanpa padanan). */
  processed: number;
  /** Entri yang benar-benar diperbarui maknanya. */
  updated: number;
  /** Sisa entri yang belum disegarkan setelah panggilan ini. */
  remaining: number;
  total: number;
  done: boolean;
  /** Diisi bila berhenti sebelum tuntas (Gemini sibuk / galat lain). */
  reason?: "busy" | "failed";
};

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: number; code?: number } | null;
  return e?.status ?? e?.code;
}

export async function refreshMeanings(): Promise<RefreshResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const supabase = createAdminClient();
  const start = Date.now();

  const { count: total } = await supabase
    .from("dictionary_entries")
    .select("*", { count: "exact", head: true });

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  let processed = 0;
  let updated = 0;
  let reason: "busy" | "failed" | undefined;

  try {
    while (Date.now() - start < TIME_BUDGET_MS) {
      const { data: rows, error } = await supabase
        .from("dictionary_entries")
        .select("id,lemma_ar")
        .is("meaning_refreshed_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(BATCH_SIZE);
      if (error) throw error;
      const batch = (rows as { id: string; lemma_ar: string }[]) ?? [];
      if (batch.length === 0) break;

      const entries = await generateEntries(batch.map((b) => b.lemma_ar));
      const byNorm = new Map<string, (typeof entries)[number]>();
      for (const e of entries) {
        if (e.word) byNorm.set(normalize(e.word), e);
        if (e.lemma) byNorm.set(normalize(e.lemma), e);
      }

      // Tandai seluruh batch sebagai sudah disegarkan LEBIH DULU — meski Gemini
      // tak mengembalikan padanan suatu lemma, entri itu tak boleh terjebak
      // diproses berulang tanpa henti.
      const now = new Date().toISOString();
      const { error: stampErr } = await supabase
        .from("dictionary_entries")
        .update({ meaning_refreshed_at: now })
        .in("id", batch.map((b) => b.id));
      if (stampErr) throw stampErr;

      // Timpa makna/مرادفات/أضداد/أمثلة untuk yang punya padanan. Hanya field
      // yang dikembalikan non-kosong yang ditimpa, agar data baik yang sudah ada
      // (mis. contoh hasil suntingan manusia) tak terhapus oleh balasan kosong.
      for (const b of batch) {
        const e = byNorm.get(normalize(b.lemma_ar));
        if (!e) continue;
        const patch: Record<string, unknown> = { generated_by: model };
        if (e.meaning?.trim()) patch.meaning_ar = e.meaning.trim();
        if (e.synonyms?.length) patch.synonyms_ar = e.synonyms;
        if (e.antonyms?.length) patch.antonyms_ar = e.antonyms;
        if (e.examples?.length) {
          patch.examples_ar = e.examples.map(
            (text): DictionaryExampleRow => ({ text })
          );
        }
        const { error: upErr } = await supabase
          .from("dictionary_entries")
          .update(patch)
          .eq("id", b.id);
        if (upErr) throw upErr;
        updated++;
      }
      processed += batch.length;
    }
  } catch (err) {
    const status = statusOf(err);
    reason = status === 503 || status === 429 ? "busy" : "failed";
  }

  const { count: remaining } = await supabase
    .from("dictionary_entries")
    .select("*", { count: "exact", head: true })
    .is("meaning_refreshed_at", null);

  const rem = remaining ?? 0;
  return {
    processed,
    updated,
    remaining: rem,
    total: total ?? 0,
    done: rem === 0,
    reason: rem === 0 ? undefined : (reason ?? "failed"),
  };
}

/**
 * Null-kan penanda agar SELURUH entri disegarkan ulang pada proses berikutnya.
 * Berguna setelah persona/prompt diubah lagi.
 */
export async function resetMeaningRefresh(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("dictionary_entries")
    .select("*", { count: "exact", head: true });
  const { error } = await supabase
    .from("dictionary_entries")
    .update({ meaning_refreshed_at: null })
    .not("meaning_refreshed_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}
