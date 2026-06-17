"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ingestLesson } from "@/lib/ingest/pipeline";
import { fastIndexLesson } from "@/lib/ingest/fast-index";
import { refreshMeanings, resetMeaningRefresh } from "@/lib/ingest/refresh-meanings";
import { generateLessonQuestions } from "@/lib/ingest/questions";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function csv(form: FormData, key: string): string[] {
  return str(form, key)
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Catat tindakan staff ke سجلّ النشاط (audit). Aman-gagal: bila tabel belum
 * ada atau RLS menolak, abaikan tanpa mengganggu aksi utama.
 */
async function logActivity(
  action: string,
  entity: string,
  detail?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({
      actor_id: auth.user?.id ?? null,
      actor_email: auth.user?.email ?? null,
      action,
      entity,
      detail: detail ?? null,
    });
  } catch {
    /* audit bersifat best-effort */
  }
}

export async function createVolume(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("volumes").insert({
    number: Number(str(form, "number")),
    title_ar: str(form, "title_ar"),
    slug: str(form, "slug"),
  });
  revalidatePath("/admin");
}

export async function updateVolume(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("volumes")
    .update({
      number: Number(str(form, "number")),
      title_ar: str(form, "title_ar"),
      slug: str(form, "slug"),
    })
    .eq("id", str(form, "id"));
  await logActivity("update", "volume", str(form, "title_ar"));
  revalidatePath("/admin");
}

export async function deleteVolume(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("volumes").delete().eq("id", id);
  await logActivity("delete", "volume", id);
  revalidatePath("/admin");
}

export async function createUnit(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("units").insert({
    volume_id: str(form, "volume_id"),
    number: Number(str(form, "number")),
    title_ar: str(form, "title_ar"),
    slug: str(form, "slug"),
  });
  revalidatePath("/admin");
}

export async function updateUnit(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("units")
    .update({
      volume_id: str(form, "volume_id"),
      number: Number(str(form, "number")),
      title_ar: str(form, "title_ar"),
      slug: str(form, "slug"),
    })
    .eq("id", str(form, "id"));
  await logActivity("update", "unit", str(form, "title_ar"));
  revalidatePath("/admin");
}

export async function deleteUnit(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("units").delete().eq("id", id);
  await logActivity("delete", "unit", id);
  revalidatePath("/admin");
}

