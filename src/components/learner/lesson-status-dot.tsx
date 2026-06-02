"use client";

import { CheckCircle2, Dot } from "lucide-react";

import { useLearner } from "@/lib/learner/store";

/** Penanda kecil status baca sebuah pelajaran (dari localStorage). */
export function LessonStatusDot({ slug }: { slug: string }) {
  const state = useLearner();
  const p = state.progress[slug];
  if (!p) return null;
  if (p.done) {
    return (
      <span title="تمّت قراءته" className="text-primary">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }
  return (
    <span title="قيد القراءة" className="text-muted-foreground">
      <Dot className="size-5" />
    </span>
  );
}
