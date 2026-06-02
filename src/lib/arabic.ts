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

// Klitik depan & akhiran umum untuk heuristik pencocokan bentuk kata → lemma.
const PREFIXES = [
  "وبال", "فبال", "وال", "فال", "بال", "كال", "است", "مست", "لل", "ال",
  "وس", "فس", "مت", "س",
  "و", "ف", "ب", "ك", "ل",
  "أ", "ن", "ي", "ت"
];
// Disusun dari yang terpanjang agar pemotongan berlapis menjangkau lemma.
const SUFFIXES = [
  // ganti-nama objek/milik bersambung & akhiran fi'il (termasuk gabungan)
  "كموها", "تموها", "تموه", "ونها", "ونهم", "وننا",
  "تها", "هما", "كما", "تما", "ونه", "وني", "ناها", "ناه",
  "هم", "هن", "كم", "كن", "نا", "ها", "تم", "تن", "ني",
  "ه", "ك", "ي",
  // akhiran jamak/mutsanna & ta marbuthah
  "ات", "ون", "ين", "ان", "وا", "ة", "ا"
];

/**
 * Kandidat lemma yang dinormalkan untuk satu bentuk kata (surface).
 * Memakai pemotongan berlapis (rekursif) agar mendeteksi kata kompleks,
 * lalu menambah varian تاء marbuthah (akhiran ت → ه) karena ة berubah jadi ت
 * saat bersambung dengan dhamir (mis. طاقتك → طاقت → طاقه).
 */
export function lemmaCandidates(surface: string): string[] {
  const base = normalize(surface);
  const out = new Set<string>([base]);

  // Fungsi rekursif untuk memotong awalan dan akhiran
  function generate(word: string) {
    if (word.length <= 2) return;

    // Potong akhiran
    for (const s of SUFFIXES) {
      if (word.endsWith(s) && word.length - s.length >= 2) {
        const stripped = word.slice(0, -s.length);
        if (!out.has(stripped)) {
          out.add(stripped);
          generate(stripped); // rekursi ke sisa kata
        }
      }
    }

    // Potong awalan
    for (const p of PREFIXES) {
      if (word.startsWith(p) && word.length - p.length >= 2) {
        const stripped = word.slice(p.length);
        if (!out.has(stripped)) {
          out.add(stripped);
          generate(stripped); // rekursi ke sisa kata
        }
      }
    }
  }

  generate(base);

  // Varian تاء marbuthah: stem berakhiran ت (dari ة yang tersambung) → ه.
  for (const c of [...out]) {
    if (c.length >= 3 && c.endsWith("ت")) out.add(c.slice(0, -1) + "ه");
  }

  // Buang potongan terlalu pendek (≤2 huruf) hasil pemotongan berlebih — ini
  // sumber utama "salah deteksi": fragmen pendek kerap bertabrakan dengan
  // lemma tak terkait. Bentuk asli (base) tetap dipertahankan walau pendek,
  // agar kata fungsi 2-huruf (مِن، في، هل) tetap cocok dengan dirinya sendiri.
  const candidates = [...out].filter((c) => c === base || c.length >= 3);

  return candidates.sort((a, b) => b.length - a.length);
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
