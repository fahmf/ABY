-- ABY — skema awal
-- Jilid → Unit (bab) → Lesson (teks) → Tokens (kata) ; Roots & Dictionary entries.
-- Akses publik: baca konten ber-status 'published'. Tulis: admin/editor saja.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type content_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('admin', 'editor');
exception when duplicate_object then null; end $$;

-- ---------- profiles (admin/editor) ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role app_role not null default 'editor',
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid());
$$;

-- ---------- volumes (jilid) ----------
create table if not exists volumes (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  title_ar text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- units (bab/unit) ----------
create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid not null references volumes (id) on delete cascade,
  number int not null,
  title_ar text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (volume_id, slug)
);

-- ---------- lessons (teks/pelajaran) ----------
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  title_ar text not null,
  slug text not null,
  body_ar text not null default '',
  status content_status not null default 'draft',
  sort_order int not null default 0,
  ingested_at timestamptz,
  created_at timestamptz not null default now(),
  unique (unit_id, slug)
);

-- ---------- roots (akar kanonik) ----------
create table if not exists roots (
  id uuid primary key default gen_random_uuid(),
  root_ar text not null,           -- mis. "ك ت ب"
  normalized text not null unique, -- mis. "كتب" (tanpa spasi/harakat)
  created_at timestamptz not null default now()
);

-- ---------- dictionary_entries (kamus level lemma) ----------
create table if not exists dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  lemma_ar text not null unique,
  lemma_norm text not null default '',
  root_id uuid references roots (id) on delete set null,
  meaning_ar text,
  synonyms_ar jsonb not null default '[]'::jsonb,
  antonyms_ar jsonb not null default '[]'::jsonb,
  examples_ar jsonb not null default '[]'::jsonb,
  status content_status not null default 'draft',
  generated_by text,
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- tokens (tiap kata pada tiap teks) ----------
create table if not exists tokens (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  position int not null,           -- urutan kata dalam teks
  surface_ar text not null,        -- bentuk tampil (berharakat)
  lemma_ar text,
  root_id uuid references roots (id) on delete set null,
  char_start int not null,
  char_end int not null
);

create index if not exists tokens_lesson_pos_idx on tokens (lesson_id, position);
create index if not exists tokens_root_idx on tokens (root_id);
create index if not exists units_volume_idx on units (volume_id);
create index if not exists lessons_unit_idx on lessons (unit_id);

-- ===================== RLS =====================
alter table profiles enable row level security;
alter table volumes enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;
alter table roots enable row level security;
alter table dictionary_entries enable row level security;
alter table tokens enable row level security;

-- profiles: hanya pemilik/staff yang boleh lihat dirinya
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles
  for select using (id = auth.uid());

-- Struktur (volumes/units) boleh dibaca publik
drop policy if exists "volumes public read" on volumes;
create policy "volumes public read" on volumes for select using (true);
drop policy if exists "units public read" on units;
create policy "units public read" on units for select using (true);
drop policy if exists "roots public read" on roots;
create policy "roots public read" on roots for select using (true);

-- Lessons: publik hanya yang published; staff semua
drop policy if exists "lessons public read" on lessons;
create policy "lessons public read" on lessons
  for select using (status = 'published' or is_staff());

-- Tokens: ikut status lesson induknya
drop policy if exists "tokens public read" on tokens;
create policy "tokens public read" on tokens
  for select using (
    is_staff() or exists (
      select 1 from lessons l
      where l.id = tokens.lesson_id and l.status = 'published'
    )
  );

-- Dictionary: publik hanya published; staff semua
drop policy if exists "dictionary public read" on dictionary_entries;
create policy "dictionary public read" on dictionary_entries
  for select using (status = 'published' or is_staff());

-- Tulis (insert/update/delete) untuk semua tabel konten: staff saja
do $$
declare t text;
begin
  foreach t in array array[
    'volumes','units','lessons','roots','dictionary_entries','tokens'
  ] loop
    execute format($f$drop policy if exists "%1$s staff write" on %1$s;$f$, t);
    execute format($f$
      create policy "%1$s staff write" on %1$s
        for all using (is_staff()) with check (is_staff());
    $f$, t);
  end loop;
end $$;

-- Trigger to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'editor');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to automatically normalize lemma_ar into lemma_norm on insert/update
create or replace function public.normalize_arabic(text_val text) returns text as $$
declare
  res text;
begin
  -- Strip diacritics
  res := regexp_replace(text_val, '[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]', '', 'g');
  res := regexp_replace(res, 'ـ', '', 'g');
  -- Normalize letters
  res := regexp_replace(res, '[آأإٱ]', 'ا', 'g');
  res := regexp_replace(res, 'ى', 'ي', 'g');
  res := regexp_replace(res, 'ة', 'ه', 'g');
  res := regexp_replace(res, '[ؤئ]', 'ء', 'g');
  return btrim(res);
end;
$$ language plpgsql immutable;

create or replace function public.set_lemma_norm() returns trigger as $$
begin
  -- Auto-generate lemma_norm from lemma_ar
  new.lemma_norm := public.normalize_arabic(new.lemma_ar);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_lemma_norm on dictionary_entries;
create trigger trg_set_lemma_norm
  before insert or update of lemma_ar on dictionary_entries
  for each row execute procedure public.set_lemma_norm();
