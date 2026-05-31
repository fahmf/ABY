/**
 * Seed konten awal (Jilid 1) ke Supabase memakai service role key.
 * Jalankan: bun run seed
 *
 * Idempoten: upsert berdasarkan kolom unik (volumes.number, units(volume,slug),
 * lessons(unit,slug)). Aman dijalankan berulang.
 */
import { createClient } from "@supabase/supabase-js";

import { VOLUMES, UNITS, LESSONS } from "../src/lib/data/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local"
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1) Volumes
  for (const v of VOLUMES) {
    const { error } = await db
      .from("volumes")
      .upsert(
        { number: v.number, title_ar: v.title_ar, slug: v.slug, sort_order: v.number },
        { onConflict: "number" }
      );
    if (error) throw error;
  }
  console.log(`✅ volumes: ${VOLUMES.length}`);

  // Peta number → volume_id
  const { data: vols, error: vErr } = await db
    .from("volumes")
    .select("id,number");
  if (vErr) throw vErr;
  const volId = new Map<number, string>(
    (vols ?? []).map((r) => [r.number as number, r.id as string])
  );

  // 2) Units
  for (const u of UNITS) {
    const volume_id = volId.get(u.volumeNumber);
    if (!volume_id) continue;
    const { error } = await db
      .from("units")
      .upsert(
        {
          volume_id,
          number: u.number,
          title_ar: u.title_ar,
          slug: u.slug,
          sort_order: u.number,
        },
        { onConflict: "volume_id,slug" }
      );
    if (error) throw error;
  }
  console.log(`✅ units: ${UNITS.length}`);

  // Peta slug → unit_id
  const { data: units, error: uErr } = await db
    .from("units")
    .select("id,slug");
  if (uErr) throw uErr;
  const unitId = new Map<string, string>(
    (units ?? []).map((r) => [r.slug as string, r.id as string])
  );

  // 3) Lessons (published agar langsung tampil ke publik)
  let n = 0;
  for (const l of LESSONS) {
    const unit_id = unitId.get(l.unitSlug);
    if (!unit_id) continue;
    const { error } = await db.from("lessons").upsert(
      {
        unit_id,
        title_ar: l.title_ar,
        slug: l.slug,
        body_ar: l.body_ar,
        status: "published",
        sort_order: n,
      },
      { onConflict: "unit_id,slug" }
    );
    if (error) throw error;
    n++;
  }
  console.log(`✅ lessons: ${n}`);
  console.log("🌱 Seed selesai.");
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e.message ?? e);
  process.exit(1);
});
