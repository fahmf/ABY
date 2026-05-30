# PRD / TRD — Pembaca Interaktif "Al-Arabiyah Baina Yadaik" (ABY)

## 1. Konteks & Latar Belakang

Pengguna ingin membangun web app (desktop + mobile) untuk membaca teks dari kitab
**Al-Arabiyah Baina Yadaik (العربية بين يديك)** per **jilid** dan per **bab/unit**.
Saat sebuah teks dibuka, pembaca dapat **mengetuk/klik sebuah kata** lalu muncul
**kamus berbahasa Arab** yang menjelaskan: akar kata (جذر), makna (معنى), sinonim
(مرادف), antonim (ضدّ), dan contoh penggunaan (مثال). Pembaca juga bisa melihat
**berapa kali kata se-akar muncul** di seluruh teks ABY, dan setiap kemunculan
**bisa diklik untuk melompat** ke teks yang memuatnya.

Repo `/home/user/ABY` masih **kosong / greenfield** (belum ada commit). Branch kerja:
`claude/bold-darwin-Dft0J`.

**Stack yang ditetapkan**: Next.js (App Router) · shadcn/ui · lucide-react · Bun ·
Supabase (Postgres + Auth + Storage). AI: **Google Gemini Flash** (Google Gen AI SDK)
untuk generasi entri kamus + penandaan akar kata.

### Keputusan terkonfirmasi (hasil tanya-jawab)
1. **Sumber teks**: pengguna punya sebagian teks digital → perlu **panel admin** untuk input bertahap.
2. **Kamus**: **AI generate + verifikasi manual** (status draft → published).
3. **Akar kata & frekuensi**: **AI menandai akar tiap kata saat ingest**, disimpan ke DB sebagai indeks.
4. **Akses**: **publik baca bebas tanpa login**; auth hanya untuk **admin/editor**.

### Asumsi default (bisa diubah)
- **Bahasa UI**: **Bahasa Arab penuh** (semua label/menu/tombol Arab); konten & isi kamus juga Arab.
- **Arah teks**: **RTL menyeluruh** — `dir="rtl"` pada root layout, seluruh komponen shadcn & ikon lucide dicerminkan (mirroring) untuk RTL.
- **Hosting**: Vercel (Next.js) + Supabase (managed). PWA/offline = fase lanjutan (opsional).
- **Aspek legal**: tanggung jawab kepemilikan/izin konten ABY ada di pihak pengguna; app menyimpan teks yang ia sediakan sendiri.

---

## 2. Tujuan & Non-Tujuan

**Tujuan**
- Navigasi konten: Jilid → Bab/Unit → Pelajaran/Teks.
- Pembacaan teks Arab yang rapi (tipografi RTL, ukuran nyaman di mobile & desktop).
- Klik kata → popup kamus Arab (akar, makna, sinonim, antonim, contoh).
- Frekuensi se-akar di seluruh korpus + navigasi balik ke setiap kemunculan.
- Panel admin untuk CRUD konten + pipeline AI (ingest) + antrian verifikasi kamus.
- Gaya **clean**: minimal, banyak ruang putih, tipografi sebagai fokus.

**Non-Tujuan (fase awal)**
- Fitur sosial, anotasi kolaboratif, kuis/latihan interaktif.
- Audio/TTS, transliterasi otomatis (bisa fase lanjutan).
- Akun pengguna umum & sinkronisasi lintas perangkat (ditunda; akses publik bebas).

---

## 3. Persona

- **Pelajar/Pembaca (publik, tanpa login)** — membaca, menelusuri kata, melihat frekuensi.
- **Editor (login)** — input/edit teks, jalankan ingest AI, verifikasi & publish entri kamus.
- **Admin (login)** — kelola editor, jilid/bab, konfigurasi, audit.

---

## 4. User Journey

### A. Pembaca menelusuri & membaca
1. Buka beranda → daftar **Jilid 1–4** (kartu clean).
2. Pilih jilid → daftar **Bab/Unit** beserta progres/jumlah teks.
3. Pilih bab → daftar **Teks/Pelajaran**.
4. Buka teks → tampil teks Arab RTL, setiap kata adalah elemen yang bisa diketuk.

