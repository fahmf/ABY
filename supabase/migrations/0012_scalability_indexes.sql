-- Indeks pendukung skalabilitas.
--
-- 1) lessons.slug dicari berkali-kali (getLesson, RPC lesson_dictionary_matches,
--    deep-link). Keunikan yang ada hanya (unit_id, slug), bukan slug global —
--    jadi tanpa indeks ini lookup by-slug memaksa scan. Routing /baca/[lesson]
--    memperlakukan slug unik global, jadi indeks ini aman & berguna.
-- 2) tokens.lemma_ar dipakai join ke kamus (lesson_dictionary_matches) dan
--    pencarian per-lemma; indeks parsial (abaikan NULL) menjaga ukurannya kecil.
-- 3) dictionary_entries.status dipakai untuk filter draft/published di antrian
--    admin & statistik.

create index if not exists lessons_slug_idx on lessons (slug);

create index if not exists tokens_lemma_idx
  on tokens (lemma_ar)
  where lemma_ar is not null;

create index if not exists dict_status_idx on dictionary_entries (status);

-- Pembersihan log rate-limit analyze_hits secara terjadwal bila pg_cron tersedia
-- (lebih andal daripada pembersihan oportunistik 5% di jalur permintaan).
-- Aman diabaikan bila ekstensi tak terpasang.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'aby-purge-analyze-hits',
      '17 3 * * *',
      $cron$delete from public.analyze_hits where ts < now() - interval '1 day'$cron$
    );
  end if;
exception when others then
  -- Tak punya hak menjadwalkan / ekstensi tak aktif → lewati diam-diam.
  null;
end $$;
