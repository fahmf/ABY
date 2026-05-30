import { lemmaCandidates, normalize } from "@/lib/arabic";
import type { DictionaryEntry } from "./types";
import { DICTIONARY } from "./seed";

// Indeks kamus seed berdasarkan lemma yang dinormalkan.
const INDEX = new Map<string, DictionaryEntry>(
  DICTIONARY.map((e) => [normalize(e.lemma_ar), e])
);

/**
 * Cari entri kamus seed untuk satu bentuk kata (surface).
 * Dipakai sebagai fallback bila Supabase belum berisi data.
 */
export function lookupWord(surface: string): DictionaryEntry | null {
  for (const c of lemmaCandidates(surface)) {
    const hit = INDEX.get(c);
    if (hit) return hit;
  }
  return null;
}
