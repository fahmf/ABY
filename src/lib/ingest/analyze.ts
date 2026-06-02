import "server-only";

import { normalize } from "@/lib/arabic";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DictionaryEntry } from "@/lib/data/types";
import { DEFAULT_GEMINI_MODEL, generateEntries, isGeminiConfigured } from "./gemini";
import { rootKey } from "./text";

/**
 * Analisis SATU kata secara langsung via Gemini, lalu simpan sebagai entri
 * kamus DRAFT (tanpa menimpa entri terverifikasi) sekaligus mengembalikan
 * hasilnya untuk ditampilkan seketika. Mengubah "kata tak ditemukan" menjadi
 * hasil + menumbuhkan kamus. Hanya dipanggil dari endpoint khusus staff.
 */
export async function analyzeWord(word: string): Promise<DictionaryEntry | null> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const [e] = await generateEntries([word]);
  if (!e) return null;

  const supabase = createAdminClient();

  // Upsert akar (kanonik) → ambil id-nya.
  let root_id: string | null = null;
  const rk = rootKey(e.root);
  if (rk) {
    await supabase
      .from("roots")
      .upsert([{ normalized: rk, root_ar: e.root.trim() }], {
        onConflict: "normalized",
        ignoreDuplicates: true,
      });
    const { data: r } = await supabase
      .from("roots")
      .select("id")
      .eq("normalized", rk)
      .maybeSingle();
    root_id = (r as { id: string } | null)?.id ?? null;
  }

  // Upsert entri kamus (draft) tanpa menimpa yang terverifikasi.
  await supabase.from("dictionary_entries").upsert(
    [
      {
        lemma_ar: e.lemma.trim(),
        lemma_norm: normalize(e.lemma),
        root_id,
        meaning_ar: e.meaning ?? "",
        synonyms_ar: e.synonyms ?? [],
        antonyms_ar: e.antonyms ?? [],
        examples_ar: (e.examples ?? []).map((text) => ({ text })),
        word_type: e.word_type ?? null,
        plural_ar: e.plural_ar ?? null,
        singular_ar: e.singular_ar ?? null,
        past_ar: e.past_ar ?? null,
        present_ar: e.present_ar ?? null,
        masdar_ar: e.masdar_ar ?? null,
        status: "draft" as const,
        generated_by: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      },
    ],
    { onConflict: "lemma_ar", ignoreDuplicates: true }
  );

  return {
    lemma_ar: e.lemma.trim(),
    root_ar: e.root.trim(),
    meaning_ar: e.meaning ?? "",
    synonyms_ar: e.synonyms ?? [],
    antonyms_ar: e.antonyms ?? [],
    examples_ar: e.examples ?? [],
    word_type: e.word_type,
    plural_ar: e.plural_ar,
    singular_ar: e.singular_ar,
    past_ar: e.past_ar,
    present_ar: e.present_ar,
    masdar_ar: e.masdar_ar,
  };
}
