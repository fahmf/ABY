/**
 * Ingest LOKAL — generate kamus (roots + dictionary_entries, opsional tokens)
 * memakai mesin yang sama dengan aplikasi (generateEntries: retry + fallback),
 * tetapi berjalan di komputermu: tanpa batas waktu Vercel, dengan jeda santai
 * antar-batch, dan dapat dilanjutkan (idempoten).
 *
 * Prasyarat .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *   (opsional) GEMINI_MODEL, GEMINI_FALLBACK_MODEL
 *
 * Jalankan:
 *   bun run --env-file=.env.local scripts/ingest-local.ts            # semua lesson → tulis DB
 *   bun run --env-file=.env.local scripts/ingest-local.ts --lesson luqman
 *   bun run --env-file=.env.local scripts/ingest-local.ts --sql out.sql   # cetak SQL, tak menulis DB
 *   bun run --env-file=.env.local scripts/ingest-local.ts --tokens        # ikut isi tabel tokens
 *
 * Hemat-RPM (tier gratis): hitung jeda aman otomatis & bergiliran antar model.
 *   bun run --env-file=.env.local scripts/ingest-local.ts --rpm 5 --batch 100
 *   (set GEMINI_FALLBACK_MODEL=gemini-2.5-flash agar throughput dobel)
 *
 * Opsi: --lesson <slug|id>  --status draft|published  --batch <n>  --tokens
 *       --rpm <n>   jeda otomatis = 60000/(n × jumlah_model) (utamakan ini)
 *       --delay <ms>  jeda manual antar request (dipakai bila --rpm kosong)
 *       --sql [file]  cetak SQL alih-alih menulis DB
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { normalize, tokenize } from "../src/lib/arabic";
import { generateEntries, geminiModels } from "../src/lib/ingest/gemini-core";
import { chunk, rootKey, uniqueWords } from "../src/lib/ingest/text";

// ---------- argumen CLI ----------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, def?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
};

const LESSON = opt("lesson"); // slug atau id; kosong = semua
const STATUS = (opt("status", "published") as "draft" | "published");
const DELAY = Number(opt("delay", "1500")); // jeda antar batch (ms)
const BATCH = Number(opt("batch", "40"));
const RPM = opt("rpm"); // mis. "5" → hitung sendiri jeda aman per bucket
const WITH_TOKENS = flag("tokens");
const SQL_MODE = flag("sql");
const SQL_FILE = opt("sql", "ingest-local.sql");

// ---------- pengatur laju (rate limiter) global + round-robin model ----------
// Tier gratis dibatasi RPM per model. Dengan round-robin antar M model, laju
// request global boleh M× lebih tinggi sambil tiap model tetap ≤ RPM.
const MODELS = geminiModels(); // [utama, ...fallback]
const MIN_INTERVAL = RPM
  ? Math.ceil((60000 / (Number(RPM) * MODELS.length)) * 1.1) // +10% margin
  : DELAY;
let lastCallAt = 0;
let reqIndex = 0;

/** Tunggu giliran (pacing global), lalu panggil Gemini dengan urutan model
 *  yang dirotasi agar beban tersebar merata antar bucket. */
