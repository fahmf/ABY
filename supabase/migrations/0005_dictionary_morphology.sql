-- Penambahan kolom morfologi pada tabel dictionary_entries
ALTER TABLE dictionary_entries 
  ADD COLUMN IF NOT EXISTS word_type text,
  ADD COLUMN IF NOT EXISTS plural_ar text,
  ADD COLUMN IF NOT EXISTS singular_ar text,
  ADD COLUMN IF NOT EXISTS past_ar text,
  ADD COLUMN IF NOT EXISTS present_ar text,
  ADD COLUMN IF NOT EXISTS masdar_ar text;
