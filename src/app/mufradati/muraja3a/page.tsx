"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  Layers,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useLearner,
  learner,
  dueCards,
  learningWords,
  type SavedWord,
} from "@/lib/learner/store";
import { speak, useSpeechSupported } from "@/lib/learner/speech";

type Phase = "idle" | "review" | "done";

export default function ReviewPage() {
  const state = useLearner();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [session, setSession] = React.useState<SavedWord[]>([]);
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [stats, setStats] = React.useState({ good: 0, again: 0 });
  const canSpeak = useSpeechSupported();

  const dueCount = dueCards(state).length;
  const learningCount = learningWords(state).length;

  function start() {
    const due = dueCards(state);
    const pool = due.length > 0 ? due : learningWords(state);
    if (pool.length === 0) return;
    setSession(pool);
    setIndex(0);
    setRevealed(false);
    setStats({ good: 0, again: 0 });
    setPhase("review");
  }

  function grade(g: "good" | "again") {
    const card = session[index];
    if (card) learner.review(card.lemma, g);
    setStats((s) => ({
      good: s.good + (g === "good" ? 1 : 0),
      again: s.again + (g === "again" ? 1 : 0),
    }));
    if (index + 1 >= session.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  // ---------- idle ----------
  if (phase === "idle") {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Layers className="size-10 text-primary" />
            {learningCount === 0 ? (
              <>
                <p className="text-muted-foreground">
                  لا كلمات للمراجعة بعد. احفظ كلماتٍ من النصوص أولًا.
                </p>
                <Button asChild variant="outline">
                  <Link href="/mufradati">العودة إلى مفرداتي</Link>
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-lg font-medium">
                    {dueCount > 0
                      ? `${dueCount} بطاقة جاهزة للمراجعة`
                      : "لا بطاقات مستحقّة الآن"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dueCount > 0
                      ? "راجِعها لتثبيتها في ذاكرتك."
                      : `يمكنك مراجعة كل كلماتك (${learningCount}) على أي حال.`}
                  </p>
                </div>
                <Button onClick={start} size="lg" className="gap-1.5">
                  <Layers className="size-4" />
                  ابدأ المراجعة
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---------- done ----------
  if (phase === "done") {
    return (
      <Shell>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Check className="size-10 text-primary" />
            <p className="text-lg font-medium">انتهت الجلسة!</p>
            <div className="flex gap-4 text-sm">
              <span className="text-primary">عرفتُها: {stats.good}</span>
              <span className="text-muted-foreground">أعِدها: {stats.again}</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPhase("idle")} variant="outline" className="gap-1.5">
                <RotateCcw className="size-4" />
                جلسة أخرى
              </Button>
              <Button asChild className="gap-1.5">
                <Link href="/mufradati">
                  <ArrowRight className="size-4" />
                  مفرداتي
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ---------- review ----------
  const card = session[index];
  const progress = ((index + (revealed ? 0.5 : 0)) / session.length) * 100;

  return (
    <Shell>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mb-3 text-center text-xs text-muted-foreground">
        {index + 1} / {session.length}
      </p>

      <Card className="min-h-64">
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="flex items-center gap-2">
            <span className="font-naskh text-4xl sm:text-5xl">{card.lemma}</span>
            {canSpeak && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="نطق"
                onClick={() => speak(card.surface || card.lemma)}
              >
                <Volume2 className="size-5" />
              </Button>
            )}
          </div>
          {card.root && (
            <Badge variant="secondary">الجذر: {card.root}</Badge>
          )}
          {revealed ? (
            <p className="max-w-md text-balance text-lg text-muted-foreground">
              {card.meaning || "—"}
            </p>
          ) : (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setRevealed(true)}
            >
              <Eye className="size-4" />
              أظهر المعنى
            </Button>
          )}
        </CardContent>
      </Card>

      {revealed && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-1.5"
            onClick={() => grade("again")}
          >
            <X className="size-4 text-destructive" />
            لم أتذكّر
          </Button>
          <Button size="lg" className="gap-1.5" onClick={() => grade("good")}>
            <Check className="size-4" />
            عرفتُها
          </Button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/mufradati">
          <ArrowRight className="size-4" />
          مفرداتي
        </Link>
      </Button>
      {children}
    </div>
  );
}
