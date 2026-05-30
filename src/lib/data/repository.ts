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
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("volumes")
      .select("number,title_ar,slug")
      .eq("number", number)
      .maybeSingle();
    if (!data) return null;
    return {
      number: data.number as number,
      title_ar: data.title_ar as string,
      slug: data.slug as string,
    };
  } catch {
    return seedVolumes().find((v) => v.number === number) ?? null;
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
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select("slug,number,title_ar,volumes!inner(number)")
      .eq("slug", unitSlug)
      .eq("volumes.number", volumeNumber)
      .maybeSingle();
    if (!data) return null;
    const u = data as unknown as UnitRow;
    return {
      slug: u.slug,
      number: u.number,
      title_ar: u.title_ar,
      volumeNumber: u.volumes.number,
    };
  } catch {
    return seedUnits(volumeNumber).find((u) => u.slug === unitSlug) ?? null;
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
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("lessons")
      .select(
        "slug,title_ar,body_ar,units!inner(slug,volumes!inner(number))"
      )
      .eq("slug", lessonSlug)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return mapLessonRow(data as unknown as LessonRow);
  } catch {
    return seedLessons().find((l) => l.slug === lessonSlug) ?? null;
  }
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
