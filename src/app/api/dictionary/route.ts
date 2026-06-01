import { NextResponse } from "next/server";

import { lookupEntry } from "@/lib/data/dictionary-server";

// GET /api/dictionary?q=<bentuk-kata>&lemma=<lemma> → entri kamus (published) atau seed.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const lemma = url.searchParams.get("lemma")?.trim();
  
  if (!q) {
    return NextResponse.json({ entry: null }, { status: 400 });
  }
  const entry = await lookupEntry(q, lemma || undefined);
  return NextResponse.json(
    { entry },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
