import { NextResponse } from "next/server";

import { getRootFrequency } from "@/lib/data/frequency";

// GET /api/frequency?q=<bentuk-kata> → frekuensi & kemunculan kata se-akar.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ frequency: null }, { status: 400 });
  }
  const frequency = await getRootFrequency(q);
  return NextResponse.json({ frequency });
}
