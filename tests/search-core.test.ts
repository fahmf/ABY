import { describe, expect, test } from "bun:test";

import { searchSeed, snippetAround } from "@/lib/data/search-core";
import type { Lesson, Unit } from "@/lib/data/types";

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
