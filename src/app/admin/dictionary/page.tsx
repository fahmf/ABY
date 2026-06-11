import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { listDictionaryEntries } from "@/lib/data/admin";
import { DictionaryList } from "./dictionary-list";

export const dynamic = "force-dynamic";

export default async function DictionaryQueue() {
  await requireStaff();
  const entries = await listDictionaryEntries();
  const drafts = entries.filter((e) => e.status === "draft");
  const published = entries.filter((e) => e.status === "published");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin">
            <ArrowRight className="size-4" />
            لوحة التحكّم
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/admin/dictionary/quality">
            <BarChart3 className="size-4" />
            جودة المعجم
          </Link>
        </Button>
      </div>
      <h1 className="mb-1 text-2xl font-bold">مراجعة المعجم</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        راجِع المداخل التي ولّدها الذكاء الاصطناعي ثم انشُرها.
      </p>

      <DictionaryList drafts={drafts} published={published} />
    </div>
  );
}
