"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ComprehensionQuestion } from "@/lib/data/repository";

const TYPE_LABEL: Record<ComprehensionQuestion["type"], string> = {
  mcq: "اختيار",
  truefalse: "صح أو خطأ",
};

/**
 * Kuis pemahaman isi teks. Soal sudah dibangun di server (Gemini) — komponen
 * ini hanya menjalankan alur jawab → reveal benar/salah + penjelasan → skor.
 */
export function ComprehensionQuiz({
  questions,
  lessonSlug,
}: {
  questions: ComprehensionQuestion[];
  lessonSlug: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [done, setDone] = React.useState(false);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[index].answer) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          لا توجد أسئلةُ فهمٍ لهذا النصّ بعد.
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="text-4xl font-bold text-primary">{pct}%</div>
          <p className="text-muted-foreground">
            أجبتَ بشكل صحيح عن {score} من {questions.length}.
          </p>
          <div className="flex gap-2">
            <Button onClick={restart} variant="outline" className="gap-1.5">
              <RotateCcw className="size-4" />
              أعِد الأسئلة
            </Button>
            <Button asChild className="gap-1.5">
              <Link href={`/baca/${lessonSlug}`}>
                <ArrowRight className="size-4" />
                عودة للنص
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const q = questions[index];
  const reveal = picked !== null;
  return (
    <div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>
      <p className="mb-3 text-center text-xs text-muted-foreground">
        {index + 1} / {questions.length}
      </p>

      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <Badge variant="outline" className="text-[10px]">
            {TYPE_LABEL[q.type]}
          </Badge>
          <span className="text-xl leading-relaxed">{q.prompt}</span>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => pick(i)}
              className={
                "flex items-center justify-between gap-2 rounded-lg border p-3 text-start text-lg transition-colors " +
                (!reveal
                  ? "hover:border-primary/40 hover:bg-accent "
                  : isCorrect
                    ? "border-emerald-500/50 bg-emerald-500/10 "
                    : isPicked
                      ? "border-red-500/50 bg-red-500/10 "
                      : "opacity-60 ")
              }
            >
              <span>{opt}</span>
              {reveal && isCorrect && (
                <Check className="size-4 shrink-0 text-emerald-600" />
              )}
              {reveal && isPicked && !isCorrect && (
                <X className="size-4 shrink-0 text-red-600" />
              )}
            </button>
          );
        })}
      </div>

      {reveal && q.explanation && (
        <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {q.explanation}
        </p>
      )}

      {reveal && (
        <Button onClick={next} className="mt-4 w-full gap-1.5" size="lg">
          {index + 1 >= questions.length ? "إنهاء" : "التالي"}
        </Button>
      )}
    </div>
  );
}
