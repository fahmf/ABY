import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { lemmaCandidates } from "@/lib/arabic";
import { chunk } from "./text";

export type DictMatch = { lemma_ar: string; root_id: string | null };

/**
 * Cocokkan sekumpulan bentuk-kata (surface) ke entri kamus *published* memakai
 * heuristik kandidat lemma (`lemmaCandidates`). Mengembalikan peta
 * `surface → {lemma_ar, root_id}` HANYA untuk yang cocok.
 *
 * Query kamus di-batch (100 `lemma_norm` per permintaan) agar tidak melewati
 * batas panjang URL PostgREST saat daftar kandidat membesar.
 *
 * Satu sumber kebenaran yang dipakai bersama oleh:
 *  - `fastIndexLesson`  → mengisi lemma/akar token saat indeks awal,
 *  - `rematchTokens`    → menyalakan kata saat kamus bertambah (tanpa tokenisasi).
 */
export async function matchSurfacesToDictionary(
  supabase: SupabaseClient,
  surfaces: string[]
): Promise<Map<string, DictMatch>> {
  const candidateMap = new Map<string, string[]>();
  const allCandidates = new Set<string>();
  for (const s of surfaces) {
    if (candidateMap.has(s)) continue;
    const cands = lemmaCandidates(s);
    candidateMap.set(s, cands);
    for (const c of cands) allCandidates.add(c);
  }

  type EntryRow = { lemma_norm: string; lemma_ar: string; root_id: string | null };
  const validNormToEntry = new Map<string, DictMatch>();
  for (const part of chunk([...allCandidates], 100)) {
    const { data } = await supabase
      .from("dictionary_entries")
      .select("lemma_norm, lemma_ar, root_id")
      .eq("status", "published")
      .in("lemma_norm", part);
    for (const e of (data as EntryRow[]) ?? []) {
      if (e.lemma_norm && !validNormToEntry.has(e.lemma_norm)) {
        validNormToEntry.set(e.lemma_norm, {
          lemma_ar: e.lemma_ar,
          root_id: e.root_id,
        });
      }
    }
  }

  const out = new Map<string, DictMatch>();
  for (const [surface, cands] of candidateMap) {
    const hit = cands.find((c) => validNormToEntry.has(c));
    if (hit) out.set(surface, validNormToEntry.get(hit)!);
  }
  return out;
}
