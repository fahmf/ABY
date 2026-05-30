import { lemmaCandidates } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import type { DictionaryEntry } from "./types";

type DbRow = {
  lemma_ar: string;
  meaning_ar: string | null;
  synonyms_ar: unknown;
  antonyms_ar: unknown;
  examples_ar: unknown;
  roots: { root_ar: string } | null;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
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

function mapDbRow(row: DbRow): DictionaryEntry {
  return {
    lemma_ar: row.lemma_ar,
    root_ar: row.roots?.root_ar ?? "",
    meaning_ar: row.meaning_ar ?? "",
    synonyms_ar: asStringArray(row.synonyms_ar),
    antonyms_ar: asStringArray(row.antonyms_ar),
    examples_ar: asExamples(row.examples_ar),
  };
}

/**
 * Cari entri kamus untuk sebuah bentuk kata: dari Supabase (status published)
 * bila terkonfigurasi, selain itu dari data seed.
 */
export async function lookupEntry(
  surface: string
): Promise<DictionaryEntry | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("dictionary_entries")
        .select(
          "lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,roots(root_ar)"
        )
        .in("lemma_norm", lemmaCandidates(surface))
        .eq("status", "published")
        .limit(1)
        .maybeSingle();
      if (data) return mapDbRow(data as unknown as DbRow);
    } catch {
      // jatuh ke seed di bawah
    }
  }
  return lookupWord(surface);
}
