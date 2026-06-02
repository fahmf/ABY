import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "middleware" kini bernama "proxy". Menyegarkan sesi Supabase
// & melindungi rute /admin.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Hanya rute /admin yang perlu proteksi sesi; halaman publik tak perlu
  // melewati middleware sama sekali (hindari latensi auth di tiap kunjungan).
  matcher: ["/admin/:path*"],
};
