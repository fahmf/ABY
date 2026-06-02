"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Minus,
  Plus,
  BookOpen,
  Book,
  CheckCircle2,
  Circle,
  GraduationCap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { stripDiacritics, tokenize } from "@/lib/arabic";
import { useLearner, learner } from "@/lib/learner/store";
import { DictionaryPanel } from "./dictionary-panel";

const FONT_STEPS = [
  "text-xl leading-[2.6] sm:text-2xl sm:leading-[2.8]",
  "text-2xl leading-[2.6] sm:text-3xl sm:leading-[2.8]",
  "text-3xl leading-[2.7] sm:text-4xl sm:leading-[2.9]",
  "text-4xl leading-[2.8] sm:text-5xl sm:leading-[3]",
];

export type LessonMeta = {
  slug: string;
  title: string;
  volume: number;
  unitSlug: string;
};

export function ReaderText({
  text,
  dictMatches,
  lesson,
  isStaff = false,
}: {
  text: string;
  dictMatches?: Record<number, string>;
  lesson?: LessonMeta;
  isStaff?: boolean;
}) {
  const [showHarakat, setShowHarakat] = React.useState(true);
  const [showDictMatches, setShowDictMatches] = React.useState(true);
  const [fontStep, setFontStep] = React.useState(1);
  const learnerState = useLearner();
  const knownLemmas = learnerState.known;
  const done = lesson ? !!learnerState.progress[lesson.slug]?.done : false;
  const [selected, setSelected] = React.useState<{
    surface: string;
    lemma?: string;
  } | null>(null);
  const [highlighted, setHighlighted] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLParagraphElement>(null);

  const segments = React.useMemo(() => tokenize(text), [text]);

  // Muat preferensi baca dari localStorage.
  React.useEffect(() => {
    const h = localStorage.getItem("aby:harakat");
    const d = localStorage.getItem("aby:showDictMatches");
    const f = localStorage.getItem("aby:fontStep");
    const t = setTimeout(() => {
      if (h !== null) setShowHarakat(h === "1");
      if (d !== null) setShowDictMatches(d === "1");
      if (f !== null) setFontStep(Number(f));
    }, 0);
    return () => clearTimeout(t);
  }, []);
  React.useEffect(() => {
    localStorage.setItem("aby:harakat", showHarakat ? "1" : "0");
  }, [showHarakat]);
  React.useEffect(() => {
    localStorage.setItem("aby:showDictMatches", showDictMatches ? "1" : "0");
  }, [showDictMatches]);
  React.useEffect(() => {
    localStorage.setItem("aby:fontStep", String(fontStep));
  }, [fontStep]);

  // Catat kemajuan membaca saat membuka pelajaran (untuk "تابع القراءة").
  React.useEffect(() => {
    if (!lesson) return;
    const m = window.location.hash.match(/^#t=(\d+)$/);
    learner.setProgress({
      slug: lesson.slug,
      title: lesson.title,
      volume: lesson.volume,
      unitSlug: lesson.unitSlug,
      position: m ? Number(m[1]) : 0,
    });
  }, [lesson]);

  // Deep-link: #t=<position> → scroll + sorot token, lalu redam setelah jeda.
  React.useEffect(() => {
    const applyHash = () => {
      const m = window.location.hash.match(/^#t=(\d+)$/);
      if (!m) return;
      const pos = Number(m[1]);
      setHighlighted(pos);
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-token="${pos}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = window.setTimeout(() => setHighlighted(null), 2600);
      return () => window.clearTimeout(timer);
    };
    const cleanup = applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      cleanup?.();
    };
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="تصغير الخط"
            disabled={fontStep === 0}
            onClick={() => setFontStep((s) => Math.max(0, s - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="تكبير الخط"
            disabled={fontStep === FONT_STEPS.length - 1}
            onClick={() =>
              setFontStep((s) => Math.min(FONT_STEPS.length - 1, s + 1))
            }
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {dictMatches && Object.keys(dictMatches).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowDictMatches((v) => !v)}
            >
              {showDictMatches ? (
                <Book className="size-3.5" />
              ) : (
                <BookOpen className="size-3.5" />
              )}
              {showDictMatches ? "إخفاء كلمات المعجم" : "تحديد كلمات المعجم"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowHarakat((v) => !v)}
          >
            {showHarakat ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {showHarakat ? "إخفاء التشكيل" : "إظهار التشكيل"}
          </Button>
        </div>
      </div>

      <p
        ref={containerRef}
        className={`font-naskh ${FONT_STEPS[fontStep]}`}
      >
        {segments.map((seg, i) => {
          if (seg.type === "sep") {
            return <span key={i}>{seg.text}</span>;
          }
          const display = showHarakat ? seg.text : stripDiacritics(seg.text);
          const isActive = selected !== null && selected.surface === seg.text;
          const isHighlighted = highlighted === seg.index;
          const matchLemma = dictMatches?.[seg.index];
          const isDictMatch = !!matchLemma;
          const isKnown = !!matchLemma && !!knownLemmas[matchLemma];

          const open = () => {
            setSelected({ surface: seg.text, lemma: matchLemma });
            if (lesson) {
              learner.setProgress({
                slug: lesson.slug,
                title: lesson.title,
                volume: lesson.volume,
                unitSlug: lesson.unitSlug,
                position: seg.index,
              });
            }
          };

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              data-token={seg.index}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open();
                }
              }}
              className={
                "cursor-pointer rounded-md px-0.5 transition-colors hover:bg-accent " +
                (isActive ? "bg-primary/15 text-primary " : "") +
                (isHighlighted
                  ? "bg-amber-300/60 dark:bg-amber-400/30 ring-2 ring-amber-400/50 "
                  : "") +
                // Kata yang sudah dikuasai diredupkan agar kata baru menonjol.
                (isKnown && !isActive ? "text-muted-foreground/50 " : "") +
                (isDictMatch && showDictMatches && !isActive && !isKnown
                  ? "border-b border-dashed border-primary/60 pb-[2px] "
                  : "")
              }
            >
              {display}
            </span>
          );
        })}
      </p>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="bottom" className="pb-2">
          {selected && (
            <DictionaryPanel
              surface={selected.surface}
              lemma={selected.lemma}
              lessonSlug={lesson?.slug}
              isStaff={isStaff}
            />
          )}
        </SheetContent>
      </Sheet>

      {lesson && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button
            variant={done ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => learner.setDone(lesson.slug, !done)}
          >
            {done ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <Circle className="size-4" />
            )}
            {done ? "تمّت قراءته" : "وضع علامة: تمّت القراءة"}
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/baca/${lesson.slug}/ikhtibar`}>
              <GraduationCap className="size-4" />
              اختبر نفسك
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
