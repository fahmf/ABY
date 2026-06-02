import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getStaffProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalize } from "@/lib/arabic";

/*
  POST /api/admin/retag  { lessonSlug, surface, lemma|null }
  Khusus staff. Koreksi kecocokan kata di sebuah teks:
   - lemma string → petakan semua token sepadan (surface ternormalkan sama)
     ke lemma terpilih (harus مدخل منشور) beserta root_id-nya.
   - lemma null   → hapus kecocokan (lemma_ar & root_id jadi null).
*/
export async function POST(request: Request) {
  const staff = await getStaffProfile();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  let body: { lessonSlug?: string; surface?: string; lemma?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lessonSlug = body.lessonSlug?.trim();
  const surface = body.surface?.trim();
  const lemma = body.lemma == null ? null : String(body.lemma).trim();
  if (!lessonSlug || !surface) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
  }

  // Tentukan nilai target (lemma kanonik + root_id) bila menetapkan.
  let lemmaAr: string | null = null;
  let rootId: string | null = null;
  if (lemma) {
    const norm = normalize(lemma);
    const { data: entry } = await supabase
      .from("dictionary_entries")
      .select("lemma_ar, root_id")
      .eq("status", "published")
      .or(`lemma_ar.eq.${lemma},lemma_norm.eq.${norm}`)
      .limit(1)
      .maybeSingle();
    if (!entry) {
      return NextResponse.json({ error: "entry_not_found" }, { status: 404 });
    }
    lemmaAr = (entry as { lemma_ar: string }).lemma_ar;
    rootId = (entry as { root_id: string | null }).root_id ?? null;
  }

  // Token yang cocok = surface ternormalkan sama (mencakup varian tasykil).
  const targetNorm = normalize(surface);
  const { data: toks } = await supabase
    .from("tokens")
    .select("id, surface_ar")
    .eq("lesson_id", (lesson as { id: string }).id);
  const ids = ((toks as { id: string; surface_ar: string }[]) ?? [])
    .filter((t) => normalize(t.surface_ar) === targetNorm)
    .map((t) => t.id);

  if (ids.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { error } = await supabase
    .from("tokens")
    .update({ lemma_ar: lemmaAr, root_id: rootId })
    .in("id", ids);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  revalidatePath(`/baca/${lessonSlug}`);
  return NextResponse.json({ updated: ids.length, lemma: lemmaAr });
}
