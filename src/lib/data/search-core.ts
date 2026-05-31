import { normalize, stripDiacritics, tokenize } from "@/lib/arabic";
import type { DictionaryEntry, Lesson, Unit } from "./types";

// Logika pencarian murni (tanpa I/O) — dapat diuji unit & dipakai ulang.

export type SearchHit = {
  lessonSlug: string;
  lessonTitle: string;
  unitTitle: string;
  volumeNumber: number;
  snippet: string;
};

const RADIUS = 50;

export function snippetAround(body: string, idx: number, qLen: number): string {
  const from = Math.max(0, idx - RADIUS);
  const to = Math.min(body.length, idx + qLen + RADIUS);
  return (
    (from > 0 ? "…" : "") +
    body.slice(from, to).trim() +
    (to < body.length ? "…" : "")
  );
}

export function buildHit(
  slug: string,
  title: string,
  body: string,
  unitTitle: string,
  volumeNumber: number,
  q: string
): SearchHit {
  // Cuplikan diambil dari teks tanpa harakat agar offset pencocokan konsisten.
  const bare = stripDiacritics(body);
  const nq = stripDiacritics(q);
  const idx = bare.indexOf(nq);
  const snippet =
    idx >= 0
      ? snippetAround(bare, idx, nq.length)
      : bare.slice(0, 80) + (bare.length > 80 ? "…" : "");
  return { lessonSlug: slug, lessonTitle: title, unitTitle, volumeNumber, snippet };
}

/** Cari di judul & isi pelajaran (tanpa harakat) atas data yang diberikan. */
export function searchSeed(
  query: string,
  lessons: Lesson[],
  units: Unit[]
): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const nq = normalize(q);
  const out: SearchHit[] = [];
  for (const l of lessons) {
    const unit = units.find((u) => u.slug === l.unitSlug);
    const hay = normalize(l.title_ar + " " + l.body_ar);
    if (hay.includes(nq)) {
      out.push(
        buildHit(l.slug, l.title_ar, l.body_ar, unit?.title_ar ?? "", l.volumeNumber, q)
      );
    }
  }
  return out;
}

/**
 * Pencarian berbasis akar: temukan pelajaran yang memuat kata se-akar dengan
 * query, memakai `lookup` (bentuk kata → entri kamus). Mengembalikan teks yang
 * mengandung minimal satu kata berakar sama; cuplikan di kata pertama yg cocok.
 */
export function searchByRoot(
  query: string,
  lessons: Lesson[],
  units: Unit[],
  lookup: (word: string) => DictionaryEntry | null
): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const target = lookup(q);
  if (!target) return [];
  const root = target.root_ar;

  const out: SearchHit[] = [];
  for (const l of lessons) {
    const unit = units.find((u) => u.slug === l.unitSlug);
    let matchStart = -1;
    for (const seg of tokenize(l.body_ar)) {
      if (seg.type !== "word") continue;
      const hit = lookup(seg.text);
      if (hit && hit.root_ar === root) {
        matchStart = seg.start;
        break;
      }
    }
    if (matchStart >= 0) {
      // Cuplikan di sekitar kata yang cocok (dari teks asli berharakat).
      const snippet = snippetAround(l.body_ar, matchStart, 4);
      out.push({
        lessonSlug: l.slug,
        lessonTitle: l.title_ar,
        unitTitle: unit?.title_ar ?? "",
        volumeNumber: l.volumeNumber,
        snippet,
      });
    }
  }
  return out;
}
