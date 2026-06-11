-- Penanda penyegaran makna (untuk "tabsîth al-ma'ânî" — penyederhanaan massal).
--
-- Saat persona prompt Gemini diubah agar maknanya lebih sederhana untuk pemula,
-- entri kamus lama tetap memakai makna lama yang berat. Proses penyegaran
-- massal memproses entri yang belum disegarkan secara bertahap (resumable);
-- kolom ini menandai entri yang sudah diproses agar proses tak mengulang.
--
-- NULL  = belum disegarkan (masih makna lama / perlu diproses).
-- terisi = sudah diproses oleh penyegaran terbaru.

alter table dictionary_entries
  add column if not exists meaning_refreshed_at timestamptz;

-- Indeks parsial: hanya entri yang belum disegarkan, diurutkan kronologis —
-- membuat pengambilan batch berikutnya murah meski tabel besar.
create index if not exists dict_meaning_refresh_idx
  on dictionary_entries (created_at)
  where meaning_refreshed_at is null;
