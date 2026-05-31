import { describe, expect, test } from "bun:test";

import { frequencyFromSeed, makeSnippet } from "@/lib/data/frequency-core";
import type { DictionaryEntry, Lesson, Unit } from "@/lib/data/types";

const units: Unit[] = [
  { slug: "u1", volumeNumber: 1, number: 1, title_ar: "الوحدة الأولى" },
];
const lessons: Lesson[] = [
  {
    slug: "l1",
    unitSlug: "u1",
    volumeNumber: 1,
    title_ar: "نص ١",
    body_ar: "ذهبَ الطالبُ إلى الجامعةِ. والطلابُ يدرسون.",
  },
  {
    slug: "l2",
    unitSlug: "u1",
    volumeNumber: 1,
    title_ar: "نص ٢",
    body_ar: "البيتُ كبيرٌ.",
  },
];

// Lookup tiruan: petakan beberapa bentuk ke entri berakar sama.
const ENTRIES: Record<string, DictionaryEntry> = {
  طالب: entry("طالب", "ط ل ب"),
  طلاب: entry("طلاب", "ط ل ب"),
  بيت: entry("بيت", "ب ي ت"),
};
function entry(lemma: string, root: string): DictionaryEntry {
  return {
    lemma_ar: lemma,
    root_ar: root,
    meaning_ar: "—",
    synonyms_ar: [],
    antonyms_ar: [],
    examples_ar: [],
  };
}
// Cocokkan dengan melepas ال / وال sederhana untuk pengujian.
function lookup(word: string): DictionaryEntry | null {
  const bare = word.replace(/[ًٌٍَُِّْ]/g, "");
  for (const key of Object.keys(ENTRIES)) {
    if (bare === key || bare === "ال" + key || bare === "وال" + key) {
      return ENTRIES[key];
    }
  }
  return null;
}

describe("frequencyFromSeed", () => {
  test("kata tak dikenal → null", () => {
    expect(frequencyFromSeed("زقفونة", lessons, units, lookup)).toBeNull();
  });

  test("menghitung semua bentuk se-akar lintas teks", () => {
    const f = frequencyFromSeed("طالب", lessons, units, lookup)!;
    expect(f.root_ar).toBe("ط ل ب");
    // "الطالبُ" + "والطلابُ" → 2 kemunculan
    expect(f.total).toBe(2);
  });

  test("setiap kemunculan menyimpan posisi token & metadata", () => {
    const f = frequencyFromSeed("طالب", lessons, units, lookup)!;
    for (const o of f.occurrences) {
      expect(o.lessonSlug).toBe("l1");
      expect(o.unitTitle).toBe("الوحدة الأولى");
      expect(typeof o.position).toBe("number");
      expect(o.snippet.length).toBeGreaterThan(0);
    }
  });

  test("akar berbeda dihitung terpisah", () => {
    const f = frequencyFromSeed("بيت", lessons, units, lookup)!;
    expect(f.root_ar).toBe("ب ي ت");
    expect(f.total).toBe(1);
    expect(f.occurrences[0].lessonSlug).toBe("l2");
  });
});

describe("makeSnippet", () => {
  test("memotong dengan elipsis saat teks panjang", () => {
    const body = "ك".repeat(200);
    const s = makeSnippet(body, 100, 105);
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
  });
});
