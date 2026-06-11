import { NextResponse } from "next/server";

import { getRootFrequency } from "@/lib/data/frequency";

const MAX_QUERY_LEN = 80; // satu kata Arab.

// GET /api/frequency?q=<bentuk-kata> → frekuensi & kemunculan kata se-akar.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ frequency: null }, { status: 400 });
  }
  const frequency = await getRootFrequency(q);
  return NextResponse.json(
    { frequency },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
