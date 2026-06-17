import Link from "next/link";
import { ArrowRight, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { listActivity } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  publish: "نشر",
  unpublish: "إلغاء نشر",
  delete: "حذف",
  update: "تعديل",
  import: "استيراد",
};

const ENTITY_LABEL: Record<string, string> = {
  lesson: "نصّ",
  unit: "وحدة",
  volume: "جزء",
  dictionary: "معجم",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  const d = Math.floor(h / 24);
  return `قبل ${d} ي`;
}

export default async function AuditPage() {
  await requireStaff();
  const rows = await listActivity();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin">
          <ArrowRight className="size-4" />
          لوحة الإدارة
        </Link>
      </Button>

      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
        <History className="size-6 text-primary" />
        سجلّ النشاط
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        آخر تغييرات المحتوى: مَن فعل ماذا ومتى.
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا نشاط مسجّل بعد.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="secondary">
                  {ACTION_LABEL[r.action] ?? r.action}
                </Badge>
                <span className="text-muted-foreground">
                  {ENTITY_LABEL[r.entity] ?? r.entity}
                </span>
                {r.detail && (
                  <span className="truncate font-naskh">{r.detail}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {r.actor_email && (
                  <span className="hidden sm:inline" dir="ltr">
                    {r.actor_email}
                  </span>
                )}
                <span>{timeAgo(r.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
