import { describe, expect, test } from "bun:test";

import {
  lemmaCandidates,
  normalize,
  stripDiacritics,
  tokenize,
} from "@/lib/arabic";

describe("stripDiacritics", () => {
  test("membuang harakat", () => {
    expect(stripDiacritics("السَّلامُ")).toBe("السلام");
  });
  test("membuang tatweel", () => {
    expect(stripDiacritics("سـلام")).toBe("سلام");
  });
  test("teks tanpa harakat tak berubah", () => {
    expect(stripDiacritics("بيت")).toBe("بيت");
  });
});

describe("normalize", () => {
  test("menyamakan alif berhamzah ke alif", () => {
    expect(normalize("أَسْرَة")).toBe(normalize("اسره"));
    expect(normalize("إيمان")).toBe("ايمان");
  });
  test("ya maqsura → ya", () => {
    expect(normalize("إلى")).toBe("الي");
  });
  test("ta marbuta → ha", () => {
    expect(normalize("جامِعَة")).toBe("جامعه");
  });
  test("hamza di atas waw/ya → hamza", () => {
    expect(normalize("مُؤمن")).toBe("مءمن");
  });
});

describe("tokenize", () => {
  const text = "السَّلامُ عَلَيْكُمْ.";

  test("memisahkan kata dan pemisah", () => {
    const segs = tokenize(text);
    const words = segs.filter((s) => s.type === "word");
    expect(words.length).toBe(2);
  });

  test("offset karakter menunjuk kata yang benar", () => {
    const segs = tokenize(text);
    const first = segs.find((s) => s.type === "word")!;
    expect(text.slice(first.start, first.end)).toBe("السَّلامُ");
  });

  test("indeks kata berurutan mulai dari 0", () => {
    const words = tokenize(text).filter((s) => s.type === "word");
    expect(words.map((w) => (w.type === "word" ? w.index : -1))).toEqual([
      0, 1,
    ]);
  });

  test("teks kosong menghasilkan nol kata", () => {
    expect(tokenize("").length).toBe(0);
  });

  test("merekonstruksi teks asli dari semua segmen", () => {
    const joined = tokenize(text)
      .map((s) => s.text)
      .join("");
    expect(joined).toBe(text);
  });
});

describe("lemmaCandidates", () => {
  test("menyertakan bentuk dasar ternormalkan", () => {
    expect(lemmaCandidates("بيت")).toContain("بيت");
  });

  test("melepas awalan ال", () => {
    expect(lemmaCandidates("الطالب")).toContain("طالب");
  });

  test("melepas awalan وال (wa + al)", () => {
    const cands = lemmaCandidates("وَالطُّلّابُ");
    expect(cands).toContain("طلاب");
  });

  test("melepas akhiran ta marbuta yg ternormalkan", () => {
    // الجامعة → normalize → الجامعه ; lepas ال → جامعه ; lepas ه → جامع
    expect(lemmaCandidates("الجامِعَةِ")).toContain("جامع");
  });

  test("tidak melepas hingga sisa terlalu pendek", () => {
    // tiap kandidat minimal 2 huruf
    for (const c of lemmaCandidates("الو")) {
      expect(c.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("melepas awalan fi'il + akhiran objek (تُخاصِمْني → خاصم)", () => {
    expect(lemmaCandidates("تُخاصِمْني")).toContain("خاصم");
  });

  test("ta marbuthah bersambung: طاقَتِكَ → طاقه", () => {
    // ة berubah jadi ت saat bersambung dhamir; varian ت→ه harus muncul
    expect(lemmaCandidates("طاقَتِكَ")).toContain("طاقه");
  });

  test("akhiran objek ها pada fi'il (يَفْهَمُها → فهم)", () => {
    expect(lemmaCandidates("يَفْهَمُها")).toContain("فهم");
  });
});
