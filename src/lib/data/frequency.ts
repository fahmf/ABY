import { lemmaCandidates, tokenize } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { lookupWord } from "./dictionary";
import { LESSONS, UNITS } from "./seed";

export type Occurrence = {
  lessonSlug: string;
  lessonTitle: string;
  unitTitle: string;
  volumeNumber: number;
  position: number; // indeks kata → anchor #t=<position>
  snippet: string; // cuplikan kalimat di sekitar kata
};

export type RootFrequency = {
  root_ar: string;
  total: number;
  occurrences: Occurrence[];
};

const SNIPPET_RADIUS = 40; // karakter sebelum/sesudah

function makeSnippet(body: string, start: number, end: number): string {
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(body.length, end + SNIPPET_RADIUS);
  const pre = from > 0 ? "…" : "";
  const post = to < body.length ? "…" : "";
  return pre + body.slice(from, to).trim() + post;
}

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
  return fromSeed(surface);
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

function fromSeed(surface: string): RootFrequency | null {
  const entry = lookupWord(surface);
  if (!entry) return null;

  // Kumpulan lemma ternormalkan yang berbagi akar yang sama (dari seed).
  const targetRoot = entry.root_ar;
  const occurrences: Occurrence[] = [];

  for (const lesson of LESSONS) {
    for (const seg of tokenize(lesson.body_ar)) {
      if (seg.type !== "word") continue;
      const hit = lookupWord(seg.text);
      if (hit && hit.root_ar === targetRoot) {
        occurrences.push({
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title_ar,
          unitTitle: unitTitleOf(lesson.unitSlug),
          volumeNumber: lesson.volumeNumber,
          position: seg.index,
          snippet: makeSnippet(lesson.body_ar, seg.start, seg.end),
        });
      }
    }
  }

  return { root_ar: targetRoot, total: occurrences.length, occurrences };
}

function unitTitleOf(unitSlug: string): string {
  return UNITS.find((u) => u.slug === unitSlug)?.title_ar ?? "";
}
