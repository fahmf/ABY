-- Soal pemahaman teks (أسئلة الفهم / استيعاب المقروء).
--
-- Berbeda dari kuis kosakata yang dibangun di klien dari entri kamus, soal ini
-- menguji pemahaman ISI teks. Digenerate oleh Gemini dari body_ar pelajaran lalu
-- disimpan (langsung published sesuai pilihan alur). Penulisan dilakukan lewat
-- service-role (mem-bypass RLS), jadi cukup kebijakan baca publik.

create table if not exists lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  type text not null check (type in ('mcq', 'truefalse')),
  prompt text not null,                 -- nash pertanyaan
  options jsonb not null default '[]'::jsonb,  -- pilihan (truefalse: ["صحيح","خطأ"])
  answer int not null,                  -- indeks jawaban benar dalam options
  explanation text,                     -- penjelasan singkat (opsional)
  sort_order int not null default 0,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index if not exists lesson_questions_lesson_idx
  on lesson_questions (lesson_id);

alter table lesson_questions enable row level security;

-- Publik membaca soal hanya bila pelajaran induk published; staff melihat semua.
drop policy if exists "lesson_questions public read" on lesson_questions;
create policy "lesson_questions public read" on lesson_questions
  for select using (
    is_staff() or exists (
      select 1 from lessons l
      where l.id = lesson_questions.lesson_id and l.status = 'published'
    )
  );
