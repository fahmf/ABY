import { NextResponse } from "next/server";

import { getStaffProfile } from "@/lib/auth";
import { getPublicAnalyze } from "@/lib/data/settings";
import { analyzeWord } from "@/lib/ingest/analyze";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Batas untuk mode publik: maksimum permintaan per IP dalam jendela waktu.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 jam

function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** True bila IP melebihi kuota (mode publik). Memakai service-role (lewati RLS). */
async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("analyze_hits").insert({ ip });
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await admin
      .from("analyze_hits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("ts", since);
    // Pembersihan oportunistik agar tabel tak membengkak.
    if (Math.random() < 0.05) {
      const old = new Date(Date.now() - 24 * RATE_WINDOW_MS).toISOString();
      await admin.from("analyze_hits").delete().lt("ts", old);
    }
    return (count ?? 0) > RATE_MAX;
  } catch {
    return false; // jangan blokir karena galat infrastruktur
  }
}

// GET /api/analyze?q=<kata> → analisis Gemini untuk satu kata + simpan draft.
// Akses: staff selalu boleh; publik boleh hanya bila setting `public_analyze`
// menyala (dengan rate-limit per IP).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ entry: null, error: "no_query" }, { status: 400 });
  }

  const profile = await getStaffProfile();
  if (!profile) {
    const open = await getPublicAnalyze();
    if (!open) {
      return NextResponse.json({ entry: null, error: "unauthorized" }, { status: 403 });
    }
    if (await isRateLimited(clientIp(request))) {
      return NextResponse.json({ entry: null, error: "rate_limited" }, { status: 429 });
    }
  }

  try {
    const entry = await analyzeWord(q);
    return NextResponse.json({ entry });
  } catch (err) {
    const status =
      (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    const busy = status === 503 || status === 429;
    return NextResponse.json(
      { entry: null, error: busy ? "busy" : "failed" },
      { status: busy ? 503 : 500 }
    );
  }
}
