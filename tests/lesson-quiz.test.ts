import { describe, expect, test } from "bun:test";

import { buildQuiz } from "@/components/reader/lesson-quiz";
import type { VocabItem } from "@/lib/data/repository";

// Kosakata uji: 5 kata dengan makna, lemma, & akar yang berbeda-beda
// sehingga ketiga tipe soal (meaning/reverse/root) layak dibuat.
const VOCAB: VocabItem[] = [
  { lemma_ar: "كتب", meaning_ar: "menulis", root_ar: "ك ت ب" },
  { lemma_ar: "قرأ", meaning_ar: "membaca", root_ar: "ق ر ا" },
  { lemma_ar: "درس", meaning_ar: "belajar", root_ar: "د ر س" },
  { lemma_ar: "جلس", meaning_ar: "duduk", root_ar: "ج ل س" },
  { lemma_ar: "ذهب", meaning_ar: "pergi", root_ar: "ذ ه ب" },
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
      if (q.type === "meaning") expect(correct).toBe(q.word.meaning_ar);
      else if (q.type === "reverse") expect(correct).toBe(q.word.lemma_ar);
      else expect(correct).toBe(q.word.root_ar);
    }
  });

  test("tidak melebihi 10 soal", () => {
    const big = Array.from({ length: 30 }, (_, i) => ({
      lemma_ar: `كلمة${i}`,
      meaning_ar: `makna ${i}`,
      root_ar: `ج ذ ${i}`,
    }));
    expect(buildQuiz(big).length).toBeLessThanOrEqual(10);
  });

  test("mengembalikan kosong bila kosakata terlalu sedikit untuk pengecoh", () => {
    const tiny: VocabItem[] = [
      { lemma_ar: "كتب", meaning_ar: "menulis", root_ar: "ك ت ب" },
      { lemma_ar: "قرأ", meaning_ar: "membaca", root_ar: "ق ر ا" },
    ];
    expect(buildQuiz(tiny).length).toBe(0);
  });
});
