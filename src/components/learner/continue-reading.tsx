"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearner, recentProgress } from "@/lib/learner/store";

/** "تابع القراءة" — pelajaran terakhir yang dibaca (dari localStorage). */
export function ContinueReading() {
  const state = useLearner();
  const items = recentProgress(state).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookOpen className="size-4" />
        تابع القراءة
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={p.position ? `/baca/${p.slug}#t=${p.position}` : `/baca/${p.slug}`}
            className="group"
          >
            <Card className="h-full py-4 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/5">
              <CardHeader className="px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate font-naskh text-lg">
                    {p.title}
                  </CardTitle>
                  {p.done && (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  )}
                </div>
                <span className="flex items-center gap-1 text-sm text-primary">
                  {p.done ? "إعادة القراءة" : "متابعة"}
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                </span>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
