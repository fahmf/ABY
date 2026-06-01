-- ABY — kursor ingest untuk pipeline yang dapat dilanjutkan (resumable).
-- Menyimpan indeks batch berikutnya yang harus diproses. 0 = mulai dari awal.
-- Saat ingest selesai sepenuhnya, kursor dikembalikan ke 0 dan ingested_at diisi.

alter table lessons
  add column if not exists ingest_cursor int not null default 0;
