import { NextResponse } from "next/server";

import { getStaffProfile } from "@/lib/auth";
import { analyzeWord } from "@/lib/ingest/analyze";

export const maxDuration = 60;

// GET /api/analyze?q=<kata> → analisis Gemini untuk satu kata + simpan draft.
// KHUSUS STAFF (mencegah penyalahgunaan kuota Gemini oleh publik).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ entry: null, error: "no_query" }, { status: 400 });
  }

  const profile = await getStaffProfile();
  if (!profile) {
    return NextResponse.json({ entry: null, error: "unauthorized" }, { status: 403 });
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