### B. Pembaca mencari arti kata
1. Ketuk sebuah kata → muncul **panel kamus** (Sheet di mobile dari bawah; Popover/Side panel di desktop).
2. Panel menampilkan: kata + harakat (jika ada), **akar (جذر)**, **makna**, **sinonim**, **antonim**, **contoh**.
3. Jika entri belum diverifikasi, tampil badge "قيد المراجعة" (sedang ditinjau) / fallback minimal.

### C. Pembaca eksplorasi frekuensi se-akar
1. Di panel kamus, tombol **"كل المشتقات / Lihat kemunculan akar"** menampilkan total hitungan.
2. Daftar kemunculan dikelompokkan per Jilid → Bab → Teks, dengan cuplikan kalimat.
3. Klik salah satu kemunculan → buka teks tersebut dan **scroll + highlight** kata pada posisinya (via anchor `#t=<tokenId>`).

### D. Editor mengelola konten (login)
1. Login (Supabase Auth) → dashboard admin.
2. Tambah/edit Jilid → Bab → Teks (editor teks Arab).
3. Klik **"Proses / Ingest"** pada teks → pipeline AI: tokenisasi → tentukan **lemma + akar** tiap kata → buat **draft entri kamus** untuk kata/akar baru.
4. Buka **antrian verifikasi** → tinjau entri draft (edit makna/sinonim/antonim/contoh) → **Publish**.
5. Teks tampil ke publik setelah berstatus `published`.

---

## 5. PRD — Fitur Fungsional

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| F1 | Navigasi konten | Jilid → Bab → Teks, breadcrumb, responsif | Must |
| F2 | Reader teks Arab | Render RTL, kata clickable, ukuran font adjustable | Must |
| F3 | Popup kamus | Akar, makna, sinonim, antonim, contoh (Arab) | Must |
| F4 | Frekuensi se-akar | Hitung + daftar kemunculan + deep-link highlight | Must |
| F5 | Admin auth | Login editor/admin (Supabase Auth + RLS) | Must |
| F6 | Admin CRUD konten | Kelola jilid/bab/teks, status draft/published | Must |
| F7 | Pipeline ingest AI | Tokenisasi + penandaan akar + draft kamus (Claude) | Must |
| F8 | Antrian verifikasi kamus | Tinjau/edit/publish entri | Must |
| F9 | Pencarian | Cari teks/kata/akar di korpus | Should |
| F10 | Pengaturan baca | Ukuran font, tampil/sembunyikan harakat | Should |
| F11 | PWA/offline | Install + cache baca offline | Could (fase lanjut) |

