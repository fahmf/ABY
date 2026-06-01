# 📖 Panduan Tes untuk Pemula

Panduan ini mengajakmu menjalankan & menguji aplikasi **العربية بين يديك**
di komputermu sendiri, dari nol. Ikuti **berurutan**, jangan dilewati.

> Kenapa di komputer sendiri? Supabase diblokir di lingkungan cloud tempat
> kode ini dibuat, jadi pengujian penuh (login admin, simpan teks, AI) harus
> dijalankan di komputermu.

---

## Bagian 1 — Pasang alat yang dibutuhkan (sekali saja)

Kamu butuh 3 alat: **Git**, **Bun**, dan editor teks (mis. **VS Code**).

### 1.1 Pasang Git
- Buka https://git-scm.com/downloads → unduh untuk sistemmu (Windows/Mac) → install
  (klik Next/Install sampai selesai, biarkan pengaturan default).
- Cek berhasil: buka **Terminal** (Mac) atau **Git Bash** (Windows, ikut terpasang
  bersama Git), ketik:
  ```bash
  git --version
  ```
  Kalau muncul angka versi (mis. `git version 2.43`), berhasil.

### 1.2 Pasang Bun
Bun adalah alat untuk menjalankan aplikasi ini.
- **Mac / Linux** — di Terminal ketik:
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
  Lalu **tutup dan buka ulang** Terminal.
- **Windows** — di **PowerShell** ketik:
  ```powershell
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```
  Lalu tutup dan buka ulang PowerShell.
- Cek berhasil:
  ```bash
  bun --version
  ```
  Kalau muncul angka (mis. `1.3.11`), berhasil.

### 1.3 Pasang VS Code (editor)
- Unduh dari https://code.visualstudio.com → install. (Untuk mengedit file `.env`.)

---

## Bagian 2 — Ambil kode dari GitHub

1. Buat folder untuk proyek, mis. di Desktop. Di Terminal/Git Bash:
   ```bash
   cd Desktop
   ```
2. **Clone** (unduh) repositori. Ganti URL di bawah dengan URL repo GitHub-mu
   (tombol hijau **Code** → **HTTPS** → salin):
   ```bash
   git clone https://github.com/fahmf/aby.git
   ```
3. Masuk ke folder proyek:
   ```bash
   cd aby
   ```
4. **Pindah ke branch yang berisi semua fitur**:
   ```bash
   git checkout claude/bold-darwin-Dft0J
   ```
5. Pasang semua komponen aplikasi (sekali saja, agak lama ± 1–3 menit):
   ```bash
   bun install
   ```

---

## Bagian 3 — Tes CEPAT tanpa database (5 menit)

Ini cara tercepat melihat aplikasi berjalan, memakai **data contoh bawaan**
(Jilid 1). Belum ada login admin & AI, tapi kamu bisa baca teks, klik kata,
lihat kamus contoh, dan frekuensi akar.

1. Jalankan aplikasi:
   ```bash
   bun run dev
   ```
2. Buka browser ke **http://localhost:3000**
3. Yang bisa kamu coba:
   - Klik kartu **الكتاب الأول** → pilih unit → pilih teks.
   - Di halaman baca, **klik sebuah kata** → muncul panel kamus (akar, makna,
     sinonim, antonim, contoh).
   - Klik **عدد مرّات ورود الجذر** → daftar tempat kata se-akar muncul → klik
     salah satu → otomatis pindah & menyorot kata itu.
   - Tombol **+ / −** mengubah ukuran teks; **إخفاء التشكيل** menyembunyikan harakat.
   - Ikon 🔍 di atas → pencarian (tab "في النصوص" dan "حسب الجذر").
   - Ikon 🌙/☀️ → ganti mode gelap/terang.
4. Untuk **menghentikan**: kembali ke Terminal, tekan `Ctrl + C`.

> Kalau cuma ingin lihat tampilan & fitur dasar, **berhenti di sini sudah cukup**.
> Untuk login admin + AI, lanjut ke Bagian 4.

---

## Bagian 4 — Tes LENGKAP dengan Supabase + AI

Bagian ini mengaktifkan: **login admin, simpan teks ke database, dan AI
(Gemini) untuk membuat kamus + akar otomatis**.

