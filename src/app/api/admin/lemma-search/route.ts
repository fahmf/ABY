import { NextResponse } from "next/server";

import { getStaffProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalize } from "@/lib/arabic";

/*
  GET /api/admin/lemma-search?q=<lafzh>   (khusus staff)
  Saran مدخل منشور untuk kotak "تصحيح الكشف" agar staf memilih lemma EKSAK,
  bukan mengetik bentuk permukaan/jamak yang tak punya entri. Sekaligus
  menampilkan varian homograf (mis. سُوق "pasar" ↔ سَوْق مصدر ساق) yang berbagi
  lemma_norm namun berbeda makna, lengkap dengan word_type & makna ringkas.
*/
export async function GET(request: Request) {
  const staff = await getStaffProfile();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ entries: [] });

  const norm = normalize(q);
  const supabase = await createClient();
  // Cocokkan berdasarkan lemma_ar (apa adanya) ATAU lemma_norm (tanpa harakat),
  // sehingga staf bisa mengetik dengan/atau tanpa tasykil.
  const { data } = await supabase
    .from("dictionary_entries")
    .select("lemma_ar,meaning_ar,word_type,roots(root_ar)")
    .eq("status", "published")
    .or(`lemma_ar.ilike.*${q}*,lemma_norm.ilike.${norm}*`)
    .order("lemma_ar")
    .limit(10);

  type Row = {
    lemma_ar: string;
    meaning_ar: string | null;
    word_type: string | null;
    roots: { root_ar: string } | { root_ar: string }[] | null;
  };
  const entries = ((data as unknown as Row[]) ?? []).map((r) => ({
    lemma_ar: r.lemma_ar,
    meaning_ar: r.meaning_ar ?? "",
    word_type: r.word_type ?? "",
    root_ar: Array.isArray(r.roots)
      ? (r.roots[0]?.root_ar ?? "")
      : (r.roots?.root_ar ?? ""),
  }));
  return NextResponse.json({ entries });
}
