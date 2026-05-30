import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStaffProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const profile = await getStaffProfile();
    if (profile) redirect("/admin");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">لوحة التحكّم</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        تسجيل الدخول للمحرّرين والمشرفين.
      </p>

      {isSupabaseConfigured() ? (
        <Card>
          <CardHeader>
            <CardTitle>تسجيل الدخول</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              لم تُضبَط بيئة Supabase بعد. أضِف المتغيّرات في{" "}
              <code className="text-foreground">.env.local</code> ثم أعِد
              التشغيل لتفعيل تسجيل الدخول.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
