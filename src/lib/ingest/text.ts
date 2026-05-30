import { normalize, tokenize } from "@/lib/arabic";

// Helper murni untuk pipeline ingest (tanpa I/O) — dapat diuji unit.

/** Akar tanpa spasi & diakritik (kunci kanonik tabel roots). */
export function rootKey(root: string): string {
  return normalize(root).replace(/\s+/g, "");
}

/** Kata unik (berharakat) dari sebuah teks, diindeks oleh bentuk ternormalkan. */
export function uniqueWords(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const seg of tokenize(body)) {
    if (seg.type !== "word") continue;
    const key = normalize(seg.text);
    if (key && !map.has(key)) map.set(key, seg.text);
  }
  return map;
}

/** Bagi array menjadi potongan berukuran `size`. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
