import { normalize, stripDiacritics } from "@/lib/arabic";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LESSONS, UNITS } from "./seed";

export type SearchHit = {
  lessonSlug: string;
  lessonTitle: string;
  unitTitle: string;
  volumeNumber: number;
  snippet: string;
};

const RADIUS = 50;

function snippetAround(body: string, idx: number, qLen: number): string {
  const from = Math.max(0, idx - RADIUS);
  const to = Math.min(body.length, idx + qLen + RADIUS);
  return (
    (from > 0 ? "…" : "") +
    body.slice(from, to).trim() +
    (to < body.length ? "…" : "")
  );
}

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
  return fromSeed(q);
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
  return rows.map((r) => buildHit(r.slug, r.title_ar, r.body_ar, r.units.title_ar, r.units.volumes.number, q));
}

function fromSeed(q: string): SearchHit[] {
  const nq = normalize(q);
  const out: SearchHit[] = [];
  for (const l of LESSONS) {
    const unit = UNITS.find((u) => u.slug === l.unitSlug);
    const hay = normalize(l.title_ar + " " + l.body_ar);
    if (hay.includes(nq)) {
      out.push(
        buildHit(l.slug, l.title_ar, l.body_ar, unit?.title_ar ?? "", l.volumeNumber, q)
      );
    }
  }
  return out;
}

function buildHit(
  slug: string,
  title: string,
  body: string,
  unitTitle: string,
  volumeNumber: number,
  q: string
): SearchHit {
  // Cuplikan diambil dari teks tanpa harakat agar offset pencocokan konsisten.
  const bare = stripDiacritics(body);
  const nq = stripDiacritics(q);
  const idx = bare.indexOf(nq);
  const snippet =
    idx >= 0
      ? snippetAround(bare, idx, nq.length)
      : bare.slice(0, 80) + (bare.length > 80 ? "…" : "");
  return {
    lessonSlug: slug,
    lessonTitle: title,
    unitTitle,
    volumeNumber,
    snippet,
  };
}
