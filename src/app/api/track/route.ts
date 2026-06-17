import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const KINDS = new Set(["word", "lesson", "quiz_wrong"]);

/**
 * POST /api/track  body: { kind, key }
 * Rekam أحداث الاستخدام (نقر كلمة / فتح نصّ / خطأ في الاختبار) عبر service-role.
 * Best-effort: نُعيد 204 دائمًا تقريبًا حتى لا نُعطّل تجربة القارئ.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return new NextResponse(null, { status: 204 });
  try {
    const body = (await request.json().catch(() => ({}))) as {
      kind?: string;
      key?: string;
    };
    const kind = body.kind?.trim();
    const key = body.key?.trim().slice(0, 200);
    if (!kind || !key || !KINDS.has(kind)) {
      return new NextResponse(null, { status: 204 });
    }
    const admin = createAdminClient();
    await admin.from("usage_events").insert({ kind, ekey: key });
  } catch {
    /* analitik bersifat best-effort */
  }
  return new NextResponse(null, { status: 204 });
}
