"use client";

import * as React from "react";
import { Flame, Target } from "lucide-react";

import {
  useLearner,
  dueCards,
  streakDays,
  todayCount,
} from "@/lib/learner/store";

/**
 * Kartu ringkas motivasi belajar: streak hari berturut-turut + تقدّم الهدف
 * اليومي + بطاقات مستحقّة. Murni من بيانات المتصفّح (localStorage).
 * Tak menampilkan apa pun sebelum ada نشاط agar الصفحة الأولى تبقى نظيفة.
 */
export function StudyStats() {
  const state = useLearner();
  const streak = streakDays(state);
  const today = todayCount(state);
  const goal = state.goal;
  const due = dueCards(state).length;

  // Jangan tampilkan kartu kosong untuk pengguna yang belum mulai.
  const hasData =
    streak > 0 ||
    today > 0 ||
    due > 0 ||
    Object.keys(state.saved).length > 0;
  if (!hasData) return null;

  const pct = Math.min(100, Math.round((today / Math.max(1, goal)) * 100));
  const reached = today >= goal;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Flame className="size-5" />
        </span>
        <div>
          <div className="text-2xl font-bold leading-none">{streak}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            يوم متتالٍ
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <span
          className={
            "flex size-10 items-center justify-center rounded-lg " +
            (reached
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-primary/10 text-primary")
          }
        >
          <Target className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">الهدف اليومي</span>
            <span className="text-xs text-muted-foreground">
              {today}/{goal}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={
                "h-full rounded-full transition-all " +
                (reached ? "bg-emerald-500" : "bg-primary")
              }
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 text-lg font-bold">
          {due}
        </span>
        <div>
          <div className="text-sm font-medium leading-none">
            بطاقات للمراجعة
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {due > 0 ? "جاهزة الآن" : "لا شيء مستحقّ"}
          </div>
        </div>
      </div>
    </div>
  );
}
