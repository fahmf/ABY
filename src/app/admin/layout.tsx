import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getStaffProfile } from "@/lib/auth";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getStaffProfile();

  return (
    <div>
      {profile && (
        <div className="border-b bg-muted/30">
          <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <LayoutDashboard className="size-4" />
              لوحة التحكّم
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground" dir="ltr">
                {profile.email}
              </span>
              <form action={signOut}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LogOut className="size-4" />
                  خروج
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
