import { normalize } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import { buildHit, searchByRoot, searchSeed, type SearchHit } from "./search-core";
import { LESSONS, UNITS } from "./seed";
import { MORPHOLOGY_COLUMNS, pickMorphology, type DictionaryEntry } from "./types";

export type { SearchHit };
export type SearchMode = "text" | "root" | "dictionary";

// Bentuk baris hasil select kamus dari Supabase (PostgREST mengembalikan
// embed `roots` sebagai objek, dan kolom jsonb sebagai array yang sudah ter-parse).
type DictionaryRow = {
  lemma_ar: string;
  meaning_ar: string | null;
  synonyms_ar: string[] | null;
  antonyms_ar: string[] | null;
  examples_ar: (string | { text?: string })[] | null;
  roots: { root_ar: string } | null;
} & Record<string, unknown>;

/** Pencarian terpadu: mode "text" (substring) atau "root" (kata se-akar). */
export async function search(
  query: string,
  mode: SearchMode = "text"
): Promise<SearchHit[]> {
  if (mode === "root") {
    // Pencarian akar berbasis seed lookup (akurat untuk korpus seed).
    return searchByRoot(query, LESSONS, UNITS, lookupWord);
  }
  return searchLessons(query);
}

/**
 * Cari teks di judul & isi pelajaran (published). Pencocokan tanpa harakat.
 * Supabase bila terkonfigurasi, selain itu cari di seed.
 */
export async function searchLessons(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (isSupabaseConfigured()) {
    try {
      const hits = await fromSupabase(q);
      if (hits) return hits;
    } catch {
      // jatuh ke seed
    }
  }
  return searchSeed(q, LESSONS, UNITS);
}

async function fromSupabase(q: string): Promise<SearchHit[] | null> {
  const supabase = await createClient();
  const pattern = `%${q}%`;
  const { data } = await supabase
    .from("lessons")
    .select(
      "slug,title_ar,body_ar,units!inner(title_ar,volumes!inner(number))"
    )
    .eq("status", "published")
    .or(`title_ar.ilike.${pattern},body_ar.ilike.${pattern}`)
    .limit(50);

  type Row = {
    slug: string;
    title_ar: string;
    body_ar: string;
    units: { title_ar: string; volumes: { number: number } };
  };
  const rows = (data as unknown as Row[]) ?? [];
  return rows.map((r) =>
    buildHit(r.slug, r.title_ar, r.body_ar, r.units.title_ar, r.units.volumes.number, q)
  );
}

/**
 * Cari entri di tabel kamus.
 */
export async function searchDictionary(query: string): Promise<DictionaryEntry[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const pattern = `%${q}%`;
      // lemma_norm dibandingkan dengan query yang SUDAH dinormalkan agar input
      // berharakat / varian alif-hamza tetap cocok. Ketiga kolom (lemma_ar,
      // meaning_ar, lemma_norm) memakai indeks GIN trigram (migrasi 0006).
      const normPattern = `%${normalize(q)}%`;
      const { data } = await supabase
        .from("dictionary_entries")
        .select(
          `lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,${MORPHOLOGY_COLUMNS},roots(root_ar)`
        )
        .eq("status", "published")
        .or(
          `lemma_ar.ilike.${pattern},meaning_ar.ilike.${pattern},lemma_norm.ilike.${normPattern}`
        )
        .limit(20);

      if (data) {
        const rows = data as unknown as DictionaryRow[];
        return rows.map((row) => ({
          lemma_ar: row.lemma_ar,
          root_ar: row.roots?.root_ar ?? "",
          meaning_ar: row.meaning_ar ?? "",
          synonyms_ar: row.synonyms_ar ?? [],
          antonyms_ar: row.antonyms_ar ?? [],
          examples_ar: (row.examples_ar ?? [])
            .map((x) => (typeof x === "string" ? x : x?.text ?? ""))
            .filter(Boolean),
          ...pickMorphology(row),
        }));
      }
    } catch {
      // fail silently and fallback to seed
    }
  }
  // Simple fallback for seed
  const hit = lookupWord(q);
  return hit ? [hit] : [];
}
