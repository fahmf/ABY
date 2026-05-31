# Menjalankan ABY dengan Supabase + Gemini (di mesin lokal)

> Host Supabase diblokir di environment Claude-on-web (`host_not_allowed`),
> jadi langkah DB ini dijalankan di **mesin lokalmu** (tanpa blokir).
> Gemini sudah terverifikasi bekerja (`gemini-3.5-flash`).

## 0. Prasyarat
- `.env.local` sudah berisi kredensial (sudah dibuat; ter-gitignore).
- `bun install` sudah dijalankan.

## 1. Jalankan migrasi skema
Buka **Supabase Dashboard → SQL Editor → New query**, lalu tempel & jalankan
**berurutan**:
1. Isi `supabase/migrations/0001_init.sql`
2. Isi `supabase/migrations/0002_dictionary_lemma_norm.sql`

(Atau dengan Supabase CLI: `supabase db push`.)

## 2. Seed konten Jilid 1 (opsional, untuk data awal)
Tanam jilid/unit/teks contoh dari `src/lib/data/seed.ts` ke DB:

```bash
bun run seed
```

Skrip ini memakai **service role key** dari `.env.local` (server-side).

## 3. Buat akun admin pertama
1. **Authentication → Users → Add user** (email + password).
2. Salin UUID user.
3. **SQL Editor**:
   ```sql
   insert into profiles (id, email, role)
   values ('<USER_UUID>', '<email>', 'admin');
   ```

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
