import Link from "next/link";
import { Home, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <SearchX className="mb-4 size-10 text-muted-foreground" />
      <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted-foreground">
        لم نعثر على ما تبحث عنه. ربما حُذف المحتوى أو تغيّر رابطه.
      </p>
      <Button asChild className="mt-6 gap-1.5">
        <Link href="/">
          <Home className="size-4" />
          العودة إلى الرئيسية
        </Link>
      </Button>
    </div>
  );
}
