import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "middleware" kini bernama "proxy". Menyegarkan sesi Supabase
// & melindungi rute /admin.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Jalankan di semua rute kecuali aset statis & gambar.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
