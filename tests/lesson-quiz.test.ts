import { describe, expect, test } from "bun:test";

import { buildQuiz } from "@/components/reader/lesson-quiz";
import type { VocabItem } from "@/lib/data/repository";

// Kosakata uji: kata dengan makna, lemma, & akar berbeda. Tanpa contoh
// (examples_ar kosong) → soal terbatas pada makna/terbalik (bukan cloze).
const VOCAB: VocabItem[] = [
  { lemma_ar: "كتب", meaning_ar: "menulis", root_ar: "ك ت ب", examples_ar: [] },
  { lemma_ar: "قرأ", meaning_ar: "membaca", root_ar: "ق ر ا", examples_ar: [] },
  { lemma_ar: "درس", meaning_ar: "belajar", root_ar: "د ر س", examples_ar: [] },
  { lemma_ar: "جلس", meaning_ar: "duduk", root_ar: "ج ل س", examples_ar: [] },
  { lemma_ar: "ذهب", meaning_ar: "pergi", root_ar: "ذ ه ب", examples_ar: [] },
];

describe("buildQuiz", () => {
  test("membuat soal dengan tepat 4 pilihan unik & jawaban valid", () => {
    const qs = buildQuiz(VOCAB);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4); // tanpa duplikat
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
    }
  });

  test("pilihan pada posisi answer adalah jawaban benar sesuai tipe", () => {
    for (const q of buildQuiz(VOCAB)) {
      const correct = q.options[q.answer];
      if (q.kind === "meaning") expect(correct).toBe(q.word.meaning_ar);
      else expect(correct).toBe(q.word.lemma_ar); // reverse & cloze
    }
  });

  test("hanya membuat tipe soal yang didukung (tanpa soal akar)", () => {
    for (const q of buildQuiz(VOCAB)) {
      expect(["meaning", "reverse", "cloze"]).toContain(q.kind);
    }
  });

  test("soal cloze muncul bila ada contoh yang memuat الكلمة", () => {
    const withExamples: VocabItem[] = [
      { lemma_ar: "كتب", meaning_ar: "menulis", root_ar: "ك ت ب", examples_ar: ["كتب الطالب الدرس."] },
      { lemma_ar: "قرأ", meaning_ar: "membaca", root_ar: "ق ر ا", examples_ar: ["قرأ الولد الكتاب."] },
      { lemma_ar: "درس", meaning_ar: "belajar", root_ar: "د ر س", examples_ar: ["درس محمد بجد."] },
      { lemma_ar: "جلس", meaning_ar: "duduk", root_ar: "ج ل س", examples_ar: ["جلس الرجل هنا."] },
    ];
    // Bangun beberapa kali (tipe dipilih acak) — cloze harus mungkin muncul.
    const kinds = new Set<string>();
    for (let i = 0; i < 50; i++)
      for (const q of buildQuiz(withExamples)) kinds.add(q.kind);
    expect(kinds.has("cloze")).toBe(true);
  });

  test("tidak melebihi 10 soal", () => {
    const big = Array.from({ length: 30 }, (_, i) => ({
      lemma_ar: `كلمة${i}`,
      meaning_ar: `makna ${i}`,
      root_ar: `ج ذ ${i}`,
      examples_ar: [],
    }));
    expect(buildQuiz(big).length).toBeLessThanOrEqual(10);
  });

  test("mengembalikan kosong bila kosakata terlalu sedikit untuk pengecoh", () => {
    const tiny: VocabItem[] = [
      { lemma_ar: "كتب", meaning_ar: "menulis", root_ar: "ك ت ب", examples_ar: [] },
      { lemma_ar: "قرأ", meaning_ar: "membaca", root_ar: "ق ر ا", examples_ar: [] },
    ];
    expect(buildQuiz(tiny).length).toBe(0);
  });
});
