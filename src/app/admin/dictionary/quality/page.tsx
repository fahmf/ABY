import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshMeaningsButton } from "@/components/admin/refresh-meanings-button";
import { SubmitIconButton } from "@/components/admin/submit-icon-button";
import { requireStaff } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/supabase/config";
import {
  getDictionaryQuality,
  getMeaningRefreshProgress,
  type EntryIssue,
} from "@/lib/data/admin";
import { refreshMeaningsAction, resetMeaningRefreshAction } from "../../actions";

export const dynamic = "force-dynamic";
// Penyederhanaan makna memanggil Gemini per batch → bisa lama; beri tenggang.
export const maxDuration = 300;

const ISSUE_LABEL: Record<EntryIssue, string> = {
  no_meaning: "بلا معنى",
  no_root: "بلا جذر",
  no_examples: "بلا أمثلة",
  no_synonyms: "بلا مرادفات",
  no_morphology: "بلا صرف",
};

// Masalah serius (منشور بها مشكلة) ditandai merah; sisanya kuning.
const SEVERE: EntryIssue[] = ["no_meaning", "no_root"];

export default async function DictionaryQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ refresh?: string; ru?: string; rr?: string }>;
}) {
  await requireStaff();
  const [sp, q, refresh] = await Promise.all([
    searchParams,
    getDictionaryQuality(),
    getMeaningRefreshProgress(),
  ]);
  const geminiOK = isGeminiConfigured();
  const pct =
    refresh.total > 0
      ? Math.round((refresh.refreshed / refresh.total) * 100)
      : 0;

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

      {/* Notifikasi hasil penyederhanaan makna */}
      {sp.refresh === "ok" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          <p className="text-muted-foreground">
            اكتمل تبسيط المعاني لكلّ المداخل
            {sp.ru ? <> (حُدِّث {sp.ru} مدخلًا في هذه الجولة)</> : null}.
          </p>
        </div>
      )}
      {(sp.refresh === "busy" || sp.refresh === "failed") && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <p className="text-muted-foreground">
            {sp.refresh === "busy"
              ? "خادم الذكاء الاصطناعي مزدحم حاليًّا."
              : "توقّفت العملية قبل اكتمالها."}{" "}
            {sp.ru ? <>حُدِّث {sp.ru} مدخلًا</> : null}
            {sp.rr ? <> وتبقّى {sp.rr}</> : null}. التقدّم محفوظ — اضغط «متابعة»
            للإكمال من حيث توقّف.
          </p>
        </div>
      )}
      {sp.refresh === "reset" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            أُعيد تعيين كلّ المداخل لإعادة التبسيط من جديد.
          </p>
        </div>
      )}

      {/* Penyederhanaan makna massal (tabsîth) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            تبسيط المعاني للمبتدئين
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            يُعيد توليد المعنى والمرادفات والأمثلة لكلّ مدخل بأسلوب بسيط يفهمه
            المبتدئ (لا يغيّر الجذر ولا حالة النشر). العملية تدريجيّة وقابلة
            للاستئناف.
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {refresh.refreshed} / {refresh.total} مدخلًا مُبسَّط ({pct}%)
            {refresh.remaining > 0 && <> — تبقّى {refresh.remaining}</>}
          </p>
          {!geminiOK && (
            <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              GEMINI_API_KEY غير مضبوط — التبسيط معطّل.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <form action={refreshMeaningsAction}>
              <RefreshMeaningsButton
                disabled={!geminiOK || refresh.remaining === 0}
                label={
                  refresh.remaining === 0
                    ? "اكتمل التبسيط"
                    : refresh.refreshed > 0
                      ? "متابعة التبسيط"
                      : "ابدأ تبسيط المعاني"
                }
              />
            </form>
            {refresh.refreshed > 0 && (
              <form action={resetMeaningRefreshAction}>
                <SubmitIconButton title="إعادة تعيين (تبسيط الكلّ من جديد)">
                  <RotateCcw className="size-4" />
                </SubmitIconButton>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

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
