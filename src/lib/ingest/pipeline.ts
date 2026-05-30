import "server-only";

import { normalize, tokenize } from "@/lib/arabic";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateEntries, isGeminiConfigured } from "./gemini";
import { chunk, rootKey, uniqueWords } from "./text";

export { uniqueWords };

export type IngestResult = {
  lessonId: string;
  tokens: number;
  uniqueWords: number;
  newEntries: number;
  newRoots: number;
};

/**
 * Pipeline ingest sebuah teks:
 *  tokenisasi → Gemini (lemma + akar + draft kamus) → upsert roots &
 *  dictionary_entries (draft, tanpa menimpa yang sudah ada) → ganti tokens.
 * Idempoten: token lama untuk lesson dihapus lalu ditulis ulang.
 */
export async function ingestLesson(lessonId: string): Promise<IngestResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const supabase = createAdminClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id,body_ar")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) throw new Error("النصّ غير موجود.");

  const body = (lesson as { body_ar: string }).body_ar ?? "";
  const words = uniqueWords(body);
  const reps = [...words.values()];

  // 1) Gemini per batch → peta hasil diindeks oleh bentuk ternormalkan.
  const results = new Map<string, Awaited<ReturnType<typeof generateEntries>>[number]>();
  for (const batch of chunk(reps, 40)) {
    const entries = await generateEntries(batch);
    for (const e of entries) results.set(normalize(e.word), e);
  }

  // 2) Upsert roots (kanonik) lalu ambil id-nya.
  const rootMap = new Map<string, string>(); // key → root_id
  const rootRows = new Map<string, string>(); // key → root_ar
  for (const e of results.values()) {
    const key = rootKey(e.root);
    if (key) rootRows.set(key, e.root.trim());
  }
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
  }

  // 3) Upsert dictionary_entries (draft) tanpa menimpa entri terverifikasi.
  let newEntries = 0;
  const dictRows = [...results.values()].map((e) => {
    newEntries++;
    return {
      lemma_ar: e.lemma.trim(),
      lemma_norm: normalize(e.lemma),
      root_id: rootMap.get(rootKey(e.root)) ?? null,
      meaning_ar: e.meaning ?? "",
      synonyms_ar: e.synonyms ?? [],
      antonyms_ar: e.antonyms ?? [],
      examples_ar: (e.examples ?? []).map((text) => ({ text })),
      status: "draft" as const,
      generated_by: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    };
  });
  if (dictRows.length > 0) {
    await supabase
      .from("dictionary_entries")
      .upsert(dictRows, { onConflict: "lemma_ar", ignoreDuplicates: true });
  }

  // 4) Ganti tokens lesson.
  await supabase.from("tokens").delete().eq("lesson_id", lessonId);
  const tokenRows: {
    lesson_id: string;
    position: number;
    surface_ar: string;
    lemma_ar: string | null;
    root_id: string | null;
    char_start: number;
    char_end: number;
  }[] = [];
  for (const seg of tokenize(body)) {
    if (seg.type !== "word") continue;
    const hit = results.get(normalize(seg.text));
    tokenRows.push({
      lesson_id: lessonId,
      position: seg.index,
      surface_ar: seg.text,
      lemma_ar: hit?.lemma.trim() ?? null,
      root_id: hit ? rootMap.get(rootKey(hit.root)) ?? null : null,
      char_start: seg.start,
      char_end: seg.end,
    });
  }
  if (tokenRows.length > 0) {
    await supabase.from("tokens").insert(tokenRows);
  }

  await supabase
    .from("lessons")
    .update({ ingested_at: new Date().toISOString() })
    .eq("id", lessonId);

  return {
    lessonId,
    tokens: tokenRows.length,
    uniqueWords: words.size,
    newEntries,
    newRoots: rootRows.size,
  };
}
