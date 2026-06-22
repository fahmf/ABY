-- Tampilan (view) status administrasi pelajaran untuk dasbor admin.
--
-- Menentukan tiga status:
-- 1. has_quiz: minimal ada satu soal pemahaman teks
-- 2. is_fully_indexed: pelajaran sudah di-ingest/index (punya token) dan semua token sudah terpetakan ke lemma_ar (tidak null)
-- 3. is_fully_explained: pelajaran punya token, semua token punya lemma_ar, dan seluruh lemma_ar tersebut memiliki entri kamus berstatus 'published'

create or replace view public.lessons_admin_status as
select 
  l.id as lesson_id,
  
  -- 1) Apakah kuis sudah ada?
  exists (
    select 1 from public.lesson_questions q 
    where q.lesson_id = l.id
  ) as has_quiz,
  
  -- 2) Apakah semua kata sudah terindeks?
  (
    exists (select 1 from public.tokens t where t.lesson_id = l.id)
    and not exists (select 1 from public.tokens t where t.lesson_id = l.id and t.lemma_ar is null)
  ) as is_fully_indexed,
  
  -- 3) Apakah penjelasan mufradat sudah lengkap?
  (
    exists (select 1 from public.tokens t where t.lesson_id = l.id)
    and not exists (
      select 1 from public.tokens t
      left join public.dictionary_entries d on d.lemma_ar = t.lemma_ar
      where t.lesson_id = l.id 
        and (t.lemma_ar is null or d.id is null or d.status = 'draft')
    )
  ) as is_fully_explained
from public.lessons l;

-- Fungsi RPC untuk mengambil daftar pelajaran admin beserta statusnya.
create or replace function public.list_admin_lessons()
returns table (
  id uuid,
  title_ar text,
  slug text,
  body_ar text,
  status content_status,
  unit_id uuid,
  unitTitle text,
  has_quiz boolean,
  is_fully_indexed boolean,
  is_fully_explained boolean
)
language sql stable as $$
  select 
    l.id,
    l.title_ar,
    l.slug,
    l.body_ar,
    l.status,
    l.unit_id,
    u.title_ar as unitTitle,
    s.has_quiz,
    s.is_fully_indexed,
    s.is_fully_explained
  from public.lessons l
  join public.units u on u.id = l.unit_id
  join public.lessons_admin_status s on s.lesson_id = l.id
  order by l.created_at desc;
$$;
