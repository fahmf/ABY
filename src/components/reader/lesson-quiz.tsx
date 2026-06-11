"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check, RotateCcw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { learner } from "@/lib/learner/store";
import type { VocabItem } from "@/lib/data/repository";

export type QType = "meaning" | "reverse" | "root";

export type Question = {
  type: QType;
  word: VocabItem; // kata sumber (untuk simpan jawaban salah)
  promptLabel: string; // instruksi: "ما معنى" / "أيُّ كلمةٍ تعني" / "ما جذر"
  prompt: string; // yang ditampilkan besar
  rootBadge?: string; // tampil sbg badge akar (soal berbasis kata)
  options: string[]; // pilihan; salah satunya benar
  answer: number;
  optionFont: "naskh" | "default"; // pilihan kata/akar pakai naskh
};

const MAX_Q = 10;

const TYPE_LABEL: Record<QType, string> = {
  meaning: "معنى",
  reverse: "كلمة",
  root: "جذر",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ambil hingga n nilai unik dari pool, kecuali `exclude`. */
function distinct(pool: string[], exclude: string, n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>([exclude]);
  for (const v of shuffle(pool)) {
    if (out.length >= n) break;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Bangun kuis campuran dari kosakata pelajaran. Tipe soal dipilih per-kata
 * sesuai ketersediaan pengecoh (distractor) agar selalu ada 4 pilihan unik:
 *  - meaning : tampilkan الكلمة → pilih المعنى
 *  - reverse : tampilkan المعنى → pilih الكلمة
 *  - root    : tampilkan الكلمة → pilih الجذر (butuh ≥4 جذور مختلفة)
 */
export function buildQuiz(vocab: VocabItem[]): Question[] {
  const meanings = vocab.map((v) => v.meaning_ar).filter(Boolean);
  const lemmas = vocab.map((v) => v.lemma_ar).filter(Boolean);
  const roots = [...new Set(vocab.map((v) => v.root_ar).filter(Boolean))];

  const pool = shuffle(vocab).slice(0, MAX_Q);
  const questions: Question[] = [];

  for (const word of pool) {
    const feasible: QType[] = [];
    if (distinct(meanings, word.meaning_ar, 3).length === 3) feasible.push("meaning");
    if (distinct(lemmas, word.lemma_ar, 3).length === 3) feasible.push("reverse");
    if (
      word.root_ar &&
      roots.filter((r) => r !== word.root_ar).length >= 3
    )
      feasible.push("root");

    if (feasible.length === 0) continue;
    const type = feasible[Math.floor(Math.random() * feasible.length)];

    if (type === "meaning") {
      const options = shuffle([word.meaning_ar, ...distinct(meanings, word.meaning_ar, 3)]);
      questions.push({
        type,
        word,
        promptLabel: "ما معنى",
        prompt: word.lemma_ar,
        rootBadge: word.root_ar || undefined,
        options,
        answer: options.indexOf(word.meaning_ar),
        optionFont: "default",
      });
    } else if (type === "reverse") {
      const options = shuffle([word.lemma_ar, ...distinct(lemmas, word.lemma_ar, 3)]);
      questions.push({
        type,
        word,
        promptLabel: "أيُّ كلمةٍ تعني",
        prompt: word.meaning_ar,
        options,
        answer: options.indexOf(word.lemma_ar),
        optionFont: "naskh",
      });
    } else {
      const distractRoots = distinct(
        roots.filter((r) => r !== word.root_ar),
        word.root_ar,
        3
      );
      const options = shuffle([word.root_ar, ...distractRoots]);
      questions.push({
        type,
        word,
        promptLabel: "ما جذر",
        prompt: word.lemma_ar,
        options,
        answer: options.indexOf(word.root_ar),
        optionFont: "naskh",
      });
    }
  }
  return questions;
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
  const [saved, setSaved] = React.useState(false);
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
    setSaved(false);
    setDone(false);
  }

  // Kuis bisa kosong bila kosakata tak cukup variatif untuk membuat pengecoh.
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          لا توجد كلماتٌ كافية ومتنوّعة في هذا النصّ لإنشاء اختبار بعد.
        </CardContent>
      </Card>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    // Saring duplikat kata yang salah (kata bisa muncul di lebih dari soal).
    const wrongUnique = [...new Map(wrong.map((w) => [w.lemma_ar, w])).values()];
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="text-4xl font-bold text-primary">{pct}%</div>
          <p className="text-muted-foreground">
            أجبتَ بشكل صحيح عن {score} من {questions.length}.
          </p>
          {wrongUnique.length > 0 && (
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={saved}
              onClick={() => {
                for (const w of wrongUnique)
                  learner.save({
                    lemma: w.lemma_ar,
                    root: w.root_ar,
                    meaning: w.meaning_ar,
                    addedAt: Date.now(),
                  });
                setSaved(true);
              }}
            >
              {saved ? <Check className="size-4" /> : <Bookmark className="size-4" />}
              {saved
                ? `حُفِظت (${wrongUnique.length}) للمراجعة`
                : `احفظ ما أخطأتُ فيه (${wrongUnique.length}) للمراجعة`}
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
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABEL[q.type]}
            </Badge>
            {q.promptLabel}:
          </span>
          <span
            className={
              q.type === "reverse"
                ? "text-2xl leading-relaxed"
                : "font-naskh text-4xl"
            }
          >
            {q.prompt}
          </span>
          {q.rootBadge && (
            <Badge variant="secondary" className="mt-1">
              الجذر: {q.rootBadge}
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
                (q.optionFont === "naskh" ? "font-naskh text-lg " : "") +
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
