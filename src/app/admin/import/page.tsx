import Link from "next/link";
import { ArrowRight, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { listUnits } from "@/lib/data/admin";
import { bulkImportLessons } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const SAMPLE = `# الدرس الأول
هذا نصّ الدرس الأول…
---
# الدرس الثاني
هذا نصّ الدرس الثاني…`;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  await requireStaff();
  const [sp, units] = await Promise.all([searchParams, listUnits()]);
  const done = Number(sp.done ?? "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin">
          <ArrowRight className="size-4" />
          لوحة الإدارة
        </Link>
      </Button>

      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
        <Upload className="size-6 text-primary" />
        استيراد جماعي للنصوص
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        ألصِق عدّة نصوص دفعةً واحدة. ابدأ كلّ نصّ بسطر عنوان يبدأ بـ
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5">#</code>، وافصل بين
        النصوص بسطر <code className="mx-1 rounded bg-muted px-1.5 py-0.5">---</code>.
      </p>

      {Number.isFinite(done) && sp.done !== undefined && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-3 text-sm">
          <Sparkles className="size-4 text-emerald-500" />
          تمّ استيراد <span className="font-semibold">{done}</span> نصًّا. يمكنك
          الآن فهرستها من لوحة الإدارة.
        </div>
      )}

      {units.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            أضِف وحدةً أولًا من لوحة الإدارة قبل الاستيراد.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>نصوص جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={bulkImportLessons} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="unit_id">الوحدة</Label>
                  <select id="unit_id" name="unit_id" required className={field}>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.volumeTitle} — {u.title_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status">الحالة عند الإنشاء</Label>
                  <select id="status" name="status" className={field}>
                    <option value="draft">مسوّدة</option>
                    <option value="published">منشور</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk">النصوص</Label>
                <textarea
                  id="bulk"
                  name="bulk"
                  required
                  dir="rtl"
                  rows={16}
                  placeholder={SAMPLE}
                  className="font-naskh w-full rounded-md border bg-background p-3 text-base leading-loose outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <Button type="submit" className="gap-1.5 self-start">
                <Upload className="size-4" />
                استيراد
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
