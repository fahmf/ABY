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
```

## Database

Skema + RLS ada di [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
Jalankan lewat Supabase SQL Editor atau Supabase CLI (`supabase db push`).

## Status

- [x] **Fase 0** — Fondasi: scaffold, tema clean RTL Arab, dark mode, struktur, skema DB, klien Supabase.
- [ ] Fase 1 — Navigasi Jilid→Bab→Teks + reader kata-clickable.
- [ ] Fase 2 — Auth admin + CRUD konten (draft/published).
- [ ] Fase 3 — Pipeline ingest Gemini (akar + draft kamus) + antrian verifikasi.
- [ ] Fase 4 — Frekuensi se-akar + deep-link highlight.
- [ ] Fase 5 — Pencarian, pengaturan baca, PWA (opsional).
