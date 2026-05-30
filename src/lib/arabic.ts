// Utilitas teks Arab: harakat, normalisasi, dan tokenisasi.

// Tanda harakat/diakritik + tatweel (kashida).
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TATWEEL = /ـ/g;

// Karakter penyusun "kata" Arab (huruf + tanda + tatweel).
const WORD_CHAR =
  /[ء-يٱً-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/;

/** Hapus harakat & tatweel (untuk tampilan tanpa tasykil / pencocokan). */
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, "").replace(TATWEEL, "");
}

/**
 * Normalisasi untuk pencocokan kamus:
 * buang harakat/tatweel, samakan varian alif/hamza, ya maqsura, ta marbuta.
 */
export function normalize(text: string): string {
  return stripDiacritics(text)
    .replace(/[آأإٱ]/g, "ا") // آأإٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/[ؤئ]/g, "ء") // ؤئ → ء
    .trim();
}

export type Segment =
  | { type: "word"; text: string; start: number; end: number; index: number }
  | { type: "sep"; text: string; start: number; end: number };

/**
 * Pecah teks menjadi segmen kata (clickable) & pemisah (spasi/tanda baca),
 * sambil menyimpan offset karakter untuk deep-link/highlight presisi.
 */
export function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let wordIndex = 0;

  while (i < text.length) {
    const isWord = WORD_CHAR.test(text[i]);
    let j = i;
    while (j < text.length && WORD_CHAR.test(text[j]) === isWord) j++;
    const slice = text.slice(i, j);

    if (isWord) {
      segments.push({
        type: "word",
        text: slice,
        start: i,
        end: j,
        index: wordIndex++,
      });
    } else {
      segments.push({ type: "sep", text: slice, start: i, end: j });
    }
    i = j;
  }

  return segments;
}
