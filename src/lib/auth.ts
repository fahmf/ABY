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
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle();

  return (data as StaffProfile | null) ?? null;
}

/** Pastikan pengguna staff; jika tidak, alihkan ke login. */
export async function requireStaff(): Promise<StaffProfile> {
  const profile = await getStaffProfile();
  if (!profile) redirect("/admin/login");
  return profile;
}
