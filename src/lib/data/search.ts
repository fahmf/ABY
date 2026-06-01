import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import { buildHit, orIlike, searchByRoot, searchSeed, type SearchHit } from "./search-core";
import { LESSONS, UNITS } from "./seed";
import type { DictionaryEntry } from "./types";

export type { SearchHit };
export type SearchMode = "text" | "root" | "dictionary";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asExamples(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x
        : x && typeof x === "object" && "text" in x
          ? String((x as { text: unknown }).text)
          : ""
    )
    .filter(Boolean);
}

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
  const { data } = await supabase
    .from("lessons")
    .select(
      "slug,title_ar,body_ar,units!inner(title_ar,volumes!inner(number))"
    )
    .eq("status", "published")
    .or(orIlike(["title_ar", "body_ar"], q))
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
      const { data } = await supabase
        .from("dictionary_entries")
        .select("lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,roots(root_ar)")
        .eq("status", "published")
        .or(orIlike(["lemma_ar", "meaning_ar", "lemma_norm"], q))
        .limit(20);

      if (data) {
        type DictRow = {
          lemma_ar: string;
          meaning_ar: string | null;
          synonyms_ar: unknown;
          antonyms_ar: unknown;
          examples_ar: unknown;
          roots: { root_ar: string } | { root_ar: string }[] | null;
        };
        return (data as unknown as DictRow[]).map((row) => ({
          lemma_ar: row.lemma_ar,
          root_ar: Array.isArray(row.roots)
            ? (row.roots[0]?.root_ar ?? "")
            : (row.roots?.root_ar ?? ""),
          meaning_ar: row.meaning_ar ?? "",
          synonyms_ar: asStringArray(row.synonyms_ar),
          antonyms_ar: asStringArray(row.antonyms_ar),
          examples_ar: asExamples(row.examples_ar),
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
