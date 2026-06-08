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

export type AdminEntry = {
  id: string;
  lemma_ar: string;
  root_ar: string;
  meaning_ar: string;
  synonyms_ar: string[];
  antonyms_ar: string[];
  examples_ar: string[];
  word_type?: string;
  plural_ar?: string;
  singular_ar?: string;
  past_ar?: string;
  present_ar?: string;
  masdar_ar?: string;
  status: "draft" | "published";
};

type EntryRow = {
  id: string;
  lemma_ar: string;
  meaning_ar: string | null;
  synonyms_ar: unknown;
  antonyms_ar: unknown;
  examples_ar: unknown;
  word_type: string | null;
  plural_ar: string | null;
  singular_ar: string | null;
  past_ar: string | null;
  present_ar: string | null;
  masdar_ar: string | null;
  status: "draft" | "published";
  roots: { root_ar: string } | null;
};

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
function exArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) =>
      typeof x === "string"
        ? x
        : x && typeof x === "object" && "text" in x
          ? String((x as { text: unknown }).text)
          : ""
    )
    .filter(Boolean);
}
function mapEntry(r: EntryRow): AdminEntry {
  return {
    id: r.id,
    lemma_ar: r.lemma_ar,
    root_ar: r.roots?.root_ar ?? "",
    meaning_ar: r.meaning_ar ?? "",
    synonyms_ar: strArr(r.synonyms_ar),
    antonyms_ar: strArr(r.antonyms_ar),
    examples_ar: exArr(r.examples_ar),
    word_type: r.word_type ?? undefined,
    plural_ar: r.plural_ar ?? undefined,
    singular_ar: r.singular_ar ?? undefined,
    past_ar: r.past_ar ?? undefined,
    present_ar: r.present_ar ?? undefined,
    masdar_ar: r.masdar_ar ?? undefined,
    status: r.status,
  };
}

export type AdminStats = {
  entriesTotal: number;
  entriesDraft: number;
  entriesPublished: number;
  roots: number;
  lessons: number;
  lessonsIngested: number;
};

/** Ringkasan untuk dasbor admin (memakai count head agar ringan). */
export async function getDictionaryStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [
    entriesTotal,
    entriesDraft,
    entriesPublished,
    roots,
    lessons,
    lessonsIngested,
  ] = await Promise.all([
    supabase.from("dictionary_entries").select("*", head),
    supabase.from("dictionary_entries").select("*", head).eq("status", "draft"),
    supabase
      .from("dictionary_entries")
      .select("*", head)
      .eq("status", "published"),
    supabase.from("roots").select("*", head),
    supabase.from("lessons").select("*", head),
    supabase.from("lessons").select("*", head).not("ingested_at", "is", null),
  ]);
  return {
    entriesTotal: entriesTotal.count ?? 0,
    entriesDraft: entriesDraft.count ?? 0,
    entriesPublished: entriesPublished.count ?? 0,
    roots: roots.count ?? 0,
    lessons: lessons.count ?? 0,
    lessonsIngested: lessonsIngested.count ?? 0,
  };
}

export async function listDictionaryEntries(
  status?: "draft" | "published"
): Promise<AdminEntry[]> {
  const supabase = await createClient();
  // Supabase/PostgREST caps each response at the project "Max rows" setting
  // (1000 by default), so we page through the table in chunks to fetch every
  // entry instead of silently dropping rows beyond the cap.
  const PAGE_SIZE = 1000;
  const rows: EntryRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const query = supabase
      .from("dictionary_entries")
      .select(
        "id,lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,status,roots(root_ar)"
      )
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    const { data } = status ? await query.eq("status", status) : await query;
    const page = (data as unknown as EntryRow[]) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows.map(mapEntry);
}

export async function getDictionaryEntry(id: string): Promise<AdminEntry | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dictionary_entries")
    .select(
      "id,lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,status,roots(root_ar)"
    )
    .eq("id", id)
    .maybeSingle();
  return data ? mapEntry(data as unknown as EntryRow) : null;
}

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
