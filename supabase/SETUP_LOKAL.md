# Menjalankan ABY dengan Supabase + Gemini (di mesin lokal)

> Host Supabase diblokir di environment Claude-on-web (`host_not_allowed`),
> jadi langkah DB ini dijalankan di **mesin lokalmu** (tanpa blokir).
> Gemini sudah terverifikasi bekerja (`gemini-3.5-flash`).

## 0. Prasyarat
- `.env.local` sudah berisi kredensial (sudah dibuat; ter-gitignore).
- `bun install` sudah dijalankan.

## 1. Jalankan migrasi skema
Buka **Supabase Dashboard → SQL Editor → New query**, lalu tempel & jalankan
**semua** file di `supabase/migrations/` secara **berurutan** (0001 → 0008):
0001 init · 0002 lemma_norm · 0003 ingest_cursor · 0004 dictionary_helpers ·
0005 morphology · 0006 staff_approval_security · 0007 replace_lesson_tokens ·
0008 search_trgm_indexes · 0009 dictionary_suggestions.

(Atau dengan Supabase CLI: `supabase db push`.)

> Migrasi **0006** menutup celah eskalasi hak akses: pendaftar baru kini default
> `approved = false` (tidak otomatis jadi staff). Pastikan akun admin pertama
> di-set `approved = true` (lihat langkah 3).

## 2. Seed konten Jilid 1 (opsional, untuk data awal)
Tanam jilid/unit/teks contoh dari `src/lib/data/seed.ts` ke DB:

```bash
bun run seed
```

Skrip ini memakai **service role key** dari `.env.local` (server-side).

## 3. Buat akun admin pertama
1. **Authentication → Users → Add user** (email + password).
2. Salin UUID user.
3. **SQL Editor** (trigger sudah membuat baris profile saat user dibuat —
   cukup promosikan & setujui):
   ```sql
   update profiles
   set role = 'admin', approved = true
   where id = '<USER_UUID>';
   ```
   (Atau insert manual bila baris belum ada:
   `insert into profiles (id, email, role, approved) values ('<USER_UUID>', '<email>', 'admin', true);`)

## 4. Jalankan & uji
```bash
bun run dev
```
- Buka `/` → Jilid 1 → unit → teks → klik kata (kamus dari DB jika sudah di-ingest, atau seed).
- Buka `/admin/login` → masuk → buat/edit teks → klik **معالجة** (Gemini meng-ingest:
  akar + draft kamus) → `/admin/dictionary` verifikasi → publish.
- Kembali ke `/baca/...` → klik kata → kamus DB + **عدد مرّات ورود الجذر** + deep-link.

## Catatan keamanan
Rotasi **service role key** setelah pengujian (key ini bypass RLS).