**Kriteria gaya "clean"**: palet netral + 1 aksen, banyak whitespace, tipografi Arab
berkualitas (mis. *Amiri*/*Noto Naskh Arabic*) untuk konten & font sans untuk UI,
komponen shadcn default (Card, Sheet, Popover, Dialog, Tabs, Badge, Skeleton),
ikon lucide, mode terang/gelap.

---

## 6. TRD — Arsitektur Teknis

### 6.1 Gambaran
- **Frontend + Backend**: Next.js (App Router). Server Components untuk baca data,
  Route Handlers / Server Actions untuk mutasi. Bun sebagai runtime & package manager.
- **Data**: Supabase Postgres. Akses publik via Server Components (anon key, RLS read-only
  untuk konten `published`). Mutasi admin via service role di server, dilindungi auth.
- **AI**: Google **Gemini Flash** (Google Gen AI SDK) dipanggil **hanya di server** (saat ingest),
  bukan dari client. Output JSON terstruktur via `responseSchema` / `responseMimeType: application/json`
  → disimpan sebagai draft.
- **Pencarian**: Postgres full-text + index pada kolom akar; opsi `pg_trgm` untuk fuzzy Arab.

### 6.2 Model Data (Supabase Postgres)

```
volumes (jilid)
  id, number (1..4), title_ar, slug, order, created_at

units (bab/unit)
  id, volume_id FK, number, title_ar, slug, order

lessons (teks/pelajaran)
  id, unit_id FK, title_ar, slug, body_ar (teks mentah),
  status ENUM('draft','published'), order, created_at, ingested_at

roots (akar kata — kanonik)
  id, root_ar (mis. "ك ت ب"), normalized (tanpa spasi/harakat) UNIQUE

tokens (tiap kata pada tiap pelajaran — sumber frekuensi & deep-link)
  id, lesson_id FK, position (urutan dalam teks),
  surface_ar (bentuk tampil), lemma_ar, root_id FK NULL,
  char_start, char_end   -- untuk highlight presisi
  INDEX (root_id), INDEX (lesson_id, position)

dictionary_entries (kamus, level lemma)
  id, lemma_ar UNIQUE, root_id FK,
  meaning_ar, synonyms_ar (jsonb/text[]), antonyms_ar (jsonb/text[]),
  examples_ar (jsonb: [{text, source_lesson_id?}]),
  status ENUM('draft','published'),
  generated_by (model), reviewed_by FK profiles, reviewed_at

profiles (admin/editor)
  id (= auth.users.id), email, role ENUM('admin','editor')
```

**Catatan desain kunci**
- **Frekuensi se-akar** = `SELECT count(*) FROM tokens WHERE root_id = ?` (dibatasi lesson `published`).
- **Daftar kemunculan** = join `tokens → lessons → units → volumes`, urut per jilid/bab; cuplikan kalimat diambil dari `body_ar` memakai `char_start/char_end`.
- **Deep-link highlight**: URL `/baca/<lesson-slug>#t=<tokenId>` → reader scroll & highlight token tsesuai `char_start/char_end`.
- **Kamus terikat ke lemma**, dan lemma terikat ke root → satu klik kata memetakan `token → lemma → dictionary_entry` dan `token → root → daftar frekuensi`.

### 6.3 Tokenisasi & Rendering kata clickable
- Saat ingest, `body_ar` ditokenisasi (pisah kata, simpan `char_start/char_end`). Token
  disimpan ke tabel `tokens`. Reader merender `body_ar` dengan membungkus tiap rentang
  token sebagai `<span data-token-id>` sehingga klik diketahui presisi (termasuk highlight).
- Normalisasi Arab (hapus harakat/tatweel, samakan أ/إ/آ→ا, ة↔ه bila perlu) untuk
  pencocokan lemma/akar; **bentuk tampil tetap berharakat**.

### 6.4 Pipeline Ingest AI (server-only)
Saat editor menekan "Proses" pada sebuah lesson:
1. Tokenisasi teks → kandidat kata unik.
2. Untuk kata yang **lemma-nya belum ada** di `dictionary_entries`/`roots`:
   panggil **Gemini Flash** dengan **`responseSchema`** untuk mengembalikan
   `{lemma, root, meaning, synonyms[], antonyms[], examples[]}` (semua Arab).
   Gunakan **batching (banyak kata per panggilan) + context caching** untuk hemat biaya & kuota.
3. Simpan `roots` (upsert), `dictionary_entries` (status `draft`), dan isi `root_id`/`lemma`
   pada tiap `tokens`.
4. Lesson tetap `draft` sampai editor verifikasi kamus terkait lalu `publish`.
Idempoten: ingest ulang tidak menggandakan token (hapus token lama lesson lalu re-insert).

### 6.5 Endpoint / Server Actions (utama)
- Publik (read): daftar volumes/units/lessons; get lesson + tokens; get dictionary by lemma;
  get root frequency + occurrences.
- Admin (write, terproteksi): CRUD volumes/units/lessons; `POST ingest(lessonId)`;
  list draft entries; `PATCH dictionary_entry`; `POST publish(entryId|lessonId)`.

### 6.6 Keamanan
- **RLS Supabase**: publik (anon) hanya `SELECT` baris `status='published'`. Tulis &
  baca draft hanya untuk `profiles.role in ('admin','editor')`.
- **Gemini API key** & **service role key** hanya di server (env vars), tak pernah ke client.
- Validasi input admin (zod). Rate limit endpoint ingest.

---

## 7. Halaman & Komponen (Next.js + shadcn)

**Publik**
- `/` beranda — grid Jilid (Card).
- `/jilid/[slug]` — daftar Bab (Card/List).
- `/jilid/[slug]/[unit]` — daftar Teks.
- `/baca/[lesson]` — Reader: konten RTL + kata clickable + panel kamus (Sheet/Popover) + dialog frekuensi.
- `/cari` — pencarian (Should).

**Admin** (`/admin/*`, terproteksi)
- Dashboard, CRUD Jilid/Bab/Teks (editor teks), tombol Ingest, Antrian verifikasi kamus (Table + form edit), kelola pengguna.

**Komponen kunci**: `ReaderText`, `WordToken`, `DictionaryPanel`, `RootFrequencyDialog`,
`OccurrenceList`, `VolumeCard`, `AdminLessonForm`, `IngestButton`, `DictionaryReviewTable`.

---

## 8. Rencana Implementasi (fase)

**Fase 0 — Fondasi**
- Init Next.js (App Router) + Bun, Tailwind, shadcn/ui, lucide. Setup `dir="rtl"` + locale Arab, font Arab & dark mode.
- Setup Supabase project, env, migrasi skema (§6.2), RLS dasar. Layout responsif & tema clean.

**Fase 1 — Konten & Reader (read-only, data seed manual)**
- Halaman navigasi Jilid→Bab→Teks. Reader RTL dengan kata clickable (dari tabel `tokens`).
- Panel kamus membaca `dictionary_entries` (boleh data dummy/seed dulu).

**Fase 2 — Admin & Auth**
- Supabase Auth + role + RLS. CRUD konten. Status draft/published.

**Fase 3 — Pipeline AI**
- Server action ingest (Gemini Flash `responseSchema`, caching/batching). Isi `tokens`, `roots`, draft `dictionary_entries`.
- Antrian verifikasi + publish.

**Fase 4 — Frekuensi se-akar**
- Hitung & daftar kemunculan per akar + deep-link highlight `#t=<id>`.

**Fase 5 — Penyempurnaan**
- Pencarian, pengaturan baca (font/harakat), aksesibilitas, performa, (opsional) PWA.

---

## 9. Risiko & Mitigasi
- **Akurasi akar/lemma Arab oleh AI** → verifikasi manual wajib (sudah jadi keputusan); simpan model/asal generasi untuk audit; izinkan koreksi root yang merge token lama.
- **Biaya/kuota AI (Gemini)** → batch + context caching + hanya proses kata/lemma baru; cache hasil per lemma; tangani rate limit (retry/backoff).
- **Tipografi & RTL penuh** → `dir="rtl"` global, pastikan komponen shadcn & ikon lucide ter-mirror dengan benar; pakai font naskh berkualitas; uji di iOS/Android/desktop.
- **Highlight presisi** → simpan `char_start/char_end`, bukan sekadar index kata.
- **Legal/hak cipta konten ABY** → di luar lingkup teknis; pastikan pengguna punya hak atas teks yang diinput.

## 10. Verifikasi (uji end-to-end)
- Jalankan `bun dev`; buka beranda → telusuri Jilid→Bab→Teks tampil benar di mobile & desktop (uji viewport).
- Buka teks → klik beberapa kata → panel kamus tampil dengan akar/makna/sinonim/antonim/contoh.
- Dari panel → buka frekuensi se-akar → angka cocok dengan `count(tokens)` → klik kemunculan → reader scroll + highlight token yang tepat.
- Admin: buat teks → Ingest → token+root+draft kamus terbuat → verifikasi → publish → tampil ke publik.
- Cek RLS: anon tak bisa baca/ubah draft; editor bisa.

## 11. Pertanyaan terbuka (untuk dikonfirmasi sebelum/di awal eksekusi)
1. **Model Gemini persis**: ID model (mis. `gemini-2.5-flash` / seri Gemini 3 Flash terbaru) & apakah API key sudah tersedia + batas anggaran/kuota ingest?
2. **Harakat**: teks sumber sudah berharakat penuh? Perlu toggle tampil/sembunyikan?
3. **Definisi "bab"**: pakai istilah Unit (وحدة) ABY, atau pembagian lain (درس)?
4. **Cakupan**: 4 jilid utama saja, atau termasuk buku lain (mis. seri pemula)?
5. **PWA/offline** termasuk MVP atau fase lanjutan?
