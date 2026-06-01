-- Pengetatan keamanan staff (menutup eskalasi hak akses).
--
-- MASALAH (sebelumnya): trigger handle_new_user() memberi role 'editor' kepada
-- SETIAP pengguna baru, dan is_staff() hanya mengecek keberadaan baris profile.
-- Karena endpoint signup Supabase Auth bersifat publik, siapa pun yang
-- mendaftar otomatis menjadi staff dan bisa menulis/menghapus seluruh konten.
--
-- PERBAIKAN: tambahkan kolom `approved`. Hanya profile yang `approved = true`
-- yang dianggap staff. Pendaftar baru default `approved = false` (tak berhak),
-- menunggu persetujuan admin secara manual. Profile yang sudah ada saat migrasi
-- ini dijalankan di-backfill menjadi approved agar staff lama tidak terkunci.

alter table profiles
  add column if not exists approved boolean not null default false;

-- Backfill: profile yang dibuat sebelum pengetatan ini dianggap tepercaya.
update profiles set approved = true where approved = false;

-- is_staff(): kini wajib approved = true DAN role yang sah.
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approved = true
      and p.role in ('admin', 'editor')
  );
$$;

-- is_admin(): untuk pembedaan peran (RBAC) bila diperlukan kebijakan ketat.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approved = true
      and p.role = 'admin'
  );
$$;

-- Trigger pembuat profile tetap berjalan, tetapi karena default approved=false
-- pendaftar baru TIDAK otomatis menjadi staff.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, approved)
  values (new.id, new.email, 'editor', false);
  return new;
end;
$$ language plpgsql security definer;

-- CATATAN BOOTSTRAP: untuk menjadikan seorang pengguna admin yang aktif:
--   update profiles set role = 'admin', approved = true where email = 'you@example.com';
