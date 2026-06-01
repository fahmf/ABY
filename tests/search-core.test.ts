import { describe, expect, test } from "bun:test";

import { orIlike, searchByRoot, searchSeed, snippetAround } from "@/lib/data/search-core";
import type { DictionaryEntry, Lesson, Unit } from "@/lib/data/types";

const units: Unit[] = [
  { slug: "u1", volumeNumber: 1, number: 1, title_ar: "الوحدة الأولى" },
];
const lessons: Lesson[] = [
  {
    slug: "l1",
    unitSlug: "u1",
    volumeNumber: 1,
    title_ar: "السلام عليكم",
    body_ar: "السَّلامُ عَلَيْكُمْ ورحمةُ اللهِ. كيف حالُك؟",
  },
  {
    slug: "l2",
    unitSlug: "u1",
    volumeNumber: 1,
    title_ar: "أسرتي",
    body_ar: "هذِهِ أُسْرَتي وأبي مُدرِّسٌ.",
  },
];

describe("searchSeed", () => {
  test("query terlalu pendek → kosong", () => {
    expect(searchSeed("ا", lessons, units)).toEqual([]);
  });

  test("cocok pada isi tanpa harakat", () => {
    const hits = searchSeed("السلام", lessons, units);
    expect(hits.length).toBe(1);
    expect(hits[0].lessonSlug).toBe("l1");
  });

  test("cocok pada judul", () => {
    const hits = searchSeed("أسرتي", lessons, units);
    expect(hits.map((h) => h.lessonSlug)).toContain("l2");
  });

  test("menyertakan judul unit pada hasil", () => {
    const hits = searchSeed("حالك", lessons, units);
    expect(hits[0].unitTitle).toBe("الوحدة الأولى");
  });

  test("tanpa kecocokan → kosong", () => {
    expect(searchSeed("زقفونة", lessons, units)).toEqual([]);
  });
});

describe("searchByRoot", () => {
  const rootLessons: Lesson[] = [
    {
      slug: "r1",
      unitSlug: "u1",
      volumeNumber: 1,
      title_ar: "نص ١",
      body_ar: "ذهبَ الطالبُ، والطلابُ يدرسون.",
    },
    {
      slug: "r2",
      unitSlug: "u1",
      volumeNumber: 1,
      title_ar: "نص ٢",
      body_ar: "البيتُ كبيرٌ.",
    },
  ];
  const E: Record<string, DictionaryEntry> = {
    طالب: mk("طالب", "ط ل ب"),
    طلاب: mk("طلاب", "ط ل ب"),
    بيت: mk("بيت", "ب ي ت"),
  };
  function mk(lemma: string, root: string): DictionaryEntry {
    return {
      lemma_ar: lemma,
      root_ar: root,
      meaning_ar: "",
      synonyms_ar: [],
      antonyms_ar: [],
      examples_ar: [],
    };
  }
  function lookup(word: string): DictionaryEntry | null {
    const bare = word.replace(/[ًٌٍَُِّْ]/g, "");
    for (const k of Object.keys(E)) {
      if (bare === k || bare === "ال" + k || bare === "وال" + k) return E[k];
    }
    return null;
  }

  test("query tak dikenal → kosong", () => {
    expect(searchByRoot("زقفونة", rootLessons, units, lookup)).toEqual([]);
  });

  test("menemukan teks dgn kata se-akar", () => {
    const hits = searchByRoot("طالب", rootLessons, units, lookup);
    expect(hits.map((h) => h.lessonSlug)).toEqual(["r1"]);
  });

  test("akar berbeda menargetkan teks berbeda", () => {
    const hits = searchByRoot("بيت", rootLessons, units, lookup);
    expect(hits.map((h) => h.lessonSlug)).toEqual(["r2"]);
  });

  test("query terlalu pendek → kosong", () => {
    expect(searchByRoot("ا", rootLessons, units, lookup)).toEqual([]);
  });
});

describe("orIlike", () => {
  test("membungkus pola dalam tanda kutip & menyusun multi-kolom", () => {
    expect(orIlike(["a", "b"], "بيت")).toBe(
      'a.ilike."%بيت%",b.ilike."%بيت%"'
    );
  });

  test("escape wildcard LIKE (% _ \\)", () => {
    // LIKE-escape ('\%') lalu PostgREST-escape backslash ('\\') → dua backslash.
    expect(orIlike(["a"], "50%")).toBe('a.ilike."%50\\\\%%"');
    expect(orIlike(["a"], "a_b")).toBe('a.ilike."%a\\\\_b%"');
  });

  test("koma & tanda kurung tidak merusak struktur filter", () => {
    // Koma tetap di dalam tanda kutip → bukan pemisah filter PostgREST.
    expect(orIlike(["a"], "x,y")).toBe('a.ilike."%x,y%"');
    expect(orIlike(["a"], "f(o)")).toBe('a.ilike."%f(o)%"');
  });

  test("escape tanda kutip ganda & backslash untuk lapis PostgREST", () => {
    expect(orIlike(["a"], '"')).toBe('a.ilike."%\\"%"');
  });
});

describe("snippetAround", () => {
  test("menambah elipsis di kedua sisi saat terpotong", () => {
    const body = "ا".repeat(200);
    const s = snippetAround(body, 100, 3);
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
  });

  test("tanpa elipsis bila mencakup seluruh teks", () => {
    const s = snippetAround("بيت", 0, 3);
    expect(s).toBe("بيت");
  });
});
