import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { getDictionaryQuality, type EntryIssue } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

const ISSUE_LABEL: Record<EntryIssue, string> = {
  no_meaning: "بلا معنى",
  no_root: "بلا جذر",
  no_examples: "بلا أمثلة",
  no_synonyms: "بلا مرادفات",
  no_morphology: "بلا صرف",
};

// Masalah serius (منشور بها مشكلة) ditandai merah; sisanya kuning.
const SEVERE: EntryIssue[] = ["no_meaning", "no_root"];

export default async function DictionaryQualityPage() {
  await requireStaff();
  const q = await getDictionaryQuality();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/dictionary">
          <ArrowRight className="size-4" />
          مراجعة المعجم
        </Link>
      </Button>
      <h1 className="mb-1 text-2xl font-bold">جودة المعجم</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        مؤشّرات نقص المداخل — أكمِلها لرفع جودة المحتوى المنشور.
      </p>

      {/* Ringkasan indikator */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QualityStat label="إجمالي المداخل" value={q.total} />
        <QualityStat
          label="منشورة بها نقص خطير"
          value={q.publishedWithIssues}
          accent={q.publishedWithIssues > 0}
        />
        <QualityStat label="بلا معنى" value={q.counts.no_meaning} accent={q.counts.no_meaning > 0} />
        <QualityStat label="بلا جذر" value={q.counts.no_root} accent={q.counts.no_root > 0} />
        <QualityStat label="بلا أمثلة" value={q.counts.no_examples} />
        <QualityStat label="بلا مرادفات" value={q.counts.no_synonyms} />
      </div>

      {/* Daftar entri bermasalah */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            مداخل بحاجة إلى استكمال
            <Badge variant="secondary">{q.flagged.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {q.flagged.length === 0 && (
            <p className="flex items-center gap-2 py-4 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              لا توجد مداخل ناقصة — أحسنت!
            </p>
          )}
          {q.flagged.map((e) => (
            <Link
              key={e.id}
              href={`/admin/dictionary/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-naskh text-lg">{e.lemma_ar}</span>
                <Badge
                  variant={e.status === "published" ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {e.status === "published" ? "منشور" : "مسوّدة"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {e.issues.map((it) => (
                  <Badge
                    key={it}
                    variant="outline"
                    className={
                      "text-[10px] " +
                      (SEVERE.includes(it)
                        ? "border-red-500/40 text-red-600 dark:text-red-400"
                        : "border-amber-500/40 text-amber-600 dark:text-amber-400")
                    }
                  >
                    {ISSUE_LABEL[it]}
                  </Badge>
                ))}
                <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Draft tertua */}
      {q.oldestDrafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-muted-foreground" />
              أقدم المسوّدات المنتظِرة
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {q.oldestDrafts.map((d) => (
              <Link
                key={d.id}
                href={`/admin/dictionary/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="font-naskh text-lg">{d.lemma_ar}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("ar")}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QualityStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (accent ? "border-red-500/30 bg-red-500/5" : "bg-card")
      }
    >
      <div
        className={
          "text-2xl font-bold " + (accent ? "text-red-600 dark:text-red-400" : "text-foreground")
        }
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
