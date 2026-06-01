import "server-only";

import { lemmaCandidates, tokenize } from "@/lib/arabic";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunk } from "./text";

export type FastIndexResult = {
  lessonId: string;
  totalWords: number;
  matchedTokens: number;
};

/**
 * Fast Index: Menjalankan heuristik berlapis untuk mencari kata di kamus,
 * lalu langsung menyimpannya ke tabel `tokens` tanpa memakai AI Gemini.
 * Cepat, tidak ada risiko 503, dan gratis.
 */
export async function fastIndexLesson(lessonId: string): Promise<FastIndexResult> {
  const supabase = createAdminClient();

  // 1. Ambil body_ar dari pelajaran
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, body_ar")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson) throw new Error("Pelajaran tidak ditemukan.");

  const body = lesson.body_ar || "";
  
  // 2. Tokenize
  const segments = tokenize(body);
  const words = segments.filter(s => s.type === "word");
  const uniqueWords = [...new Set(words.map(w => w.text))];

  // 3. Bangun map candidates
  const candidateMap = new Map<string, string[]>();
  const allCandidates = new Set<string>();
  
  for (const w of uniqueWords) {
    const cands = lemmaCandidates(w);
    candidateMap.set(w, cands);
    for (const c of cands) allCandidates.add(c);
  }

  // 4. Query DB secara batch untuk menghindari URL terlalu panjang
  const candsArray = [...allCandidates];
  const validNormToEntry = new Map<string, { lemma_ar: string, root_id: string | null }>();
  
  for (let i = 0; i < candsArray.length; i += 100) {
    const batch = candsArray.slice(i, i + 100);
    const { data: entries } = await supabase
      .from("dictionary_entries")
      .select("lemma_norm, lemma_ar, root_id")
      .eq("status", "published")
      .in("lemma_norm", batch);
      
    if (entries) {
      for (const e of entries) {
        validNormToEntry.set(e.lemma_norm, { lemma_ar: e.lemma_ar, root_id: e.root_id });
      }
    }
  }

  // 5. Bangun array tokens untuk di-insert
  type TokenInsert = {
    lesson_id: string;
    position: number;
    surface_ar: string;
    char_start: number;
    char_end: number;
    lemma_ar: string | null;
    root_id: string | null;
  };
  const tokensToInsert: TokenInsert[] = [];
  
  for (const seg of words) {
    const cands = candidateMap.get(seg.text) || [];
    const validCand = cands.find(c => validNormToEntry.has(c));
    
    let lemma_ar = null;
    let root_id = null;
    
    if (validCand) {
      const entry = validNormToEntry.get(validCand);
      lemma_ar = entry?.lemma_ar || null;
      root_id = entry?.root_id || null;
    }
    
    // Kita menyimpan kerangka token (bahkan yang tidak match dengan lemma kosong)
    // agar pembaca bisa melakukan selection atau klik dengan presisi offset
    tokensToInsert.push({
      lesson_id: lesson.id,
      position: seg.index,
      surface_ar: seg.text,
      char_start: seg.start,
      char_end: seg.end,
      lemma_ar,
      root_id,
    });
  }

  // 6. Delete old tokens & Insert new ones
  await supabase.from("tokens").delete().eq("lesson_id", lesson.id);
  
  for (const part of chunk(tokensToInsert, 500)) {
    await supabase.from("tokens").insert(part);
  }

  // 7. Update status pelajaran
  await supabase
    .from("lessons")
    .update({ 
      ingested_at: new Date().toISOString(),
      ingest_cursor: 0 
    })
    .eq("id", lesson.id);

  const matchedTokens = tokensToInsert.filter(t => t.lemma_ar !== null).length;

  return {
    lessonId,
    totalWords: words.length,
    matchedTokens,
  };
}