### 4.1 Buat file `.env.local`
1. Di folder proyek ada file contoh bernama `.env.example`.
2. Buat salinannya bernama `.env.local`:
   - **Mac/Linux:** `cp .env.example .env.local`
   - **Windows (PowerShell):** `copy .env.example .env.local`
3. Buka `.env.local` di VS Code, isi dengan kredensialmu (URL, anon key,
   service role key dari Supabase, dan GEMINI_API_KEY). Simpan (Ctrl+S).

> ⚠️ File `.env.local` berisi rahasia. Ia **tidak** ikut ter-upload ke GitHub
> (sudah diatur otomatis). Jangan bagikan isinya.

### 4.2 Jalankan migrasi database (buat tabel)
1. Buka **Supabase Dashboard** (https://supabase.com) → pilih proyekmu.
2. Menu kiri → **SQL Editor** → **New query**.
3. Buka file `supabase/migrations/0001_init.sql` di VS Code → **salin semua
   isinya** → tempel ke SQL Editor → klik **Run**.
   - Migrasi ini aman dijalankan berulang (kalau error, jalankan ulang saja).
4. Ulangi untuk file `supabase/migrations/0002_dictionary_lemma_norm.sql`
   (salin semua → tempel → Run).

### 4.3 Isi data contoh (Jilid 1) ke database
Di Terminal (dari dalam folder proyek):
```bash
bun run seed
```
Kalau berhasil, muncul `🌱 Seed selesai.`

### 4.4 Buat akun admin
1. Di Supabase → menu **Authentication** → **Users** → **Add user** →
   isi **email** & **password** → **Create user**.
2. Klik user yang baru dibuat → **salin** nilai **User UID** (kode panjang).
3. Kembali ke **SQL Editor** → **New query** → tempel perintah ini
   (ganti `UID_DISINI` dan `email@anda.com` dengan punyamu) → **Run**:
   ```sql
   insert into profiles (id, email, role)
   values ('UID_DISINI', 'email@anda.com', 'admin');
   ```

### 4.5 Jalankan & uji
1. Jalankan aplikasi:
   ```bash
   bun run dev
   ```
2. Buka **http://localhost:3000/admin/login** → masuk dengan email & password tadi.
3. Di dashboard admin, kamu bisa:
   - **Tambah jilid / unit / teks** (atau pakai yang sudah di-seed).
   - Klik tombol **معالجة** (ikon ✨) pada sebuah teks → AI Gemini akan membaca
     teks, menentukan **akar tiap kata**, dan membuat **draft kamus**. Tunggu
     beberapa detik.
   - Buka **مراجعة المعجم** → periksa entri draft → edit bila perlu → ubah
     status ke **منشور (مُراجَع)** → **حفظ**.
4. Kembali ke halaman baca teks itu (`http://localhost:3000`) → klik kata →
   sekarang kamus berasal dari **database hasil AImu**, lengkap dengan frekuensi
   akar & loncat antar-teks.

---

## Bagian 5 — Menjalankan tes otomatis (opsional)

Untuk memastikan logika inti tidak rusak:
```bash
bun test
```
Harusnya muncul sesuatu seperti `76 pass  0 fail`.

---

## ❓ Kalau ada masalah

| Gejala | Solusi |
|--------|--------|
| `bun: command not found` | Bun belum terpasang / Terminal belum dibuka ulang. Ulangi Bagian 1.2. |
| Halaman tak terbuka | Pastikan `bun run dev` masih berjalan, lalu buka `http://localhost:3000`. |
| Migrasi error "already exists" | Aman — jalankan ulang seluruh isi file SQL. |
| `bun run seed` gagal | Cek `.env.local` sudah benar (URL & service role key), dan migrasi 4.2 sudah dijalankan. |
| Tombol معالجة tak jalan / nonaktif | `GEMINI_API_KEY` di `.env.local` kosong/salah. |
| Login admin gagal | Pastikan langkah 4.4 (insert ke `profiles`) sudah dijalankan dengan UID benar. |

> ⚠️ **Keamanan:** karena kredensial sempat dibagikan, sebaiknya **reset/rotasi**
> Service role key (Supabase → Settings → API) dan Gemini key (Google AI Studio)
> setelah selesai menguji.
