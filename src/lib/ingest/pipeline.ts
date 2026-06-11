import "server-only";

import { normalize, tokenize } from "@/lib/arabic";
import type { DictionaryExampleRow } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_GEMINI_MODEL, generateEntries, isGeminiConfigured } from "./gemini";
import { chunk, rootKey, uniqueWords } from "./text";
import { replaceLessonTokens, type TokenInsert } from "./tokens";

export { uniqueWords };

const BATCH_SIZE = 100;

export type IngestResult = {
  lessonId: string;
  tokens: number;
  uniqueWords: number;
  /** Kata unik yang sudah dianalisis & tercatat sampai titik ini (kumulatif). */
  processedWords: number;
  newEntries: number;
  newRoots: number;
  totalBatches: number;
  done: boolean;
  /** Diisi bila berhenti sebelum tuntas: penyebab agar UI bisa memberi pesan. */
  reason?: "busy" | "failed";
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

  // Mulai segar → ganti token dengan kerangka (lemma/akar kosong) secara atomik.
  if (cursor <= 0) {
    cursor = 0;
    const skeleton: TokenInsert[] = [];
    for (const seg of tokenize(body)) {
      if (seg.type !== "word") continue;
      skeleton.push({
        lesson_id: lessonId,
        position: seg.index,
        surface_ar: seg.text,
        lemma_ar: null,
        root_id: null,
        char_start: seg.start,
        char_end: seg.end,
      });
    }
    await replaceLessonTokens(supabase, lessonId, skeleton);
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
  let reason: "busy" | "failed" | undefined;

  try {
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
      // Catat yang sudah ada agar `newRoots` hanya menghitung yang benar-benar baru.
      const { data: before } = await supabase
        .from("roots")
        .select("normalized")
        .in("normalized", [...rootRows.keys()]);
      const existing = new Set(
        ((before as { normalized: string }[]) ?? []).map((r) => r.normalized)
      );
      newRoots += [...rootRows.keys()].filter((k) => !existing.has(k)).length;

      // Galat upsert harus menghentikan batch — kalau tidak, token bisa
      // menunjuk lemma/akar yang entrinya tak pernah tersimpan, sementara
      // kursor terlanjur maju.
      const { error: rootsErr } = await supabase.from("roots").upsert(
        [...rootRows].map(([normalized, root_ar]) => ({ normalized, root_ar })),
        { onConflict: "normalized", ignoreDuplicates: true }
      );
      if (rootsErr) throw rootsErr;
      const { data: roots } = await supabase
        .from("roots")
        .select("id,normalized")
        .in("normalized", [...rootRows.keys()]);
      for (const r of (roots as { id: string; normalized: string }[]) ?? []) {
        rootMap.set(r.normalized, r.id);
      }
    }

    // 2) Upsert dictionary_entries (draft) tanpa menimpa entri terverifikasi.
    const dictRows = entries.map((e) => ({
      lemma_ar: e.lemma.trim(),
      lemma_norm: normalize(e.lemma),
      root_id: rootMap.get(rootKey(e.root)) ?? null,
      meaning_ar: e.meaning ?? "",
      synonyms_ar: e.synonyms ?? [],
      antonyms_ar: e.antonyms ?? [],
      examples_ar: (e.examples ?? []).map((text): DictionaryExampleRow => ({ text })),
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
      const lemmas = dictRows.map((d) => d.lemma_ar);
      const { data: before } = await supabase
        .from("dictionary_entries")
        .select("lemma_ar")
        .in("lemma_ar", lemmas);
      const existing = new Set(
        ((before as { lemma_ar: string }[]) ?? []).map((r) => r.lemma_ar)
      );
      newEntries += lemmas.filter((l) => !existing.has(l)).length;

      const { error: dictErr } = await supabase
        .from("dictionary_entries")
        .upsert(dictRows, { onConflict: "lemma_ar", ignoreDuplicates: true });
      if (dictErr) throw dictErr;
    }

    // 3) Isi lemma/akar pada token-token kata batch ini (idempoten).
    for (const e of entries) {
      const ids = tokenIdsByNorm.get(normalize(e.word));
      if (!ids || ids.length === 0) continue;
      const { error: tokErr } = await supabase
        .from("tokens")
        .update({
          lemma_ar: e.lemma.trim(),
          root_id: rootMap.get(rootKey(e.root)) ?? null,
        })
        .in("id", ids);
      if (tokErr) throw tokErr;
    }

    // 4) Simpan kemajuan: batch ini selesai → kursor menunjuk batch berikutnya.
    cursor = i + 1;
    await supabase
      .from("lessons")
      .update({ ingest_cursor: cursor })
      .eq("id", lessonId);
  }
  } catch (err) {
    // Gagal/terhenti di tengah (mis. Gemini 503/429 setelah retry, atau
    // timeout platform). Kursor terakhir SUDAH tersimpan, jadi kita tidak
    // melempar ulang — kembalikan hasil PARSIAL agar UI bisa menampilkan
    // berapa kata yang sudah tercatat & mengapa berhenti.
    const status =
      (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    reason = status === 503 || status === 429 ? "busy" : "failed";
  }

  const done = cursor >= batches.length;
  // Tuntas: tandai waktu ingest & reset kursor.
  if (done) {
    await supabase
      .from("lessons")
      .update({ ingested_at: new Date().toISOString(), ingest_cursor: 0 })
      .eq("id", lessonId);
  }

  return {
    lessonId,
    tokens: tokRows?.length ?? 0,
    uniqueWords: words.size,
    processedWords: Math.min(cursor * BATCH_SIZE, reps.length),
    newEntries,
    newRoots,
    totalBatches: batches.length,
    done,
    reason: done ? undefined : (reason ?? "failed"),
  };
}
