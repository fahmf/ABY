import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
// Wajib dinamis: hasil harus selalu berupa query nyata ke database, bukan
// respons yang disajikan dari cache (cache = database tak pernah tersentuh).
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/keepalive — dipanggil Vercel Cron (lihat `crons` di vercel.json).
 *
 * Supabase paket Free mem-pause project setelah ~7 hari tanpa aktivitas
 * database. Endpoint ini melakukan satu query ringan agar database tercatat
 * aktif, sehingga project tak pernah tertidur dan situs tak pernah tampak
 * "kehilangan data".
 *
 * Memakai klien anon (hak paling minim): tabel `volumes` boleh dibaca publik
 * lewat RLS, jadi tak perlu service-role hanya untuk menyentuh database.
 *
 * Keamanan: bila env `CRON_SECRET` diatur, Vercel Cron menyertakan header
 * `Authorization: Bearer <CRON_SECRET>` dan permintaan tanpa header itu
 * ditolak. Bila belum diatur, endpoint tetap jalan (hanya menghitung baris
 * yang memang publik) agar cron tidak gagal senyap.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    // `head: true` → tanpa badan respons, tapi query tetap dieksekusi Postgres.
    const { count, error } = await supabase
      .from("volumes")
      .select("*", { count: "exact", head: true });
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      volumes: count ?? 0,
      at: new Date().toISOString(),
    });
  } catch (err) {
    // Kembalikan 500 agar kegagalan tampak di log cron Vercel, bukan diam-diam
    // dianggap sukses — justru saat inilah kita perlu tahu.
    console.error("[ABY][keepalive] gagal menyentuh database:", err);
    return NextResponse.json(
      { ok: false, error: "database_unreachable" },
      { status: 500 }
    );
  }
}
