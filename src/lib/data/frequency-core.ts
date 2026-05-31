import { tokenize } from "@/lib/arabic";
import type { DictionaryEntry, Lesson, Unit } from "./types";

// Logika frekuensi murni (tanpa I/O) — dapat diuji unit & dipakai ulang.

export type Occurrence = {
  lessonSlug: string;
  lessonTitle: string;
  unitTitle: string;
  volumeNumber: number;
  position: number; // indeks kata → anchor #t=<position>
  snippet: string;
};

export type RootFrequency = {
  root_ar: string;
  total: number;
  occurrences: Occurrence[];
};

const SNIPPET_RADIUS = 40;

export function makeSnippet(body: string, start: number, end: number): string {
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(body.length, end + SNIPPET_RADIUS);
  const pre = from > 0 ? "…" : "";
  const post = to < body.length ? "…" : "";
  return pre + body.slice(from, to).trim() + post;
}

/**
 * Hitung kemunculan kata se-akar atas data seed yang diberikan.
 * `lookup` memetakan bentuk kata → entri kamus (untuk menentukan akar).
 */
export function frequencyFromSeed(
  surface: string,
  lessons: Lesson[],
  units: Unit[],
  lookup: (word: string) => DictionaryEntry | null
): RootFrequency | null {
  const entry = lookup(surface);
  if (!entry) return null;

  const targetRoot = entry.root_ar;
  const unitTitleOf = (slug: string) =>
    units.find((u) => u.slug === slug)?.title_ar ?? "";
  const occurrences: Occurrence[] = [];

  for (const lesson of lessons) {
    for (const seg of tokenize(lesson.body_ar)) {
      if (seg.type !== "word") continue;
      const hit = lookup(seg.text);
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
