import { lemmaCandidates } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import {
  frequencyFromSeed,
  makeSnippet,
  type Occurrence,
  type RootFrequency,
} from "./frequency-core";
import { LESSONS, UNITS } from "./seed";

export type { Occurrence, RootFrequency };

/**
 * Frekuensi & daftar kemunculan kata se-akar untuk sebuah bentuk kata.
 * Memakai Supabase (tokens.root_id) bila terkonfigurasi, selain itu menghitung
 * dari data seed dengan pencocokan lemma.
 */
export async function getRootFrequency(
  surface: string
): Promise<RootFrequency | null> {
  if (isSupabaseConfigured()) {
    try {
      const db = await fromSupabase(surface);
      if (db) return db;
    } catch {
      // jatuh ke seed
    }
  }
  return frequencyFromSeed(surface, LESSONS, UNITS, lookupWord);
}

async function fromSupabase(surface: string): Promise<RootFrequency | null> {
  const supabase = await createClient();

  // Cari root_id dari lemma yang cocok (entri published).
  const { data: entry } = await supabase
    .from("dictionary_entries")
    .select("root_id,roots(root_ar)")
    .in("lemma_norm", lemmaCandidates(surface))
    .eq("status", "published")
    .not("root_id", "is", null)
    .limit(1)
    .maybeSingle();

  const row = entry as { root_id: string | null; roots: { root_ar: string } | null } | null;
  if (!row?.root_id) return null;

  const { data: toks } = await supabase
    .from("tokens")
    .select(
      "position,char_start,char_end,lessons!inner(slug,title_ar,body_ar,status,units!inner(title_ar,volumes!inner(number)))"
    )
    .eq("root_id", row.root_id)
    .eq("lessons.status", "published")
    .order("position");

  type Row = {
    position: number;
    char_start: number;
    char_end: number;
    lessons: {
      slug: string;
      title_ar: string;
      body_ar: string;
      units: { title_ar: string; volumes: { number: number } };
    };
  };
  const rows = (toks as unknown as Row[]) ?? [];

  const occurrences: Occurrence[] = rows.map((t) => ({
    lessonSlug: t.lessons.slug,
    lessonTitle: t.lessons.title_ar,
    unitTitle: t.lessons.units.title_ar,
    volumeNumber: t.lessons.units.volumes.number,
    position: t.position,
    snippet: makeSnippet(t.lessons.body_ar, t.char_start, t.char_end),
  }));

  return {
    root_ar: row.roots?.root_ar ?? "",
    total: occurrences.length,
    occurrences,
  };
}
