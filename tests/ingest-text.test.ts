import { describe, expect, test } from "bun:test";

import { chunk, rootKey, uniqueWords } from "@/lib/ingest/text";

describe("rootKey", () => {
  test("membuang spasi antar huruf akar", () => {
    expect(rootKey("ك ت ب")).toBe("كتب");
  });
  test("menormalkan diakritik & varian huruf", () => {
    expect(rootKey("أ س ر")).toBe("اسر");
  });
});

describe("uniqueWords", () => {
  test("mengelompokkan bentuk yang sama setelah normalisasi", () => {
    // "السلام" muncul dua kali dengan tasykil berbeda → satu entri
    const map = uniqueWords("السَّلامُ ... السلام");
    expect(map.size).toBe(1);
  });

  test("menyimpan bentuk berharakat pertama sebagai nilai", () => {
    const map = uniqueWords("بَيْتٌ كبير");
    const values = [...map.values()];
    expect(values).toContain("بَيْتٌ");
  });

  test("mengabaikan tanda baca & angka", () => {
    const map = uniqueWords("بيت، 123 دار.");
    expect(map.size).toBe(2);
  });

  test("teks kosong → peta kosong", () => {
    expect(uniqueWords("").size).toBe(0);
  });
});

describe("chunk", () => {
  test("membagi sesuai ukuran", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  test("array kosong → tanpa potongan", () => {
    expect(chunk([], 3)).toEqual([]);
  });
  test("ukuran lebih besar dari panjang → satu potongan", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });
});
