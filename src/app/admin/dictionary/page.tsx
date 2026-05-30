import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Hash, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { listDictionaryEntries } from "@/lib/data/admin";
import { setEntryStatus } from "../actions";

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

      <Section title={`مسوّدات (${drafts.length})`} entries={drafts} />
      <div className="h-6" />
      <Section title={`منشورة (${published.length})`} entries={published} />
    </div>
  );
}

function Section({
  title,
  entries,
}: {
  title: string;
  entries: Awaited<ReturnType<typeof listDictionaryEntries>>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">لا شيء هنا.</p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-naskh text-lg">{e.lemma_ar}</p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Hash className="size-3" />
                {e.root_ar || "—"} · {e.meaning_ar.slice(0, 40)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={e.status === "published" ? "default" : "secondary"}>
                {e.status === "published" ? "منشور" : "مسوّدة"}
              </Badge>
              <form
                action={setEntryStatus.bind(
                  null,
                  e.id,
                  e.status === "published" ? "draft" : "published"
                )}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  title={e.status === "published" ? "إلغاء النشر" : "نشر"}
                >
                  {e.status === "published" ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </form>
              <Button asChild variant="ghost" size="icon" title="تعديل">
                <Link href={`/admin/dictionary/${e.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
