import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  History,
  Languages,
  Lock,
  Plus,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/supabase/config";
import {
  getDictionaryStats,
  listLessons,
  listUnits,
  listVolumes,
} from "@/lib/data/admin";
import { getPublicAnalyze } from "@/lib/data/settings";
import { setPublicAnalyze } from "./actions";
import { LessonsManager } from "@/components/admin/lessons-manager";
import { StructureManager } from "@/components/admin/structure-manager";

export const dynamic = "force-dynamic";
// Pipeline ingest (Gemini) bisa berjalan lama; beri tenggang waktu lebih besar.
// Catatan: Vercel Hobby maksimum 60s; Pro hingga 300s. Pipeline kini resumable —
// bila tetap terpotong, klik "معالجة" lagi akan melanjutkan dari batch terakhir.
export const maxDuration = 300;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    ingest?: string;
    mode?: string;
    w?: string;
    t?: string;
    e?: string;
  }>;
}) {
  await requireStaff();
  const [sp, volumes, units, lessons, publicAnalyze, stats] = await Promise.all([
    searchParams,
    listVolumes(),
    listUnits(),
    listLessons(),
    getPublicAnalyze(),
    getDictionaryStats(),
  ]);
  const { ingest, mode } = sp;
  const recorded = Number(sp.w ?? "");
  const totalW = Number(sp.t ?? "");
  const newEntries = Number(sp.e ?? "");
  const hasCounts = Number.isFinite(recorded) && sp.w !== undefined;
  const geminiOK = isGeminiConfigured();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">إدارة المحتوى</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/admin/analytics">
              <BarChart3 className="size-4" />
              التحليلات
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href="/admin/audit">
              <History className="size-4" />
              السجلّ
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/dictionary">
              <Languages className="size-4" />
              مراجعة المعجم
              {stats.entriesDraft > 0 && (
                <Badge variant="secondary" className="ms-1">
                  {stats.entriesDraft}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link href="/admin/import">
              <Upload className="size-4" />
              استيراد جماعي
            </Link>
          </Button>
          <Button asChild className="gap-1.5">
            <Link href="/admin/lessons/new">
              <Plus className="size-4" />
              نصّ جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Ringkasan cepat */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="مداخل المعجم" value={stats.entriesTotal} />
        <StatCard
          label="مسوّدات تنتظر"
          value={stats.entriesDraft}
          accent={stats.entriesDraft > 0}
        />
        <StatCard label="الجذور" value={stats.roots} />
        <StatCard
          label="نصوص مُفهرسة"
          value={`${stats.lessonsIngested}/${stats.lessons}`}
        />
      </div>

      {!geminiOK && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-muted-foreground">
            <span className="text-foreground">GEMINI_API_KEY</span> غير مضبوط —
            المعالجة (استخراج الجذر وتوليد المعجم) معطّلة حتى تضبطه.
          </p>
        </div>
      )}

      {/*
        Kotak notifikasi hasil "معالجة"/"فهرسة": selalu beri tahu berapa kata
        yang tercatat — termasuk saat berhenti/gagal di tengah — agar admin
        tahu apa yang sudah berhasil disimpan, bukan sekadar "gagal".
      */}
      {ingest === "busy" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">توقّفت المعالجة مؤقّتًا</p>
            <p className="text-muted-foreground">
              خادم الذكاء الاصطناعي مزدحم حاليًّا (503).
              {hasCounts && Number.isFinite(totalW) && (
                <>
                  {" "}
                  تمّ تسجيل <span className="font-semibold text-foreground">{recorded}</span> من{" "}
                  <span className="font-semibold text-foreground">{totalW}</span> كلمة
                  {Number.isFinite(newEntries) && newEntries > 0 && (
                    <> (منها {newEntries} مدخلًا جديدًا)</>
                  )}
                  .
                </>
              )}{" "}
              التقدّم محفوظ — اضغط «معالجة» مرّةً أخرى لإكمال ما تبقّى من حيث توقّف.
            </p>
          </div>
        </div>
      )}
      {ingest === "failed" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">تعذّر إكمال المعالجة</p>
            <p className="text-muted-foreground">
              {hasCounts && Number.isFinite(totalW) ? (
                <>
                  تمّ تسجيل <span className="font-semibold text-foreground">{recorded}</span> من{" "}
                  <span className="font-semibold text-foreground">{totalW}</span> كلمة قبل التوقّف.
                  التقدّم محفوظ — اضغط «معالجة» للمتابعة، أو تحقّق من السجلّات.
                </>
              ) : (
                <>تعذّرت المعالجة. تحقّق من السجلّات وحاول مجدّدًا.</>
              )}
            </p>
          </div>
        </div>
      )}
      {ingest === "ok" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-4 text-sm">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-500" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {mode === "fast"
                ? "اكتملت الفهرسة السريعة"
                : mode === "quiz"
                  ? "تمّ توليد أسئلة الفهم"
                  : "اكتملت المعالجة بنجاح"}
            </p>
            {mode === "quiz" ? (
              <p className="text-muted-foreground">
                أُنشئت <span className="font-semibold text-foreground">{recorded}</span> أسئلةٍ
                لقياس فهم النصّ (منشورة مباشرةً).
              </p>
            ) : hasCounts && Number.isFinite(totalW) ? (
              <p className="text-muted-foreground">
                {mode === "fast" ? (
                  <>
                    طُوبِق <span className="font-semibold text-foreground">{recorded}</span> من{" "}
                    <span className="font-semibold text-foreground">{totalW}</span> كلمة مع المعجم.
                  </>
                ) : (
                  <>
                    حُلِّلت <span className="font-semibold text-foreground">{recorded}</span> كلمة
                    {Number.isFinite(newEntries) && newEntries > 0 && (
                      <>
                        ، وأُضيف <span className="font-semibold text-foreground">{newEntries}</span>{" "}
                        مدخلًا جديدًا (مسوّدة بانتظار المراجعة)
                      </>
                    )}
                    .
                  </>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground">تمّت العملية بنجاح.</p>
            )}
          </div>
        </div>
      )}

      {/* Pengaturan: analisis AI untuk publik */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-start gap-3">
            {publicAnalyze ? (
              <Users className="mt-0.5 size-5 shrink-0 text-primary" />
            ) : (
              <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                التحليل بالذكاء الاصطناعي:{" "}
                {publicAnalyze ? "متاح للجميع" : "للمشرفين فقط"}
              </p>
              <p className="text-xs text-muted-foreground">
                {publicAnalyze
                  ? "أي زائر يمكنه تحليل كلمة غير موجودة (تُحفظ كمسوّدة للمراجعة، بحدّ مُعدّل)."
                  : "زوّار الموقع لا يمكنهم استخدام التحليل؛ فعِّله ليساهموا في إثراء المعجم."}
              </p>
            </div>
          </div>
          <form action={setPublicAnalyze.bind(null, !publicAnalyze)}>
            <Button
              type="submit"
              variant={publicAnalyze ? "secondary" : "default"}
              size="sm"
              className="gap-1.5"
            >
              <Sparkles className="size-4" />
              {publicAnalyze ? "إغلاق للعامة" : "فتح للجميع"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lessons */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>النصوص</CardTitle>
        </CardHeader>
        <CardContent>
          <LessonsManager lessons={lessons} geminiOK={geminiOK} />
        </CardContent>
      </Card>

      <StructureManager volumes={volumes} units={units} />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (accent ? "border-primary/30 bg-primary/5" : "bg-card")
      }
    >
      <div
        className={
          "text-2xl font-bold " + (accent ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
