# Panduan Input Kamus Manual (AI + SQL Editor)

Cara mengisi kamus (`roots` + `dictionary_entries`) tanpa pipeline Gemini —
pakai AI mana pun (ChatGPT/Claude/Gemini) untuk membuat data, lalu tempel SQL
ke **Supabase → SQL Editor**. Cocok saat kuota Gemini terbatas (tier gratis).

> Hanya `roots` + `dictionary_entries` yang diisi cara ini. Itu sudah cukup agar
> **klik-kata → makna** dan **pencarian** bekerja. Tabel `tokens` (statistik
> frekuensi akar + penanda kata di reader) opsional dan diisi lewat menu
> معالجة / «فهرسة سريعة» / skrip lokal.

## Prasyarat (sekali saja)

Migrasi berikut harus sudah diterapkan:

- `0004_dictionary_helpers.sql` → fungsi `normalize_ar`, `root_key_ar`,
  `to_str_array`, `to_examples`. Helper inilah yang menghitung `lemma_norm` agar
  **persis** sama dengan aturan pencocokan aplikasi.
- `0007_dictionary_morphology.sql` → kolom morfologi opsional `word_type`,
  `plural_ar`, `singular_ar`, `past_ar`, `present_ar`, `masdar_ar`.

---

## Langkah 1 — Prompt untuk AI

```
Kamu leksikograf Arab. Untuk setiap kata Arab yang saya beri, keluarkan SATU baris VALUES SQL
berisi 12 kolom TEKS POLOS berurutan:
lemma_ar, root_ar, meaning_ar, synonyms, antonyms, examples, word_type, plural, singular, past, present, masdar.
Aturan:
- lemma_ar  : lema/mujarrad (boleh berharakat)
- root_ar   : akar dipisah spasi, mis. 'ك ت ب' (pakai '' bila tak ada)
- meaning_ar: definisi ringkas berbahasa Arab (ini "penjelasan"/المعنى)
- synonyms  : sinonim dipisah koma, mis. دوّن، سطّر  (kosong '' bila tak ada)
- antonyms  : antonim dipisah koma
- examples  : MINIMAL DUA contoh berbahasa Arab, antar-contoh dipisah tanda |  (pipe)
- word_type : 'اسم' atau 'فعل' atau 'حرف'
- plural    : الجمع  — isi bila اسم punya bentuk jamak (selain itu '')
- singular  : المفرد — isi bila kata berupa jamak (selain itu '')
- past      : الماضي  — isi bila فعل (selain itu '')
- present   : المضارع — isi bila فعل (selain itu '')
- masdar    : المصدر  — isi bila فعل (selain itu '')
- Kolom yang tidak berlaku tulis '' (string kosong).
- JANGAN tulis kurung siku/kutip JSON. Cukup teks biasa.
- Setiap tanda petik tunggal ' di dalam teks WAJIB ditulis dua kali ''.
- Keluarkan HANYA baris-baris VALUES (tanpa kata INSERT, tanpa penjelasan), dipisah koma antar baris.

Contoh dua baris (fi'il lalu isim):
  ('كَتَبَ','ك ت ب','خَطَّ الحروفَ ودوّنها','دوّن، سطّر','محا','كتب الطالبُ الدرسَ.|سطّر الكاتبُ اسمَه.','فعل','','','كَتَبَ','يَكْتُبُ','كِتابة'),
  ('كِتاب','ك ت ب','ما يُكتَبُ فيه','مُؤلَّف','','قرأتُ كتابًا مفيدًا.|الكتابُ خيرُ جليس.','اسم','كُتُب','','','','')

Kata-kata:
كَتَبَ
عَلِمَ
... (20–40 kata per batch)
```

---

## Langkah 2 — Jalankan di SQL Editor

Tempel baris VALUES dari AI ke **dua** tempat bertanda yang sama. Perhatikan:
daftar kolom pada `v(...)` kini **12 kolom** di kedua query.

