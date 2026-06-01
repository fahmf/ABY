import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type StaffProfile = {
  id: string;
  email: string | null;
  role: "admin" | "editor";
};

/** Profil staff yang sedang login, atau null. */
export async function getStaffProfile(): Promise<StaffProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,email,role,approved")
    .eq("id", user.id)
    .eq("approved", true)
    .maybeSingle();

  if (!data) return null;
  const row = data as StaffProfile & { approved: boolean };
  return { id: row.id, email: row.email, role: row.role };
}

/** Pastikan pengguna staff; jika tidak, alihkan ke login. */
export async function requireStaff(): Promise<StaffProfile> {
  const profile = await getStaffProfile();
  if (!profile) redirect("/admin/login");
  return profile;
}

/**
 * Pastikan pengguna ber-role admin (untuk aksi sensitif/destruktif).
 * Catatan: hanya pasang ini pada aksi yang memang ingin dibatasi ke admin,
 * karena profile default dibuat dengan role 'editor'. Bootstrap admin:
 *   update profiles set role='admin', approved=true where email='…';
 */
export async function requireAdmin(): Promise<StaffProfile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin");
  return profile;
}
