# 🚀 Panduan Deploy ke Vercel (untuk Pemula)

Vercel adalah layanan gratis untuk menjalankan aplikasi Next.js di internet,
sehingga bisa diakses siapa saja lewat sebuah link. Ikuti **berurutan**.

> Prasyarat: kode sudah ada di **GitHub**, dan kamu sudah punya proyek
> **Supabase** + **API key Gemini** (lihat `PANDUAN_TES.md` Bagian 4).

---

## Bagian 1 — Siapkan database (lakukan sekali)

Aplikasi yang sudah online tetap butuh database. Kalau **belum** menjalankan
migrasi & seed di Supabase, lakukan dulu:

1. Supabase Dashboard → **SQL Editor** → jalankan isi
   `supabase/migrations/0001_init.sql` lalu `supabase/migrations/0002_dictionary_lemma_norm.sql`.
2. (Opsional) isi data contoh dengan `bun run seed` dari komputermu.
3. Buat akun admin (Supabase → Authentication → Add user, lalu `insert into profiles ...`).

Detail lengkap ada di `PANDUAN_TES.md` Bagian 4.2–4.4.

---

## Bagian 2 — Daftar Vercel & hubungkan GitHub

1. Buka https://vercel.com → **Sign Up** → pilih **Continue with GitHub**
   (pakai akun GitHub yang sama dengan tempat kodemu).
2. Izinkan Vercel mengakses GitHub-mu saat diminta.

---

## Bagian 3 — Impor proyek

1. Di dashboard Vercel → tombol **Add New…** → **Project**.
2. Cari repositori kodemu (mis. `aby`) → klik **Import**.
3. Di halaman konfigurasi:
   - **Framework Preset**: otomatis terdeteksi **Next.js** (biarkan).
   - **Branch**: pilih branch yang ingin di-deploy. Untuk versi fitur lengkap,
     ketik/pilih `claude/bold-darwin-Dft0J`. (Atau merge dulu ke `main` —
     lihat Bagian 6.)
   - **Build & Output Settings**: biarkan default (Next.js sudah dikenali).
   - **JANGAN klik Deploy dulu** — isi Environment Variables di Bagian 4.

---

## Bagian 4 — Isi Environment Variables (PENTING)

Di halaman impor yang sama, buka bagian **Environment Variables**. Tambahkan
satu per satu (kolom **Key** dan **Value**):

| Key | Value (diisi dengan punyamu) |
|-----|------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase (mis. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key dari Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key dari Supabase → Settings → API |
| `GEMINI_API_KEY` | API key Google Gemini |
| `GEMINI_MODEL` | `gemini-3.5-flash` |
| `NEXT_PUBLIC_SITE_URL` | sementara kosongkan/ isi `https://contoh.vercel.app` (perbaiki di Bagian 5) |

> Cara mengisi: ketik Key → ketik Value → **Add**. Ulangi untuk semua baris.
> Biarkan opsi environment tercentang semua (Production/Preview/Development).

Setelah semua terisi → klik **Deploy**. Tunggu ± 1–3 menit sampai muncul
ucapan selamat & tampilan pratinjau situs.

---

## Bagian 5 — Perbaiki alamat situs (URL)

Setelah deploy, Vercel memberi alamat seperti `https://aby-xxxx.vercel.app`.

1. Salin alamat itu.
2. Vercel → proyekmu → **Settings** → **Environment Variables** →
   edit `NEXT_PUBLIC_SITE_URL` → isi dengan alamat tadi → **Save**.
3. Agar perubahan berlaku, lakukan **redeploy**: tab **Deployments** →
   titik tiga (⋯) pada deploy teratas → **Redeploy**.

(Ini hanya memengaruhi sitemap & metadata berbagi; aplikasi tetap jalan tanpanya.)

---

## Bagian 6 — (Disarankan) deploy dari branch `main`

Secara default Vercel otomatis men-deploy ulang setiap ada perubahan di
**branch produksi** (biasanya `main`). Agar lebih rapi, gabungkan branch fitur
ke `main`:

1. Buat **Pull Request** di GitHub dari `claude/bold-darwin-Dft0J` → `main`,
   lalu **Merge**.
2. Vercel → Settings → **Git** → pastikan **Production Branch** = `main`.

Setelah ini, setiap kamu push ke `main`, situs ter-update otomatis.

---

## Bagian 7 — Coba situsmu

Buka alamat Vercel-mu:
- Halaman utama → jilid → teks → klik kata → kamus.
- `/<alamat>/admin/login` → masuk dengan admin yang kamu buat → tambah/edit teks
  → tombol **معالجة** (AI Gemini) → verifikasi di **مراجعة المعجم** → publish.

---

## ❓ Masalah umum

| Gejala | Solusi |
|--------|--------|
| Build gagal di Vercel | Buka log build di Vercel; biasanya ada env yang salah/ kurang. Cek Bagian 4. |
| Situs tampil tapi data kosong | Migrasi/seed Supabase belum dijalankan (Bagian 1), atau env Supabase salah. |
| Tombol معالجة error/lama | `GEMINI_API_KEY` salah, atau teks sangat panjang. Di Vercel Hobby batas 60 detik. |
| Login admin gagal | Akun admin belum dibuat di Supabase (insert ke `profiles`). |
| `host_not_allowed` | Itu hanya terjadi di lingkungan cloud pembuat kode, **bukan** di Vercel. |

> ⚠️ **Keamanan:** Service role key & Gemini key bersifat rahasia. Di Vercel
> mereka aman sebagai Environment Variables (tidak terlihat publik). Tetap
> disarankan **rotasi** key yang pernah dibagikan di chat.