async function pacedGenerate(batch: string[]) {
  const wait = lastCallAt + MIN_INTERVAL - Date.now();
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
  const rot = reqIndex % MODELS.length;
  const models = [...MODELS.slice(rot), ...MODELS.slice(0, rot)];
  reqIndex++;
  return generateEntries(batch, { models });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY belum diset di .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Escape literal string untuk SQL.
const q = (s: string) => `'${String(s ?? "").replace(/'/g, "''")}'`;
const jb = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

type LessonRow = { id: string; slug: string; title_ar: string; body_ar: string };

async function getLessons(): Promise<LessonRow[]> {
  let query = db.from("lessons").select("id,slug,title_ar,body_ar");
  if (LESSON) {
    // dukung slug ATAU uuid
    const isUuid = /^[0-9a-f-]{36}$/i.test(LESSON);
    query = isUuid ? query.eq("id", LESSON) : query.eq("slug", LESSON);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as LessonRow[]) ?? [];
}

const sqlOut: string[] = [];

async function processLesson(lesson: LessonRow) {
  const words = uniqueWords(lesson.body_ar);
  const reps = [...words.values()];
  const batches = chunk(reps, BATCH);
  console.log(`\n📖 ${lesson.title_ar} (${lesson.slug}) — ${words.size} kata unik, ${batches.length} batch`);

  // Peta hasil Gemini diindeks oleh bentuk ternormalkan (untuk token).
  const results = new Map<string, Awaited<ReturnType<typeof generateEntries>>[number]>();

  for (let i = 0; i < batches.length; i++) {
    process.stdout.write(`  • batch ${i + 1}/${batches.length} … `);
    const entries = await pacedGenerate(batches[i]); // paced + round-robin + retry
    for (const e of entries) results.set(normalize(e.word), e);

    if (SQL_MODE) {
      emitSql(entries);
    } else {
      await writeBatch(entries);
    }
    console.log(`${entries.length} entri`);
  }

  if (WITH_TOKENS) await writeTokens(lesson, results);
}

// ---------- mode tulis-DB ----------
async function writeBatch(entries: Awaited<ReturnType<typeof generateEntries>>) {
  const rootRows = new Map<string, string>();
  for (const e of entries) {
    const key = rootKey(e.root);
    if (key) rootRows.set(key, e.root.trim());
  }
  const rootMap = new Map<string, string>();
  if (rootRows.size) {
    await db.from("roots").upsert(
      [...rootRows].map(([normalized, root_ar]) => ({ normalized, root_ar })),
      { onConflict: "normalized", ignoreDuplicates: true }
    );
    const { data } = await db.from("roots").select("id,normalized").in("normalized", [...rootRows.keys()]);
    for (const r of (data as { id: string; normalized: string }[]) ?? []) rootMap.set(r.normalized, r.id);
  }
  const dictRows = entries.map((e) => ({
    lemma_ar: e.lemma.trim(),
    lemma_norm: normalize(e.lemma),
    root_id: rootMap.get(rootKey(e.root)) ?? null,
    meaning_ar: e.meaning ?? "",
    synonyms_ar: e.synonyms ?? [],
    antonyms_ar: e.antonyms ?? [],
    examples_ar: (e.examples ?? []).map((text) => ({ text })),
    status: STATUS,
    generated_by: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  }));
  if (dictRows.length) {
    await db.from("dictionary_entries").upsert(dictRows, { onConflict: "lemma_ar", ignoreDuplicates: true });
  }
}

async function writeTokens(
  lesson: LessonRow,
  results: Map<string, Awaited<ReturnType<typeof generateEntries>>[number]>
) {
  const { data: roots } = await db.from("roots").select("id,normalized");
  const rootMap = new Map<string, string>();
  for (const r of (roots as { id: string; normalized: string }[]) ?? []) rootMap.set(r.normalized, r.id);

  await db.from("tokens").delete().eq("lesson_id", lesson.id);
  const rows: Record<string, unknown>[] = [];
  for (const seg of tokenize(lesson.body_ar)) {
    if (seg.type !== "word") continue;
    const hit = results.get(normalize(seg.text));
    rows.push({
      lesson_id: lesson.id,
      position: seg.index,
      surface_ar: seg.text,
      lemma_ar: hit?.lemma.trim() ?? null,
      root_id: hit ? rootMap.get(rootKey(hit.root)) ?? null : null,
      char_start: seg.start,
      char_end: seg.end,
    });
  }
  for (const part of chunk(rows, 500)) await db.from("tokens").insert(part);
  console.log(`  🔤 tokens: ${rows.length}`);
}

// ---------- mode cetak SQL ----------
function emitSql(entries: Awaited<ReturnType<typeof generateEntries>>) {
  for (const e of entries) {
    const rk = rootKey(e.root);
    if (rk) {
      sqlOut.push(
        `insert into roots (root_ar, normalized) values (${q(e.root.trim())}, ${q(rk)}) ` +
          `on conflict (normalized) do nothing;`
      );
    }
    const examples = (e.examples ?? []).map((text) => ({ text }));
    sqlOut.push(
      `insert into dictionary_entries (lemma_ar, lemma_norm, root_id, meaning_ar, synonyms_ar, antonyms_ar, examples_ar, status, generated_by) ` +
        `values (${q(e.lemma.trim())}, ${q(normalize(e.lemma))}, ` +
        `${rk ? `(select id from roots where normalized=${q(rk)})` : "null"}, ` +
        `${q(e.meaning ?? "")}, ${jb(e.synonyms ?? [])}, ${jb(e.antonyms ?? [])}, ${jb(examples)}, ` +
        `${q(STATUS)}, 'gemini-local') on conflict (lemma_ar) do nothing;`
    );
  }
}

async function main() {
  const lessons = await getLessons();
  if (!lessons.length) {
    console.error(LESSON ? `❌ Lesson "${LESSON}" tidak ditemukan.` : "❌ Tidak ada lesson.");
    process.exit(1);
  }
  const laju = RPM
    ? `rpm=${RPM}/model × ${MODELS.length} model → jeda ${MIN_INTERVAL}ms (~${Math.round(60000 / MIN_INTERVAL)} req/mnt)`
    : `delay=${MIN_INTERVAL}ms`;
  console.log(`Mode: ${SQL_MODE ? "CETAK SQL" : "TULIS DB"} · status=${STATUS} · batch=${BATCH} · ${laju} · tokens=${WITH_TOKENS}`);
  console.log(`Model: ${MODELS.join(" ↻ ")}`);
  for (const l of lessons) await processLesson(l);

  if (SQL_MODE) {
    writeFileSync(SQL_FILE!, sqlOut.join("\n") + "\n", "utf8");
    console.log(`\n📝 SQL ditulis ke ${SQL_FILE} (${sqlOut.length} pernyataan). Tempel ke Supabase SQL Editor.`);
  } else {
    console.log("\n✅ Selesai menulis ke Supabase.");
  }
}

main().catch((e) => {
  console.error("\n❌ Gagal:", e?.message ?? e);
  process.exit(1);
});
