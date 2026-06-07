import { lemmaCandidates, normalize } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import type { DictionaryEntry } from "./types";

type DbRow = {
  lemma_ar: string;
  lemma_norm?: string | null;
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
      const query = supabase
        .from("dictionary_entries")
        .select(
          "lemma_ar,lemma_norm,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,roots(root_ar)"
        )
        .eq("status", "published");

      if (exactLemma) {
        const { data } = await query.eq("lemma_ar", exactLemma).limit(1).maybeSingle();
        if (data) return mapDbRow(data as unknown as DbRow);
      } else {
        // Kandidat sudah terurut dari paling spesifik (terpanjang). `.in()` tidak
        // menjaga urutan, jadi ambil semua lalu pilih kandidat paling spesifik.
        const candidates = lemmaCandidates(surface);
        const { data } = await query.in("lemma_norm", candidates);
        const rows = (data as unknown as DbRow[]) ?? [];
        if (rows.length > 0) {
          const best = pickBestByCandidate(rows, candidates);
          if (best) return mapDbRow(best);
        }
      }
    } catch {
      // jatuh ke seed di bawah
    }
  }
  return lookupWord(exactLemma || surface);
}

export type Suggestion = { lemma_ar: string; root_ar: string; meaning_ar: string };

export type Sense = {
  lemma_ar: string;
  meaning_ar: string;
  word_type?: string;
  root_ar: string;
};

/**
 * Semua مدخل منشور yang berbagi satu `lemma_norm` — dipakai panel untuk
 * menawarkan pemilihan makna pada homograf (mis. سُوق "pasar" ↔ سَوْق مصدر ساق).
 */
export async function listSenses(lemmaNorm: string): Promise<Sense[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("dictionary_entries")
      .select("lemma_ar,meaning_ar,word_type,roots(root_ar)")
      .eq("status", "published")
      .eq("lemma_norm", lemmaNorm)
      .order("lemma_ar");
    type R = {
      lemma_ar: string;
      meaning_ar: string | null;
      word_type: string | null;
      roots: { root_ar: string } | { root_ar: string }[] | null;
    };
    return ((data as unknown as R[]) ?? []).map((r) => ({
      lemma_ar: r.lemma_ar,
      meaning_ar: r.meaning_ar ?? "",
      word_type: r.word_type ?? undefined,
      root_ar: Array.isArray(r.roots)
        ? (r.roots[0]?.root_ar ?? "")
        : (r.roots?.root_ar ?? ""),
    }));
  } catch {
    return [];
  }
}

/**
 * Saran "هل تقصد؟" untuk bentuk kata yang tak ditemukan persis — kemiripan
 * trigram ber-ambang (lihat RPC suggest_dictionary). Hanya kata yang cukup
 * mirip (mis. salah ketik) yang dikembalikan; jika tidak, array kosong.
 */
export async function suggestEntries(surface: string): Promise<Suggestion[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("suggest_dictionary", {
      p_q: normalize(surface),
    });
    const rows = (data as Suggestion[] | null) ?? [];
    return rows.map((r) => ({
      lemma_ar: r.lemma_ar,
      root_ar: r.root_ar ?? "",
      meaning_ar: r.meaning_ar ?? "",
    }));
  } catch {
    return [];
  }
}

/** Pilih baris yang cocok dengan kandidat paling awal (paling spesifik). */
function pickBestByCandidate(rows: DbRow[], candidates: string[]): DbRow | null {
  for (const c of candidates) {
    const hit = rows.find((r) => r.lemma_norm === c);
    if (hit) return hit;
  }
  return rows[0] ?? null;
}
