"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  setLessonStatus,
  deleteLesson,
  bulkSetLessonStatus,
  moveLesson,
  ingestLessonAction,
  fastIndexAction,
  generateQuestionsAction,
} from "@/app/admin/actions";

export type ManagedLesson = {
  id: string;
  title_ar: string;
  slug: string;
  unitTitle: string;
  status: "draft" | "published";
};

export function LessonsManager({
  lessons,
  geminiOK,
}: {
  lessons: ManagedLesson[];
  geminiOK: boolean;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === lessons.length
        ? new Set()
        : new Set(lessons.map((l) => l.id))
    );
  }

  function bulk(status: "draft" | "published") {
    const ids = [...selected];
    startTransition(async () => {
      await bulkSetLessonStatus(ids, status);
      setSelected(new Set());
    });
  }

  if (lessons.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد نصوص بعد.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* شريط الإجراءات الجماعية */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={selected.size === lessons.length && lessons.length > 0}
            onChange={toggleAll}
          />
          تحديد الكل
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selected.size} محدّد
            </span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={pending}
              onClick={() => bulk("published")}
            >
              <Eye className="size-3.5" />
              نشر المحدّد
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={pending}
              onClick={() => bulk("draft")}
            >
              <EyeOff className="size-3.5" />
              إخفاء المحدّد
            </Button>
          </div>
        )}
      </div>

      {lessons.map((l, i) => {
        const rowBusy = busyId === l.id;
        const runAction = (fn: () => Promise<unknown>) => {
          setBusyId(l.id);
          startTransition(async () => {
            await fn();
            setBusyId(null);
          });
        };
        return (
          <div
            key={l.id}
            className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                checked={selected.has(l.id)}
                onChange={() => toggle(l.id)}
                aria-label={`تحديد ${l.title_ar}`}
              />
              <div className="min-w-0">
                <p className="truncate font-naskh text-lg">{l.title_ar}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.unitTitle}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:gap-2">
              <Badge variant={l.status === "published" ? "default" : "secondary"}>
                {l.status === "published" ? "منشور" : "مسوّدة"}
              </Badge>

              {/* ترتيب */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  title="أعلى"
                  disabled={i === 0 || pending}
                  onClick={() => runAction(() => moveLesson(l.id, "up"))}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="أسفل"
                  disabled={i === lessons.length - 1 || pending}
                  onClick={() => runAction(() => moveLesson(l.id, "down"))}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                title={l.status === "published" ? "إلغاء النشر" : "نشر"}
                disabled={pending}
                onClick={() =>
                  runAction(() =>
                    setLessonStatus(
                      l.id,
                      l.status === "published" ? "draft" : "published"
                    )
                  )
                }
              >
                {l.status === "published" ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="فهرسة سريعة (بلا ذكاء اصطناعي)"
                disabled={pending}
                onClick={() => runAction(() => fastIndexAction(l.id))}
              >
                {rowBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="معالجة بالذكاء الاصطناعي"
                disabled={pending || !geminiOK}
                onClick={() => runAction(() => ingestLessonAction(l.id))}
              >
                <Sparkles className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="توليد أسئلة الفهم"
                disabled={pending || !geminiOK}
                onClick={() => runAction(() => generateQuestionsAction(l.id))}
              >
                <HelpCircle className="size-4" />
              </Button>

              <Button asChild variant="ghost" size="icon" title="معاينة">
                <Link href={`/baca/${l.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                </Link>
              </Button>

              <Button asChild variant="ghost" size="icon" title="تعديل">
                <Link href={`/admin/lessons/${l.id}`}>
                  <Pencil className="size-4" />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                title="حذف"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  if (confirm(`حذف «${l.title_ar}»؟`))
                    runAction(() => deleteLesson(l.id));
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
