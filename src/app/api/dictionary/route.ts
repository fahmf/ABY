import { NextResponse } from "next/server";

import { lookupEntry } from "@/lib/data/dictionary-server";

// GET /api/dictionary?q=<bentuk-kata> → entri kamus (published) atau seed.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ entry: null }, { status: 400 });
  }
  const entry = await lookupEntry(q);
  return NextResponse.json({ entry });
}
