import { createClient } from "@/lib/supabase/server";

// Helper data untuk panel admin (staff). RLS membolehkan staff melihat draft.

export type AdminVolume = {
  id: string;
  number: number;
  title_ar: string;
  slug: string;
};

export type AdminUnit = {
  id: string;
  number: number;
  title_ar: string;
  slug: string;
  volume_id: string;
  volumeTitle: string;
};

export type AdminLesson = {
  id: string;
  title_ar: string;
  slug: string;
  body_ar: string;
  status: "draft" | "published";
  unit_id: string;
  unitTitle: string;
};

export async function listVolumes(): Promise<AdminVolume[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("volumes")
    .select("id,number,title_ar,slug")
    .order("number");
  return (data as AdminVolume[]) ?? [];
}

export async function listUnits(): Promise<AdminUnit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id,number,title_ar,slug,volume_id,volumes!inner(title_ar)")
    .order("number");
  return (
    (data as unknown as (Omit<AdminUnit, "volumeTitle"> & {
      volumes: { title_ar: string };
    })[]) ?? []
  ).map((u) => ({
    id: u.id,
    number: u.number,
    title_ar: u.title_ar,
    slug: u.slug,
    volume_id: u.volume_id,
    volumeTitle: u.volumes.title_ar,
  }));
}

export async function listLessons(): Promise<AdminLesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id,title_ar,slug,body_ar,status,unit_id,units!inner(title_ar)")
    .order("created_at", { ascending: false });
  return (
    (data as unknown as (Omit<AdminLesson, "unitTitle"> & {
      units: { title_ar: string };
    })[]) ?? []
  ).map((l) => ({
    id: l.id,
    title_ar: l.title_ar,
    slug: l.slug,
    body_ar: l.body_ar,
    status: l.status,
    unit_id: l.unit_id,
    unitTitle: l.units.title_ar,
  }));
}

export async function getLessonById(id: string): Promise<AdminLesson | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id,title_ar,slug,body_ar,status,unit_id,units!inner(title_ar)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const l = data as unknown as Omit<AdminLesson, "unitTitle"> & {
    units: { title_ar: string };
  };
  return {
    id: l.id,
    title_ar: l.title_ar,
    slug: l.slug,
    body_ar: l.body_ar,
    status: l.status,
    unit_id: l.unit_id,
    unitTitle: l.units.title_ar,
  };
}
