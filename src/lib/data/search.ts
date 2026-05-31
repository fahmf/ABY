import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { buildHit, searchSeed, type SearchHit } from "./search-core";
import { LESSONS, UNITS } from "./seed";

export type { SearchHit };

/**
 * Cari teks di judul & isi pelajaran (published). Pencocokan tanpa harakat.
 * Supabase bila terkonfigurasi, selain itu cari di seed.
 */
export async function searchLessons(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (isSupabaseConfigured()) {
    try {
      const hits = await fromSupabase(q);
      if (hits) return hits;
    } catch {
      // jatuh ke seed
    }
  }
  return searchSeed(q, LESSONS, UNITS);
}

async function fromSupabase(q: string): Promise<SearchHit[] | null> {
  const supabase = await createClient();
  const pattern = `%${q}%`;
  const { data } = await supabase
    .from("lessons")
    .select(
      "slug,title_ar,body_ar,units!inner(title_ar,volumes!inner(number))"
    )
    .eq("status", "published")
    .or(`title_ar.ilike.${pattern},body_ar.ilike.${pattern}`)
    .limit(50);

  type Row = {
    slug: string;
    title_ar: string;
    body_ar: string;
    units: { title_ar: string; volumes: { number: number } };
  };
  const rows = (data as unknown as Row[]) ?? [];
  return rows.map((r) =>
    buildHit(r.slug, r.title_ar, r.body_ar, r.units.title_ar, r.units.volumes.number, q)
  );
}
