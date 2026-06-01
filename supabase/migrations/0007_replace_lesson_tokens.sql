-- Penggantian token sebuah pelajaran secara ATOMIK.
--
-- Sebelumnya pipeline & fast-index melakukan DELETE lalu INSERT berbatch tanpa
-- transaksi; bila gagal di tengah, pelajaran tertinggal dengan token parsial.
-- Fungsi plpgsql berjalan dalam satu transaksi, sehingga delete+insert bersifat
-- all-or-nothing.

create or replace function public.replace_lesson_tokens(
  p_lesson_id uuid,
  p_tokens jsonb
) returns void
language plpgsql
as $$
begin
  delete from public.tokens where lesson_id = p_lesson_id;

  insert into public.tokens
    (lesson_id, position, surface_ar, lemma_ar, root_id, char_start, char_end)
  select
    p_lesson_id,
    (t->>'position')::int,
    t->>'surface_ar',
    nullif(t->>'lemma_ar', ''),
    nullif(t->>'root_id', '')::uuid,
    (t->>'char_start')::int,
    (t->>'char_end')::int
  from jsonb_array_elements(coalesce(p_tokens, '[]'::jsonb)) as t;
end;
$$;
