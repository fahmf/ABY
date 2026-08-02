/**
 * Ekspor isi database ke berkas JSON sebagai jaring pengaman.
 * Jalankan: bun run backup   (butuh NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *
 * Memakai service role agar ikut mencadangkan baris berstatus `draft` yang
 * tersembunyi dari publik oleh RLS. Hasil ditulis ke folder `backup/`
 * (satu berkas per tabel + `manifest.json` berisi jumlah baris).
 *
 * PostgREST membatasi jumlah baris per respons, jadi setiap tabel diambil
 * bertahap (paging) sampai habis — penting untuk `tokens` yang ribuan baris.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset."
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Tabel yang dicadangkan, diurut dari induk ke anak (memudahkan restore),
 * beserta kolom kunci untuk pengurutan. Paging WAJIB memakai urutan yang
 * stabil; tanpa ORDER BY, Postgres tak menjamin urutan antar-permintaan
 * sehingga baris bisa terduplikasi atau terlewat.
 *
 * Sengaja hanya mencadangkan KONTEN (yang tak tergantikan) + pengaturan.
 * `profiles` dilewati karena terikat ke auth.users (tak bisa dipulihkan dari
 * JSON) dan memuat email; `usage_events`/`analyze_hits` hanya telemetri.
 */
const TABLES: { name: string; orderBy: string }[] = [
  { name: "volumes", orderBy: "id" },
  { name: "units", orderBy: "id" },
  { name: "lessons", orderBy: "id" },
  { name: "roots", orderBy: "id" },
  { name: "dictionary_entries", orderBy: "id" },
  { name: "tokens", orderBy: "id" },
  { name: "lesson_questions", orderBy: "id" },
  { name: "app_settings", orderBy: "key" },
];

const PAGE = 1000;
const OUT_DIR = "backup";

/**
 * Ambil seluruh baris satu tabel dengan paging sampai habis.
 *
 * Berhenti hanya ketika satu halaman benar-benar kosong, dan maju sebanyak
 * baris yang benar-benar diterima — bukan sebesar PAGE. Ini penting karena
 * PostgREST memotong respons pada batas "Max rows" milik project; bila batas
 * itu lebih kecil dari PAGE, asumsi "halaman tak penuh = halaman terakhir"
 * akan memutus pencadangan lebih awal dan diam-diam menghasilkan data parsial.
 */
async function fetchAll(table: string, orderBy: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order(orderBy)
      .range(rows.length, rows.length + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data ?? [];
    if (batch.length === 0) break;
    rows.push(...batch);
  }
  return rows;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const counts: Record<string, number> = {};
  let failed = 0;

  for (const { name, orderBy } of TABLES) {
    try {
      const rows = await fetchAll(name, orderBy);
      await writeFile(
        `${OUT_DIR}/${name}.json`,
        JSON.stringify(rows, null, 2),
        "utf8"
      );
      counts[name] = rows.length;
      console.log(`✓ ${name}: ${rows.length} baris`);
    } catch (err) {
      // Jangan gagalkan seluruh cadangan hanya karena satu tabel (mis. tabel
      // belum ada di lingkungan tertentu) — catat lalu lanjutkan.
      failed++;
      counts[name] = -1;
      console.error(`✗ ${name}:`, (err as Error).message);
    }
  }

  await writeFile(
    `${OUT_DIR}/manifest.json`,
    JSON.stringify(
      { takenAt: new Date().toISOString(), counts },
      null,
      2
    ),
    "utf8"
  );

  const total = Object.values(counts)
    .filter((n) => n >= 0)
    .reduce((a, b) => a + b, 0);
  console.log(`\nSelesai: ${total} baris tersimpan di ${OUT_DIR}/`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("❌ Pencadangan gagal:", err);
  process.exit(1);
});
