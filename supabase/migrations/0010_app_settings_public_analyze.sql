-- Pengaturan aplikasi (feature flags) + log rate-limit untuk analisis AI publik.

-- ---------- app_settings (key/value) ----------
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;

-- Setting bersifat publik untuk DIBACA (agar klien tahu flag fitur),
-- tetapi hanya staff yang boleh menulis.
drop policy if exists "settings public read" on app_settings;
create policy "settings public read" on app_settings for select using (true);
drop policy if exists "settings staff write" on app_settings;
create policy "settings staff write" on app_settings
  for all using (is_staff()) with check (is_staff());

-- Default TERTUTUP (analisis AI hanya untuk staff) — aman.
insert into app_settings (key, value)
  values ('public_analyze', 'false'::jsonb)
  on conflict (key) do nothing;

-- ---------- analyze_hits (rate-limit per IP utk mode publik) ----------
create table if not exists analyze_hits (
  id bigserial primary key,
  ip text not null,
  ts timestamptz not null default now()
);
create index if not exists analyze_hits_ip_ts on analyze_hits (ip, ts);
-- RLS aktif tanpa policy → hanya service-role (server) yang bisa akses.
alter table analyze_hits enable row level security;
