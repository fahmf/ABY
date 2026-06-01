// Tipe data domain (selaras dengan skema Supabase di supabase/migrations).

export type Volume = {
  number: number;
  title_ar: string;
  slug: string;
};

export type Unit = {
  slug: string;
  volumeNumber: number;
  number: number;
  title_ar: string;
};

export type Lesson = {
  slug: string;
  unitSlug: string;
  volumeNumber: number;
  title_ar: string;
  body_ar: string;
};

export type DictionaryEntry = {
  lemma_ar: string;
  root_ar: string; // mis. "ك ت ب"
  meaning_ar: string;
  synonyms_ar: string[];
  antonyms_ar: string[];
  examples_ar: string[];
} & Morphology;

/**
 * Morfologi opsional: jenis kata + jamak/mufrad (untuk اسم) + tashrif fi'il
 * (الماضي/المضارع/المصدر). Semua opsional — hanya ditampilkan bila terisi.
 */
export type Morphology = {
  word_type?: string; // نوع الكلمة: اسم/فعل/حرف…
  plural_ar?: string; // الجمع
  singular_ar?: string; // المفرد
  past_ar?: string; // الماضي
  present_ar?: string; // المضارع
  masdar_ar?: string; // المصدر
};

// Kolom morfologi di tabel dictionary_entries (untuk string select PostgREST).
export const MORPHOLOGY_COLUMNS =
  "word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar";

/** Ambil field morfologi dari baris DB; kosong/null → undefined (tak ditampilkan). */
export function pickMorphology(row: Record<string, unknown>): Morphology {
  const s = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  return {
    word_type: s(row.word_type),
    plural_ar: s(row.plural_ar),
    singular_ar: s(row.singular_ar),
    past_ar: s(row.past_ar),
    present_ar: s(row.present_ar),
    masdar_ar: s(row.masdar_ar),
  };
}
