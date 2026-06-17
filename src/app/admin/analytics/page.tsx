import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, MousePointerClick, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { getUsageStats, type UsageRow } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireStaff();
  const stats = await getUsageStats();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin">
          <ArrowRight className="size-4" />
          لوحة الإدارة
        </Link>
      </Button>

      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
        <BarChart3 className="size-6 text-primary" />
        تحليلات الاستخدام
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        تستند إلى أحدث الأحداث (نقر الكلمات، فتح النصوص، أخطاء الاختبارات). تساعدك
        على ترتيب أولويات مراجعة المعجم.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="نقرات الكلمات" value={stats.totalWords} />
        <Stat label="فتحات النصوص" value={stats.totalLessons} />
        <Stat label="كلمات صعبة" value={stats.hardWords.length} accent />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RankCard
          title="الأكثر بحثًا (كلمات)"
          icon={<MousePointerClick className="size-4" />}
          rows={stats.topWords}
          empty="لا بيانات بعد."
        />
        <RankCard
          title="الأكثر قراءةً (نصوص)"
          icon={<BookOpen className="size-4" />}
          rows={stats.topLessons}
          empty="لا بيانات بعد."
          mono
        />
        <RankCard
          title="الأصعب في الاختبارات"
          icon={<TriangleAlert className="size-4" />}
          rows={stats.hardWords}
          empty="لا أخطاء مسجّلة."
        />
      </div>
    </div>
  );
}

function Stat({
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
        (accent ? "border-primary/30 bg-primary/5" : "bg-card")
      }
    >
      <div className={"text-2xl font-bold " + (accent ? "text-primary" : "")}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RankCard({
  title,
  icon,
  rows,
  empty,
  mono = false,
}: {
  title: string;
  icon: React.ReactNode;
  rows: UsageRow[];
  empty: string;
  mono?: boolean;
}) {
  const max = rows.length > 0 ? rows[0].count : 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={mono ? "truncate text-xs" : "font-naskh"} dir={mono ? "ltr" : "rtl"}>
                    {r.key}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {r.count}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