```sql
-- A) Akar (aman diulang)
insert into roots (root_ar, normalized)
select distinct v.root_ar, root_key_ar(v.root_ar)
from (values
  /* ===== TEMPEL VALUES DARI AI DI SINI ===== */
) v(lemma_ar, root_ar, meaning_ar, synonyms, antonyms, examples,
    word_type, plural, singular, past, present, masdar)
where coalesce(v.root_ar,'') <> ''
on conflict (normalized) do nothing;

-- B) Entri kamus — anti-duplikat berlapis, dan menampilkan apa yang BENAR ditambah
insert into dictionary_entries
  (lemma_ar, lemma_norm, root_id, meaning_ar, synonyms_ar, antonyms_ar, examples_ar,
   word_type, plural_ar, singular_ar, past_ar, present_ar, masdar_ar, status, generated_by)
select distinct on (normalize_ar(v.lemma_ar))
       v.lemma_ar, normalize_ar(v.lemma_ar), r.id, v.meaning_ar,
       to_str_array(v.synonyms), to_str_array(v.antonyms), to_examples(v.examples),
       nullif(trim(v.word_type),''), nullif(trim(v.plural),''), nullif(trim(v.singular),''),
       nullif(trim(v.past),''),      nullif(trim(v.present),''), nullif(trim(v.masdar),''),
       'published', 'manual'
from (values
  /* ===== TEMPEL VALUES DARI AI DI SINI (sama) ===== */
) v(lemma_ar, root_ar, meaning_ar, synonyms, antonyms, examples,
    word_type, plural, singular, past, present, masdar)
left join roots r on r.normalized = root_key_ar(v.root_ar)
where not exists (
  select 1 from dictionary_entries d where d.lemma_norm = normalize_ar(v.lemma_ar)
)
on conflict (lemma_ar) do nothing
returning lemma_ar;
```

Baris yang muncul di hasil = kata yang **baru** ditambahkan. Kata yang tidak
muncul berarti **duplikat** dan otomatis dilewati (lihat di bawah).

> Bidang `nullif(trim(...),'')` menyimpan **NULL** untuk kolom morfologi yang
> dikosongkan, jadi hanya yang terisi yang nanti tampil di panel «الصرف».

---

## Bagaimana duplikat dicegah

Tiga lapisan, jadi Anda **tak perlu khawatir lupa** sudah memasukkan suatu kata:

1. `distinct on (normalize_ar(...))` — membuang kata yang **kembar di dalam batch
   yang sama** (kalau AI tak sengaja mengulang).
2. `where not exists (... lemma_norm ...)` — **melewati kata yang sudah ada di
   database**, meskipun ditulis dengan harakat berbeda (mis. `كَتَبَ` vs `كتب`
   dianggap sama karena `lemma_norm`-nya sama).
3. `on conflict (lemma_ar) do nothing` — jaring pengaman terakhir untuk
   `lemma_ar` yang identik persis.

### (Opsional) Cek dulu sebelum input

Untuk melihat kata mana yang sudah ada **sebelum** menambah:

```sql
select v.lemma_ar,
       case when exists (
         select 1 from dictionary_entries d
         where d.lemma_norm = normalize_ar(v.lemma_ar)
       ) then 'SUDAH ADA' else 'baru' end as keterangan
from (values
  /* ===== TEMPEL VALUES DARI AI DI SINI ===== */
) v(lemma_ar, root_ar, meaning_ar, synonyms, antonyms, examples,
    word_type, plural, singular, past, present, masdar);
```

---

## Memperbarui entri yang sudah ada

`on conflict do nothing` **tidak** menimpa entri lama — jadi menambah morfologi
ke entri yang sudah ada tidak bisa lewat INSERT di atas. Dua cara:

- **Lewat UI:** «مراجعة المعجم» → buka entri → isi bagian «الصرف» (نوع الكلمة،
  الجمع/المفرد، الماضي/المضارع/المصدر) → simpan. Cara termudah untuk koreksi satuan.
- **Lewat SQL** (massal), contoh mengisi tashrif satu fi'il:

```sql
update dictionary_entries
set word_type = 'فعل', past_ar = 'وَعَظَ', present_ar = 'يَعِظُ', masdar_ar = 'وَعْظ'
where lemma_norm = normalize_ar('وعظ');
```

Setelah menambah/menerbitkan entri, klik **«تحديث مطابقة المعجم»** di /admin agar
kata yang baru masuk kamus langsung tertandai di teks yang sudah berisi token
(tanpa proses ulang berat).

---

## Catatan

- `status = 'published'` → langsung tampil di reader/pencarian. Ganti `'draft'`
  bila ingin lewat halaman «مراجعة المعجم» dulu.
- `generated_by = 'manual'` → penanda agar mudah memfilter entri buatan tangan.
- **JANGAN** memakai `::jsonb` pada kolom `synonyms/antonyms/examples`; selalu
  lewat `to_str_array()` / `to_examples()` (mencegah error JSON akibat newline/petik).
- Kolom morfologi (`word_type`, `plural_ar`, …) semuanya **opsional** — isi
  hanya yang berlaku; sisanya biarkan NULL/''.
- Lema majemuk (mis. `حدود الله`) tersimpan & bisa dicari, tapi tidak muncul saat
  klik satu kata di reader — itu sifat idiom multi-kata, bukan error.
