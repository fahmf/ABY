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

// ---------- laporan kualitas kamus ----------
export type EntryIssue =
  | "no_meaning"
  | "no_root"
  | "no_examples"
  | "no_synonyms"
  | "no_morphology";

export type FlaggedEntry = {
  id: string;
  lemma_ar: string;
  status: "draft" | "published";
  issues: EntryIssue[];
};

export type DictionaryQuality = {
  total: number;
  counts: Record<EntryIssue, number>;
  /** Mداخل منشورة yang masih punya masalah serius (tanpa makna/akar). */
  publishedWithIssues: number;
  /** Entri bermasalah (terbanyak masalah dulu), dibatasi untuk UI. */
  flagged: FlaggedEntry[];
  /** Draft tertua yang menunggu peninjauan. */
  oldestDrafts: { id: string; lemma_ar: string; created_at: string }[];
};

type QualityRow = {
  id: string;
  lemma_ar: string;
  meaning_ar: string | null;
  root_id: string | null;
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
  created_at: string;
};

function jsonLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function entryIssues(r: QualityRow): EntryIssue[] {
  const issues: EntryIssue[] = [];
  if (!(r.meaning_ar ?? "").trim()) issues.push("no_meaning");
  if (!r.root_id) issues.push("no_root");
  if (jsonLen(r.examples_ar) === 0) issues.push("no_examples");
  if (jsonLen(r.synonyms_ar) === 0) issues.push("no_synonyms");
  const hasMorph =
    r.word_type ||
    r.plural_ar ||
    r.singular_ar ||
    r.past_ar ||
    r.present_ar ||
    r.masdar_ar;
  if (!hasMorph) issues.push("no_morphology");
  return issues;
}

/**
 * Laporan kualitas kamus untuk dasbor admin. Mengambil kolom ringkas semua
 * entri (korpus terbatas) lalu menghitung indikator masalah di memori:
 * makna/akar/contoh/مرادفات/صرف yang hilang, plus draft tertua.
 */
export async function getDictionaryQuality(limit = 50): Promise<DictionaryQuality> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dictionary_entries")
    .select(
      "id,lemma_ar,meaning_ar,root_id,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,status,created_at"
    )
    .order("created_at", { ascending: true });

  const rows = (data as unknown as QualityRow[]) ?? [];
  const counts: Record<EntryIssue, number> = {
    no_meaning: 0,
    no_root: 0,
    no_examples: 0,
    no_synonyms: 0,
    no_morphology: 0,
  };
  let publishedWithIssues = 0;
  const flagged: FlaggedEntry[] = [];

  for (const r of rows) {
    const issues = entryIssues(r);
    for (const it of issues) counts[it] += 1;
    if (
      r.status === "published" &&
      (issues.includes("no_meaning") || issues.includes("no_root"))
    ) {
      publishedWithIssues += 1;
    }
    if (issues.length > 0) {
      flagged.push({ id: r.id, lemma_ar: r.lemma_ar, status: r.status, issues });
    }
  }

  // Masalah terbanyak dulu; منشور yang bermasalah diprioritaskan.
  flagged.sort((a, b) => {
    const sev = (e: FlaggedEntry) =>
      (e.status === "published" ? 100 : 0) + e.issues.length;
    return sev(b) - sev(a);
  });

  const oldestDrafts = rows
    .filter((r) => r.status === "draft")
    .slice(0, 10)
    .map((r) => ({ id: r.id, lemma_ar: r.lemma_ar, created_at: r.created_at }));

  return {
    total: rows.length,
    counts,
    publishedWithIssues,
    flagged: flagged.slice(0, limit),
    oldestDrafts,
  };
}

// ---------- kemajuan penyederhanaan makna (tabsîth) ----------
export type MeaningRefreshProgress = {
  total: number;
  refreshed: number;
  remaining: number;
};

/** Berapa entri sudah/belum disegarkan maknanya (penanda meaning_refreshed_at). */
export async function getMeaningRefreshProgress(): Promise<MeaningRefreshProgress> {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [total, remaining] = await Promise.all([
    supabase.from("dictionary_entries").select("*", head),
    supabase
      .from("dictionary_entries")
      .select("*", head)
      .is("meaning_refreshed_at", null),
  ]);
  const t = total.count ?? 0;
  const r = remaining.count ?? 0;
  return { total: t, refreshed: t - r, remaining: r };
}

export async function listDictionaryEntries(
  status?: "draft" | "published"
): Promise<AdminEntry[]> {
  const supabase = await createClient();
  const base = supabase
    .from("dictionary_entries")
    .select(
      "id,lemma_ar,meaning_ar,synonyms_ar,antonyms_ar,examples_ar,word_type,plural_ar,singular_ar,past_ar,present_ar,masdar_ar,status,roots(root_ar)"
    )
    .order("created_at", { ascending: false });
  const { data } = status ? await base.eq("status", status) : await base;
  return ((data as unknown as EntryRow[]) ?? []).map(mapEntry);
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

// ---------- audit / activity log ----------
export type ActivityRow = {
  id: string;
  actor_email: string | null;
  action: string;
  entity: string;
  detail: string | null;
  created_at: string;
};

export async function listActivity(limit = 100): Promise<ActivityRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("activity_log")
      .select("id,actor_email,action,entity,detail,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as ActivityRow[]) ?? [];
  } catch {
    return [];
  }
}

// ---------- analytics (usage_events) ----------
export type UsageRow = { key: string; count: number };
export type UsageStats = {
  totalWords: number;
  totalLessons: number;
  topWords: UsageRow[];
  topLessons: UsageRow[];
  hardWords: UsageRow[]; // الأكثر خطأً في الاختبارات
};

/** Agregasi sederhana di server (cocok untuk volume kecil-menengah). */
export async function getUsageStats(): Promise<UsageStats> {
  const empty: UsageStats = {
    totalWords: 0,
    totalLessons: 0,
    topWords: [],
    topLessons: [],
    hardWords: [],
  };
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("usage_events")
      .select("kind,ekey")
      .order("created_at", { ascending: false })
      .limit(5000);
    const rows = (data as { kind: string; ekey: string }[] | null) ?? [];

    const tally = (kind: string) => {
      const m = new Map<string, number>();
      for (const r of rows)
        if (r.kind === kind) m.set(r.ekey, (m.get(r.ekey) ?? 0) + 1);
      return m;
    };
    const top = (m: Map<string, number>, n = 10): UsageRow[] =>
      [...m.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);

    const words = tally("word");
    const lessons = tally("lesson");
    const hard = tally("quiz_wrong");
    return {
      totalWords: [...words.values()].reduce((a, b) => a + b, 0),
      totalLessons: [...lessons.values()].reduce((a, b) => a + b, 0),
      topWords: top(words),
      topLessons: top(lessons),
      hardWords: top(hard),
    };
  } catch {
    return empty;
  }
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
