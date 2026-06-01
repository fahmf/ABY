-- ABY — pengayaan kamus: jenis kata, jamak/mufrad, dan tashrif fi'il.
--
-- Kolom tambahan (semua opsional/nullable) pada dictionary_entries:
--   word_type   : jenis kata (اسم/فعل/حرف/…)
--   plural_ar   : الجمع   — bentuk jamak (untuk اسم), bila ada
--   singular_ar : المفرد  — bentuk mufrad (untuk اسم jamak), bila ada
--   past_ar     : الماضي  — fi'il madhi (untuk فعل)
--   present_ar  : المضارع — fi'il mudhari' (untuk فعل)
--   masdar_ar   : المصدر  — mashdar (untuk فعل)
--
-- meaning_ar tetap menjadi "penjelasan/المعنى". Bersifat additive — entri lama
-- tetap valid (kolom NULL) sampai diisi via edit manual atau ingest berikutnya.

alter table dictionary_entries
  add column if not exists word_type   text,
  add column if not exists plural_ar    text,
  add column if not exists singular_ar  text,
  add column if not exists past_ar      text,
  add column if not exists present_ar   text,
  add column if not exists masdar_ar    text;
