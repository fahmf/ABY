-- Saran "هل تقصد؟" (did you mean) untuk kata yang tak ditemukan persis.
-- Memakai kemiripan trigram (pg_trgm) terhadap lemma_norm, dengan AMBANG BATAS
-- agar tidak memunculkan noise (hanya tampil bila cukup mirip — mis. salah ketik
-- atau ejaan berbeda). Mengandalkan index GIN trgm yang sudah ada.

create or replace function public.suggest_dictionary(
  p_q text,
  p_threshold real default 0.4,
  p_limit int default 5
) returns table (lemma_ar text, root_ar text, meaning_ar text, sim real)
language sql stable
as $$
  select d.lemma_ar,
         coalesce(r.root_ar, '') as root_ar,
         coalesce(d.meaning_ar, '') as meaning_ar,
         similarity(d.lemma_norm, p_q) as sim
  from public.dictionary_entries d
  left join public.roots r on r.id = d.root_id
  where d.status = 'published'
    and d.lemma_norm % p_q
    and similarity(d.lemma_norm, p_q) >= p_threshold
  order by sim desc
  limit greatest(p_limit, 1);
$$;
