-- ABY — fungsi helper untuk halaman baca (reader).
--
-- lesson_dictionary_matches(p_slug): kembalikan (position, lemma_ar) untuk setiap
-- token pada pelajaran yang lemma-nya ADA di kamus (status 'published') — dalam
-- SATU round-trip. Menggantikan rangkaian query terpisah di getDictionaryMatches
-- (lessons → tokens → dictionary_entries) sekaligus menghilangkan
-- `.in("lemma_ar", uniqueLemmas)` yang bisa melewati batas panjang URL PostgREST
-- saat daftar lemma unik membesar pada teks panjang.
--
-- SECURITY INVOKER (default): RLS tetap berlaku — token hanya untuk pelajaran
-- published (kebijakan "tokens public read") dan hanya entri kamus published.
-- Semua kolom yang dipilih di-kualifikasi (t./l./d.) agar tidak ambigu dengan
-- nama kolom keluaran RETURNS TABLE.

create or replace function lesson_dictionary_matches(p_slug text)
returns table ("position" int, lemma_ar text)
language sql
stable
set search_path = public
as $$
  select t.position, t.lemma_ar
  from tokens t
  join lessons l on l.id = t.lesson_id
  join dictionary_entries d
    on d.lemma_ar = t.lemma_ar and d.status = 'published'
  where l.slug = p_slug
    and t.lemma_ar is not null
  order by t.position;
$$;

grant execute on function lesson_dictionary_matches(text) to anon, authenticated;
