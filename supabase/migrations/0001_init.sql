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
create policy "profiles self read" on profiles
  for select using (id = auth.uid());

-- Struktur (volumes/units) boleh dibaca publik
create policy "volumes public read" on volumes for select using (true);
create policy "units public read" on units for select using (true);
create policy "roots public read" on roots for select using (true);

-- Lessons: publik hanya yang published; staff semua
create policy "lessons public read" on lessons
  for select using (status = 'published' or is_staff());

-- Tokens: ikut status lesson induknya
create policy "tokens public read" on tokens
  for select using (
    is_staff() or exists (
      select 1 from lessons l
      where l.id = tokens.lesson_id and l.status = 'published'
    )
  );

-- Dictionary: publik hanya published; staff semua
create policy "dictionary public read" on dictionary_entries
  for select using (status = 'published' or is_staff());

-- Tulis (insert/update/delete) untuk semua tabel konten: staff saja
do $$
declare t text;
begin
  foreach t in array array[
    'volumes','units','lessons','roots','dictionary_entries','tokens'
  ] loop
    execute format($f$
      create policy "%1$s staff write" on %1$s
        for all using (is_staff()) with check (is_staff());
    $f$, t);
  end loop;
end $$;