export async function saveLesson(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const id = str(form, "id");
  const payload = {
    unit_id: str(form, "unit_id"),
    title_ar: str(form, "title_ar"),
    slug: str(form, "slug"),
    body_ar: str(form, "body_ar"),
    status: (str(form, "status") || "draft") as "draft" | "published",
  };

  if (id) {
    await supabase.from("lessons").update(payload).eq("id", id);
  } else {
    await supabase.from("lessons").insert(payload);
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function setLessonStatus(id: string, status: "draft" | "published") {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("lessons").update({ status }).eq("id", id);
  await logActivity(status === "published" ? "publish" : "unpublish", "lesson", id);
  revalidatePath("/admin");
}

export async function deleteLesson(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", id);
  await logActivity("delete", "lesson", id);
  revalidatePath("/admin");
}

/** Nasyr/إخفاء جماعي لعدّة نصوص دفعةً واحدة. */
export async function bulkSetLessonStatus(
  ids: string[],
  status: "draft" | "published"
) {
  await requireStaff();
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("lessons").update({ status }).in("id", ids);
  await logActivity(
    status === "published" ? "publish" : "unpublish",
    "lesson",
    `${ids.length} نصّ`
  );
  revalidatePath("/admin");
}

/**
 * Naik/turunkan urutan نصّ ضمن وحدته. لتفادي تساوي sort_order الافتراضي،
 * نُعيد ترقيم نصوص الوحدة حسب ترتيبها الحالي ثمّ نُبدّل العنصر مع جاره.
 */
export async function moveLesson(id: string, dir: "up" | "down") {
  await requireStaff();
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("lessons")
    .select("id,unit_id")
    .eq("id", id)
    .maybeSingle();
  if (!target) return;
  const t = target as { id: string; unit_id: string };

  const { data: rows } = await supabase
    .from("lessons")
    .select("id")
    .eq("unit_id", t.unit_id)
    .order("sort_order")
    .order("created_at");
  const list = (rows as { id: string }[] | null) ?? [];
  const idx = list.findIndex((r) => r.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= list.length) return;

  [list[idx], list[swapWith]] = [list[swapWith], list[idx]];
  // Tulis ulang sort_order berurutan (idempoten).
  await Promise.all(
    list.map((r, i) =>
      supabase.from("lessons").update({ sort_order: i }).eq("id", r.id)
    )
  );
  revalidatePath("/admin");
}

/**
 * استيراد جماعي: نصوص متعدّدة في وحدة واحدة. تنسيق الإدخال: كلّ نصّ يبدأ
 * بسطر عنوان يبدأ بـ"#" يليه جسم النصّ، وتُفصل النصوص بسطر "---".
 *   # عنوان الدرس
 *   النصّ العربي…
 *   ---
 *   # درس آخر
 *   …
 */
export async function bulkImportLessons(form: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const unitId = str(form, "unit_id");
  const status = (str(form, "status") || "draft") as "draft" | "published";
  const raw = str(form, "bulk");

  const blocks = raw
    .split(/^\s*---\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  let created = 0;
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = lines[0].trim();
    const title = first.startsWith("#")
      ? first.replace(/^#+\s*/, "").trim()
      : first;
    const body = (first.startsWith("#") ? lines.slice(1) : lines)
      .join("\n")
      .trim();
    if (!title) continue;

    const slug = slugify(title, created);
    const { error } = await supabase.from("lessons").insert({
      unit_id: unitId,
      title_ar: title,
      slug,
      body_ar: body,
      status,
    });
    if (!error) created++;
  }

  await logActivity("import", "lesson", `${created} نصّ`);
  revalidatePath("/admin");
  redirect(`/admin/import?done=${created}`);
}

/** Slug ramah-URL dari عنوان عربي؛ احتياطي رقمي لتفادي التصادم. */
function slugify(title: string, salt: number): string {
  const base = title
    .normalize("NFKD")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Date.now().toString(36).slice(-4) + (salt || "");
  return `${base || "نص"}-${suffix}`;
}

// ---------- pipeline ingest (Gemini) ----------
export async function ingestLessonAction(id: string) {
  await requireStaff();
  let params: URLSearchParams;
  try {
    const r = await ingestLesson(id);
    // Pipeline kini selalu mengembalikan hasil (parsial bila terhenti) alih-alih
    // melempar untuk kegagalan per-batch — jadi kita selalu punya angka untuk
    // ditampilkan: berapa kata tercatat & berapa mdkhal baru.
    params = new URLSearchParams({
      ingest: r.done ? "ok" : (r.reason ?? "failed"),
      w: String(r.processedWords),
      t: String(r.uniqueWords),
      e: String(r.newEntries),
    });
  } catch (err) {
    // Hanya kegagalan setup (GEMINI_API_KEY kosong / teks tak ada) yang sampai
    // ke sini — tak ada angka untuk dilaporkan.
    const status =
      (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    const reason = status === 503 || status === 429 ? "busy" : "failed";
    redirect(`/admin?ingest=${reason}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/dictionary");
  redirect(`/admin?${params}`);
}

// ---------- pipeline fast index (Tanpa AI) ----------
export async function fastIndexAction(id: string) {
  await requireStaff();
  let params: URLSearchParams;
  try {
    const r = await fastIndexLesson(id);
    params = new URLSearchParams({
      ingest: "ok",
      mode: "fast",
      w: String(r.matchedTokens),
      t: String(r.totalWords),
    });
  } catch {
    redirect(`/admin?ingest=failed`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/dictionary");
  redirect(`/admin?${params}`);
}

// ---------- soal pemahaman teks (أسئلة الفهم) ----------
export async function generateQuestionsAction(id: string) {
  await requireStaff();
  let params: URLSearchParams;
  try {
    const r = await generateLessonQuestions(id);
    params = new URLSearchParams({
      ingest: "ok",
      mode: "quiz",
      w: String(r.count),
    });
  } catch (err) {
    const status =
      (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    const reason = status === 503 || status === 429 ? "busy" : "failed";
    redirect(`/admin?ingest=${reason}`);
  }
  revalidatePath("/admin");
  redirect(`/admin?${params}`);
}

// ---------- penyederhanaan makna massal (tabsîth) ----------
export async function refreshMeaningsAction() {
  await requireStaff();
  let params: URLSearchParams;
  try {
    const r = await refreshMeanings();
    params = new URLSearchParams({
      refresh: r.done ? "ok" : (r.reason ?? "failed"),
      ru: String(r.updated),
      rr: String(r.remaining),
      rt: String(r.total),
    });
  } catch (err) {
    const status =
      (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    const reason = status === 503 || status === 429 ? "busy" : "failed";
    redirect(`/admin/dictionary/quality?refresh=${reason}`);
  }
  revalidatePath("/admin/dictionary");
  revalidatePath("/admin/dictionary/quality");
  redirect(`/admin/dictionary/quality?${params}`);
}

export async function resetMeaningRefreshAction() {
  await requireStaff();
  await resetMeaningRefresh();
  revalidatePath("/admin/dictionary/quality");
  redirect("/admin/dictionary/quality?refresh=reset");
}

// ---------- verifikasi kamus ----------
export async function saveDictionaryEntry(form: FormData) {
  const profile = await requireStaff();
  const supabase = await createClient();
  const id = str(form, "id");
  const examples = str(form, "examples_ar")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text) => ({ text }));

  const publish = str(form, "status") === "published";
  await supabase
    .from("dictionary_entries")
    .update({
      meaning_ar: str(form, "meaning_ar"),
      synonyms_ar: csv(form, "synonyms_ar"),
      antonyms_ar: csv(form, "antonyms_ar"),
      examples_ar: examples,
      word_type: str(form, "word_type") || null,
      plural_ar: str(form, "plural_ar") || null,
      singular_ar: str(form, "singular_ar") || null,
      past_ar: str(form, "past_ar") || null,
      present_ar: str(form, "present_ar") || null,
      masdar_ar: str(form, "masdar_ar") || null,
      status: publish ? "published" : "draft",
      reviewed_by: publish ? profile.id : null,
      reviewed_at: publish ? new Date().toISOString() : null,
    })
    .eq("id", id);

  await logActivity(publish ? "publish" : "update", "dictionary", str(form, "meaning_ar").slice(0, 40));
  revalidatePath("/admin/dictionary");
  redirect("/admin/dictionary");
}

export async function setEntryStatus(
  id: string,
  status: "draft" | "published"
) {
  const profile = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("dictionary_entries")
    .update({
      status,
      reviewed_by: status === "published" ? profile.id : null,
      reviewed_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin/dictionary");
}

export async function deleteEntry(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("dictionary_entries").delete().eq("id", id);
  revalidatePath("/admin/dictionary");
}

export async function bulkSetEntryStatus(
  ids: string[],
  status: "draft" | "published"
) {
  const profile = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("dictionary_entries")
    .update({
      status,
      reviewed_by: status === "published" ? profile.id : null,
      reviewed_at: status === "published" ? new Date().toISOString() : null,
    })
    .in("id", ids);
  revalidatePath("/admin/dictionary");
}

export async function bulkDeleteEntries(ids: string[]) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("dictionary_entries").delete().in("id", ids);
  revalidatePath("/admin/dictionary");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- pengaturan: buka/tutup analisis AI untuk publik ----------
export async function setPublicAnalyze(value: boolean) {
  await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("app_settings")
    .upsert(
      { key: "public_analyze", value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  revalidatePath("/admin");
}
