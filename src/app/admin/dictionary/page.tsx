import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin">
          <ArrowRight className="size-4" />
          لوحة التحكّم
        </Link>
      </Button>
      <h1 className="mb-1 text-2xl font-bold">مراجعة المعجم</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        راجِع المداخل التي ولّدها الذكاء الاصطناعي ثم انشُرها.
      </p>

      <DictionaryList drafts={drafts} published={published} />
    </div>
  );
}
