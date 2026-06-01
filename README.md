# العربية بين يديك — Pembaca Interaktif (ABY)

Web app (desktop + mobile) untuk membaca teks kitab **Al-Arabiyah Baina Yadaik**
per jilid & bab. Klik kata → kamus Arab (akar, makna, sinonim, antonim, contoh) +
frekuensi kata se-akar di seluruh korpus dengan deep-link ke setiap kemunculan.

PRD/TRD lengkap & user journey: [`docs/PRD.md`](./docs/PRD.md).

## Stack

- **Next.js 16** (App Router, RTL Arab) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · **shadcn/ui** (gaya new-york) · **lucide-react**
- **Bun** (runtime & package manager)
- **Supabase** (Postgres + Auth + RLS)
- **Google Gemini Flash** (pipeline ingest: penandaan akar + draft kamus)

## Menjalankan

```bash
bun install
cp .env.example .env.local   # isi kredensial Supabase & Gemini
bun run dev                  # http://localhost:3000
bun test                     # tes otomatis (logika inti)
```

## Tes

`bun test` menjalankan tes (tanpa DB):
- Logika inti murni: utilitas Arab (`tests/arabic.test.ts`), helper pipeline
  ingest (`tests/ingest-text.test.ts`), lookup kamus seed
  (`tests/dictionary.test.ts`), pencarian (`tests/search-core.test.ts`),
  frekuensi se-akar (`tests/frequency-core.test.ts`).
- Komponen React via happy-dom: reader interaktif
  (`tests/reader-text.test.tsx`) — token clickable, toggle harakat, ukuran
  font, panel kamus, highlight deep-link `#t=`.

Setup DOM di `tests/setup.ts` (di-preload via `bunfig.toml`). 80 tes.

## Database

Skema + RLS ada di [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
Jalankan lewat Supabase SQL Editor atau Supabase CLI (`supabase db push`).

## Status

- [x] **Fase 0** — Fondasi: scaffold, tema clean RTL Arab, dark mode, struktur, skema DB, klien Supabase.
- [x] **Fase 1** — Navigasi Jilid→Bab→Teks + reader kata-clickable + panel kamus (data seed) + toggle harakat.
- [x] **Fase 2** — Auth admin (Supabase) + RLS + CRUD konten (jilid/unit/teks, draft/published). Repository membaca dari Supabase dengan fallback seed.
- [x] **Fase 3** — Pipeline ingest Gemini (tokenisasi → akar + lemma + draft kamus) + antrian verifikasi (draft→published) + reader tersambung ke kamus DB via `/api/dictionary`.
- [x] **Fase 4** — Frekuensi se-akar (`/api/frequency`) + daftar kemunculan per teks + deep-link highlight (`/baca/[lesson]#t=<id>`).
- [x] **Fase 5** — Pencarian teks (`/cari`), pengaturan baca (ukuran font + harakat, tersimpan di localStorage), PWA (manifest + service worker offline).
