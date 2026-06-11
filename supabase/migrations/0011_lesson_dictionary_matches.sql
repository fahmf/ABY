-- Kecocokan token ↔ kamus sebuah pelajaran, dihitung di DB.
--
-- Sebelumnya server memuat SEMUA token pelajaran lalu memfilternya terhadap
-- daftar lemma terpublikasi di memori (dua query + payload besar). Fungsi ini
-- mengerjakan join di Postgres dan hanya mengembalikan (position, lemma_ar)
-- yang punya entri kamus published. SECURITY INVOKER (default) → RLS tetap
-- berlaku: anon hanya melihat token pelajaran published & kamus published.

create or replace function public.lesson_dictionary_matches(p_slug text)
returns table ("position" int, lemma_ar text)
language sql
stable
as $$
  select t.position, t.lemma_ar
  from public.tokens t
  join public.lessons l on l.id = t.lesson_id
  join public.dictionary_entries d
    on d.lemma_ar = t.lemma_ar and d.status = 'published'
  where l.slug = p_slug
    and t.lemma_ar is not null;
$$;
