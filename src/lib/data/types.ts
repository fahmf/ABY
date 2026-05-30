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
};
