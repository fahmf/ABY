import { describe, expect, test } from "bun:test";

import { lookupWord } from "@/lib/data/dictionary";

describe("lookupWord (kamus seed)", () => {
  test("menemukan lema langsung", () => {
    const e = lookupWord("بيت");
    expect(e?.root_ar).toBe("ب ي ت");
  });

  test("menemukan lewat awalan ال", () => {
    const e = lookupWord("الطالب");
    expect(e?.lemma_ar).toBe("طالب");
  });

  test("menemukan bentuk berharakat", () => {
    const e = lookupWord("الجامِعَةِ");
    expect(e?.root_ar).toBe("ج م ع");
  });

  test("mengembalikan null untuk kata tak dikenal", () => {
    expect(lookupWord("زقفونة")).toBeNull();
  });

  test("entri menyertakan medan kamus lengkap", () => {
    const e = lookupWord("سلام");
    expect(e).not.toBeNull();
    expect(Array.isArray(e!.synonyms_ar)).toBe(true);
    expect(Array.isArray(e!.antonyms_ar)).toBe(true);
    expect(Array.isArray(e!.examples_ar)).toBe(true);
    expect(e!.meaning_ar.length).toBeGreaterThan(0);
  });
});
