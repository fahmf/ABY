-- ABY — سجلّ نشاط المشرفين (audit) + أحداث الاستخدام (تحليلات)
-- يُكمّل لوحة الإدارة: من فعل ماذا، وما الكلمات/النصوص الأكثر تفاعلًا.

-- ---------- activity_log (audit المشرفين) ----------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  actor_email text,
  action text not null,          -- mis. 'publish' | 'delete' | 'import' | 'update'
  entity text not null,          -- mis. 'lesson' | 'unit' | 'volume' | 'dictionary'
  detail text,                   -- وصف حرّ (عنوان/عدد)
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx
  on activity_log (created_at desc);

alter table activity_log enable row level security;

-- المشرفون فقط يقرؤون السجلّ ويكتبون فيه.
drop policy if exists "activity_log staff read" on activity_log;
create policy "activity_log staff read" on activity_log
  for select using (is_staff());

drop policy if exists "activity_log staff insert" on activity_log;
create policy "activity_log staff insert" on activity_log
  for insert with check (is_staff());

-- ---------- usage_events (تحليلات الاستخدام) ----------
-- تُكتب من الخادم عبر service-role (يتجاوز RLS)، ويقرؤها المشرفون فقط.
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,            -- 'word' | 'lesson' | 'quiz_wrong'
  ekey text not null,            -- lemma أو slug النصّ
  created_at timestamptz not null default now()
);

create index if not exists usage_events_kind_key_idx
  on usage_events (kind, ekey);
create index if not exists usage_events_created_idx
  on usage_events (created_at desc);

alter table usage_events enable row level security;

-- لا سياسة إدراج للعموم/المصادَقين → الإدراج عبر service-role فقط.
drop policy if exists "usage_events staff read" on usage_events;
create policy "usage_events staff read" on usage_events
  for select using (is_staff());
