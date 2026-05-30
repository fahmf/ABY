"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
