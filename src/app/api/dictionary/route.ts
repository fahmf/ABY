import { NextResponse } from "next/server";

import { lookupEntry, listSenses, suggestEntries } from "@/lib/data/dictionary-server";
import { normalize } from "@/lib/arabic";

// GET /api/dictionary?q=<bentuk-kata>&lemma=<lemma>
//   → { entry, senses, suggestions }. Bila entri ditemukan dan ada >1 مدخل
//     منشور dengan lemma_norm sama (homograf), sertakan `senses` agar pembaca
//     bisa memilih makna yang tepat. Bila entri tak ada, sertakan saran
//     "هل تقصد؟" (kemiripan trigram ber-ambang).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const lemma = url.searchParams.get("lemma")?.trim();

  if (!q) {
    return NextResponse.json(
      { entry: null, senses: [], suggestions: [] },
      { status: 400 }
    );
  }
  const entry = await lookupEntry(q, lemma || undefined);
  const senses = entry ? await listSenses(normalize(entry.lemma_ar)) : [];
  const suggestions = entry ? [] : await suggestEntries(q);
  return NextResponse.json(
    { entry, senses: senses.length > 1 ? senses : [], suggestions },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}
