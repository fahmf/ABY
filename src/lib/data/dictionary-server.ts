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
  word_type: string | null;
  plural_ar: string | null;
  singular_ar: string | null;
  past_ar: string | null;
  present_ar: string | null;
  masdar_ar: string | null;
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
    word_type: row.word_type ?? undefined,
    plural_ar: row.plural_ar ?? undefined,
    singular_ar: row.singular_ar ?? undefined,
    past_ar: row.past_ar ?? undefined,
    present_ar: row.present_ar ?? undefined,
    masdar_ar: row.masdar_ar ?? undefined,
  };
}

/**
 * Cari entri kamus untuk sebuah bentuk kata: dari Supabase (status published)
 * bila terkonfigurasi, selain itu dari data seed.
 */
export async function lookupEntry(
  surface: string,
  exactLemma?: string
): Promise<DictionaryEntry | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from("dictionary_entries")
        .select(
          "lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,roots(root_ar)"
        )
        .eq("status", "published");
      
      if (exactLemma) {
        query = query.eq("lemma_ar", exactLemma);
      } else {
        query = query.in("lemma_norm", lemmaCandidates(surface));
      }

      const { data } = await query.limit(1).maybeSingle();
      if (data) return mapDbRow(data as unknown as DbRow);
    } catch {
      // jatuh ke seed di bawah
    }
  }
  return lookupWord(exactLemma || surface);
}
