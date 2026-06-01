import "server-only";

import { normalize, tokenize } from "@/lib/arabic";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_GEMINI_MODEL, generateEntries, isGeminiConfigured } from "./gemini";
import { chunk, rootKey, uniqueWords } from "./text";

export { uniqueWords };

const BATCH_SIZE = 100;

export type IngestResult = {
  lessonId: string;
  tokens: number;
  uniqueWords: number;
  newEntries: number;
  newRoots: number;
  totalBatches: number;
  done: boolean;
};

/**
 * Pipeline ingest sebuah teks — DAPAT DILANJUTKAN (resumable) & idempoten.
 *
 * Alur:
 *  - Mulai segar (kursor 0): token lama dihapus, lalu ditulis ulang sebagai
 *    "kerangka" (lemma/akar kosong) memakai offset karakter yang presisi.
 *  - Per batch kata → Gemini → upsert roots & dictionary_entries (draft, tanpa
 *    menimpa yang terverifikasi) → isi lemma/akar pada token batch itu →
 *    SIMPAN kursor (lessons.ingest_cursor = batch berikutnya).
 *  - Bila proses gagal/terhenti di tengah (503 setelah retry, atau timeout
 *    platform), kursor tetap tersimpan. Klik "معالجة" lagi → lanjut dari batch
 *    yang belum selesai, bukan mengulang dari nol.
 *  - Saat semua batch tuntas: ingested_at diisi & kursor dikembalikan ke 0.
 */
export async function ingestLesson(lessonId: string): Promise<IngestResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const supabase = createAdminClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id,body_ar,ingest_cursor")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) throw new Error("النصّ غير موجود.");

  const body = (lesson as { body_ar: string }).body_ar ?? "";
  let cursor = (lesson as { ingest_cursor: number | null }).ingest_cursor ?? 0;

  const words = uniqueWords(body); // Map<norm, surface> — urutan deterministik.
  const reps = [...words.values()];
  const batches = chunk(reps, BATCH_SIZE);

  // Mulai segar → ganti token dengan kerangka (lemma/akar kosong).
  if (cursor <= 0) {
    cursor = 0;
    await supabase.from("tokens").delete().eq("lesson_id", lessonId);
    const skeleton: {
      lesson_id: string;
      position: number;
      surface_ar: string;
      char_start: number;
      char_end: number;
    }[] = [];
    for (const seg of tokenize(body)) {
      if (seg.type !== "word") continue;
      skeleton.push({
        lesson_id: lessonId,
        position: seg.index,
        surface_ar: seg.text,
        char_start: seg.start,
        char_end: seg.end,
      });
    }
    for (const part of chunk(skeleton, 500)) {
      await supabase.from("tokens").insert(part);
    }
  }

  // Petakan bentuk ternormalkan → id token (untuk mengisi lemma/akar nanti).
  const { data: tokRows } = await supabase
    .from("tokens")
    .select("id,surface_ar")
    .eq("lesson_id", lessonId);
  const tokenIdsByNorm = new Map<string, string[]>();
  for (const t of (tokRows as { id: string; surface_ar: string }[]) ?? []) {
    const key = normalize(t.surface_ar);
    const ids = tokenIdsByNorm.get(key);
    if (ids) ids.push(t.id);
    else tokenIdsByNorm.set(key, [t.id]);
  }

  let newEntries = 0;
  let newRoots = 0;

  for (let i = cursor; i < batches.length; i++) {
    const entries = await generateEntries(batches[i]);

    // 1) Upsert roots (kanonik) lalu ambil id-nya.
    const rootRows = new Map<string, string>(); // key → root_ar
    for (const e of entries) {
      const key = rootKey(e.root);
      if (key) rootRows.set(key, e.root.trim());
    }
    const rootMap = new Map<string, string>(); // key → root_id
    if (rootRows.size > 0) {
      await supabase.from("roots").upsert(
        [...rootRows].map(([normalized, root_ar]) => ({ normalized, root_ar })),
        { onConflict: "normalized", ignoreDuplicates: true }
      );
      const { data: roots } = await supabase
        .from("roots")
        .select("id,normalized")
        .in("normalized", [...rootRows.keys()]);
      for (const r of (roots as { id: string; normalized: string }[]) ?? []) {
        rootMap.set(r.normalized, r.id);
      }
      newRoots += rootRows.size;
    }

    // 2) Upsert dictionary_entries (draft) tanpa menimpa entri terverifikasi.
    const dictRows = entries.map((e) => ({
      lemma_ar: e.lemma.trim(),
      lemma_norm: normalize(e.lemma),
      root_id: rootMap.get(rootKey(e.root)) ?? null,
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
    }));
    if (dictRows.length > 0) {
      await supabase
        .from("dictionary_entries")
        .upsert(dictRows, { onConflict: "lemma_ar", ignoreDuplicates: true });
      newEntries += dictRows.length;
    }

    // 3) Isi lemma/akar pada token-token kata batch ini (idempoten).
    for (const e of entries) {
      const ids = tokenIdsByNorm.get(normalize(e.word));
      if (!ids || ids.length === 0) continue;
      await supabase
        .from("tokens")
        .update({
          lemma_ar: e.lemma.trim(),
          root_id: rootMap.get(rootKey(e.root)) ?? null,
        })
        .in("id", ids);
    }

    // 4) Simpan kemajuan: batch ini selesai → kursor menunjuk batch berikutnya.
    cursor = i + 1;
    await supabase
      .from("lessons")
      .update({ ingest_cursor: cursor })
      .eq("id", lessonId);
  }

  // Tuntas: tandai waktu ingest & reset kursor.
  await supabase
    .from("lessons")
    .update({ ingested_at: new Date().toISOString(), ingest_cursor: 0 })
    .eq("id", lessonId);

  return {
    lessonId,
    tokens: tokRows?.length ?? 0,
    uniqueWords: words.size,
    newEntries,
    newRoots,
    totalBatches: batches.length,
    done: true,
  };
}
