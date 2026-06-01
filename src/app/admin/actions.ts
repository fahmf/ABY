"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ingestLesson } from "@/lib/ingest/pipeline";
import { fastIndexLesson } from "@/lib/ingest/fast-index";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function csv(form: FormData, key: string): string[] {
  return str(form, key)
    .split(/[,،\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  revalidatePath("/admin");
}

export async function deleteLesson(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", id);
  revalidatePath("/admin");
}

// ---------- pipeline ingest (Gemini) ----------
export async function ingestLessonAction(id: string) {
  await requireStaff();
  try {
    await ingestLesson(id);
  } catch (err) {
    // Kegagalan (mis. Gemini kelebihan beban / 503) tidak boleh meledakkan
    // halaman admin — kembalikan ke daftar dengan pesan ramah.
    const status = (err as { status?: number; code?: number })?.status ??
      (err as { status?: number; code?: number })?.code;
    const reason = status === 503 || status === 429 ? "busy" : "failed";
    redirect(`/admin?ingest=${reason}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/dictionary");
  redirect("/admin?ingest=ok");
}

// ---------- pipeline fast index (Tanpa AI) ----------
export async function fastIndexAction(id: string) {
  await requireStaff();
  try {
    await fastIndexLesson(id);
  } catch (err) {
    const reason = "failed";
    redirect(`/admin?ingest=${reason}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/dictionary");
  redirect("/admin?ingest=ok");
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
