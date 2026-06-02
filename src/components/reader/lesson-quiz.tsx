"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { learner } from "@/lib/learner/store";
import type { VocabItem } from "@/lib/data/repository";

type Question = {
  word: VocabItem;
  options: string[]; // makna; salah satunya benar
  answer: number;
};

const MAX_Q = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(vocab: VocabItem[]): Question[] {
  const pool = shuffle(vocab).slice(0, MAX_Q);
  return pool.map((word) => {
    const distractors = shuffle(
      vocab.filter((v) => v.meaning_ar !== word.meaning_ar)
    )
      .slice(0, 3)
      .map((v) => v.meaning_ar);
    const options = shuffle([word.meaning_ar, ...distractors]);
    return { word, options, answer: options.indexOf(word.meaning_ar) };
  });
}

export function LessonQuiz({
  vocab,
  lessonSlug,
}: {
  vocab: VocabItem[];
  lessonSlug: string;
}) {
  const [questions, setQuestions] = React.useState<Question[]>(() =>
    buildQuiz(vocab)
  );
  const [index, setIndex] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [wrong, setWrong] = React.useState<VocabItem[]>([]);
  const [done, setDone] = React.useState(false);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const q = questions[index];
    if (i === q.answer) setScore((s) => s + 1);
    else setWrong((w) => [...w, q.word]);
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
    setQuestions(buildQuiz(vocab));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
    setDone(false);
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
          {wrong.length > 0 && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                for (const w of wrong)
                  learner.save({
                    lemma: w.lemma_ar,
                    root: w.root_ar,
                    meaning: w.meaning_ar,
                    addedAt: Date.now(),
                  });
              }}
            >
              <Bookmark className="size-4" />
              احفظ ما أخطأتُ فيه ({wrong.length}) للمراجعة
            </Button>
          )}
          <div className="flex gap-2">
            <Button onClick={restart} variant="outline" className="gap-1.5">
              <RotateCcw className="size-4" />
              أعِد الاختبار
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
          <span className="text-xs text-muted-foreground">ما معنى:</span>
          <span className="font-naskh text-4xl">{q.word.lemma_ar}</span>
          {q.word.root_ar && (
            <Badge variant="secondary" className="mt-1">
              الجذر: {q.word.root_ar}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const isPicked = i === picked;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => pick(i)}
              className={
                "flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors " +
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

      {picked !== null && (
        <Button onClick={next} className="mt-4 w-full gap-1.5" size="lg">
          {index + 1 >= questions.length ? "إنهاء" : "التالي"}
        </Button>
      )}
    </div>
  );
}
