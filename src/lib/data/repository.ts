import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Lesson, Unit, Volume } from "./types";
import { LESSONS, UNITS, VOLUMES } from "./seed";

// Lapisan akses data publik. Memakai Supabase bila terkonfigurasi (RLS
// otomatis menyaring konten 'published'), selain itu jatuh ke data seed.
// Catatan: slug pelajaran diperlakukan unik global untuk routing /baca/[lesson].

export async function getVolumes(): Promise<Volume[]> {
  if (!isSupabaseConfigured()) return seedVolumes();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("volumes")
      .select("number,title_ar,slug")
      .order("number");
    if (error || !data) throw error;
    return data.map((v) => ({
      number: v.number as number,
      title_ar: v.title_ar as string,
      slug: v.slug as string,
    }));
  } catch {
    return seedVolumes();
  }
}

export async function getVolume(number: number): Promise<Volume | null> {
  if (!isSupabaseConfigured())
    return seedVolumes().find((v) => v.number === number) ?? null;
  const fallback = () => seedVolumes().find((v) => v.number === number) ?? null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("volumes")
      .select("number,title_ar,slug")
      .eq("number", number)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback();
    return {
      number: data.number as number,
      title_ar: data.title_ar as string,
      slug: data.slug as string,
    };
  } catch {
    return fallback();
  }
}

export async function getUnits(volumeNumber: number): Promise<Unit[]> {
  if (!isSupabaseConfigured()) return seedUnits(volumeNumber);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("units")
      .select("slug,number,title_ar,volumes!inner(number)")
      .eq("volumes.number", volumeNumber)
      .order("number");
    if (error || !data) throw error;
    return (data as unknown as UnitRow[]).map((u) => ({
      slug: u.slug,
      number: u.number,
      title_ar: u.title_ar,
      volumeNumber: u.volumes.number,
    }));
  } catch {
    return seedUnits(volumeNumber);
  }
}

export async function getUnit(
  volumeNumber: number,
  unitSlug: string
): Promise<Unit | null> {
  if (!isSupabaseConfigured())
    return seedUnits(volumeNumber).find((u) => u.slug === unitSlug) ?? null;
  const fallback = () =>
    seedUnits(volumeNumber).find((u) => u.slug === unitSlug) ?? null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("units")
      .select("slug,number,title_ar,volumes!inner(number)")
      .eq("slug", unitSlug)
      .eq("volumes.number", volumeNumber)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback();
    const u = data as unknown as UnitRow;
    return {
      slug: u.slug,
      number: u.number,
      title_ar: u.title_ar,
      volumeNumber: u.volumes.number,
    };
  } catch {
    return fallback();
  }
}

export async function getLessons(unitSlug: string): Promise<Lesson[]> {
  if (!isSupabaseConfigured()) return seedLessons(unitSlug);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select(
        "slug,title_ar,body_ar,units!inner(slug,volumes!inner(number))"
      )
      .eq("units.slug", unitSlug)
      .order("sort_order");
    if (error || !data) throw error;
    return (data as unknown as LessonRow[]).map(mapLessonRow);
  } catch {
    return seedLessons(unitSlug);
  }
}

export async function getLesson(lessonSlug: string): Promise<Lesson | null> {
  if (!isSupabaseConfigured())
    return seedLessons().find((l) => l.slug === lessonSlug) ?? null;
  const fallback = () =>
    seedLessons().find((l) => l.slug === lessonSlug) ?? null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select(
        "slug,title_ar,body_ar,units!inner(slug,volumes!inner(number))"
      )
      .eq("slug", lessonSlug)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback();
    return mapLessonRow(data as unknown as LessonRow);
  } catch {
    return fallback();
  }
}

/** Semua slug pelajaran (published) untuk sitemap. */
export async function getAllLessonSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) return seedLessons().map((l) => l.slug);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lessons").select("slug");
    if (error || !data) throw error;
    return (data as { slug: string }[]).map((r) => r.slug);
  } catch {
    return seedLessons().map((l) => l.slug);
  }
}

/**
 * Ambil kecocokan token dengan kamus (position -> lemma) untuk suatu pelajaran.
 * Memakai RPC `lesson_dictionary_matches` (migrasi 0005): satu round-trip yang
 * meng-JOIN tokens × dictionary_entries di sisi DB, tanpa membawa daftar lemma
 * unik ke query-string (menghindari batas panjang URL pada teks panjang).
 */
export async function getDictionaryMatches(
  lessonSlug: string
): Promise<Record<number, string>> {
  const matches: Record<number, string> = {};
  if (!isSupabaseConfigured()) return matches;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("lesson_dictionary_matches", {
      p_slug: lessonSlug,
    });
    if (error || !data) return matches;
    for (const r of data as { position: number; lemma_ar: string }[]) {
      matches[r.position] = r.lemma_ar;
    }
  } catch (err) {
    console.error(err);
  }
  return matches;
}

// ---------- bentuk baris hasil join Supabase ----------
type UnitRow = {
  slug: string;
  number: number;
  title_ar: string;
  volumes: { number: number };
};

type LessonRow = {
  slug: string;
  title_ar: string;
  body_ar: string;
  units: { slug: string; volumes: { number: number } };
};

function mapLessonRow(l: LessonRow): Lesson {
  return {
    slug: l.slug,
    title_ar: l.title_ar,
    body_ar: l.body_ar,
    unitSlug: l.units.slug,
    volumeNumber: l.units.volumes.number,
  };
}

// ---------- fallback seed ----------
function seedVolumes(): Volume[] {
  return [...VOLUMES].sort((a, b) => a.number - b.number);
}
function seedUnits(volumeNumber: number): Unit[] {
  return UNITS.filter((u) => u.volumeNumber === volumeNumber).sort(
    (a, b) => a.number - b.number
  );
}
function seedLessons(unitSlug?: string): Lesson[] {
  return unitSlug ? LESSONS.filter((l) => l.unitSlug === unitSlug) : LESSONS;
}
