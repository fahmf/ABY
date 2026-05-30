import { normalize } from "@/lib/arabic";
import type { DictionaryEntry } from "./types";
import { DICTIONARY } from "./seed";

// Indeks kamus berdasarkan lemma yang dinormalkan.
const INDEX = new Map<string, DictionaryEntry>(
  DICTIONARY.map((e) => [normalize(e.lemma_ar), e])
);

// Klitik depan yang umum (ال، و، ف، ب، ك، ل) untuk heuristik pencocokan Fase 1.
const PREFIXES = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"];
// Akhiran umum (ta marbuta, jamak, dhamir) — disederhanakan.
const SUFFIXES = ["تها", "هما", "كما", "هم", "كم", "نا", "ها", "ه", "ك", "ي", "ات", "ون", "ين", "ة"];

/**
 * Cari entri kamus untuk satu bentuk kata (surface).
 * Heuristik sementara (Fase 1); akan digantikan lemmatisasi Gemini di Fase 3.
 */
export function lookupWord(surface: string): DictionaryEntry | null {
  const base = normalize(surface);
  const candidates = new Set<string>([base]);

  for (const p of PREFIXES) {
    if (base.startsWith(p) && base.length - p.length >= 2) {
      const stripped = base.slice(p.length);
      candidates.add(stripped);
      for (const s of SUFFIXES) {
        if (stripped.endsWith(s) && stripped.length - s.length >= 2) {
          candidates.add(stripped.slice(0, -s.length));
        }
      }
    }
  }
  for (const s of SUFFIXES) {
    if (base.endsWith(s) && base.length - s.length >= 2) {
      candidates.add(base.slice(0, -s.length));
    }
  }

  for (const c of candidates) {
    const hit = INDEX.get(c);
    if (hit) return hit;
  }
  return null;
}
