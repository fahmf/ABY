import { NextResponse } from "next/server";

import { lookupEntry, suggestEntries } from "@/lib/data/dictionary-server";

// GET /api/dictionary?q=<bentuk-kata>&lemma=<lemma>
//   → { entry, suggestions }. Bila entri tak ditemukan, sertakan saran
//     "هل تقصد؟" (kemiripan trigram ber-ambang).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const lemma = url.searchParams.get("lemma")?.trim();

  if (!q) {
    return NextResponse.json({ entry: null, suggestions: [] }, { status: 400 });
  }
  const entry = await lookupEntry(q, lemma || undefined);
  const suggestions = entry ? [] : await suggestEntries(q);
  return NextResponse.json(
    { entry, suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
