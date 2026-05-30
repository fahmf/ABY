# Setup Supabase (ABY)

## 1. Buat project & isi env
Di `.env.local` (lihat `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 2. Jalankan migrasi
Buka **SQL Editor** Supabase, jalankan isi `migrations/0001_init.sql`
(atau pakai Supabase CLI: `supabase db push`).

## 3. Buat akun admin pertama
1. **Authentication → Users → Add user** (email + password).
2. Salin `id` (UUID) user tersebut.
3. Di SQL Editor, jadikan staff dengan menambah baris `profiles`:

```sql
insert into profiles (id, email, role)
values ('<USER_UUID>', '<email>', 'admin');
```

> Model akses: kehadiran baris di `profiles` = staff. Publik membaca konten
> `published` tanpa login (RLS). Tulis/draft hanya untuk staff.

## 4. Login
Buka `/admin/login`, masuk dengan email/password di atas.
Tanpa env Supabase, situs publik tetap berjalan memakai data seed.
