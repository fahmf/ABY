"use client";

import * as React from "react";
import { BookText, ListChecks } from "lucide-react";

import { LessonQuiz } from "./lesson-quiz";
import { ComprehensionQuiz } from "./comprehension-quiz";
import type { VocabItem, ComprehensionQuestion } from "@/lib/data/repository";

type Tab = "vocab" | "comprehension";

/**
 * Pembungkus dua jenis penilaian: kuis kosakata (المفردات) & soal pemahaman
 * (الفهم). Bila hanya satu jenis tersedia, tab disembunyikan dan jenis itu
 * langsung ditampilkan.
 */
export function LessonAssessment({
  vocab,
  questions,
  lessonSlug,
}: {
  vocab: VocabItem[];
  questions: ComprehensionQuestion[];
  lessonSlug: string;
}) {
  const hasVocab = vocab.length >= 4;
  const hasComprehension = questions.length > 0;
  const [tab, setTab] = React.useState<Tab>(
    hasComprehension && !hasVocab ? "comprehension" : "vocab"
  );

  const showTabs = hasVocab && hasComprehension;

  return (
    <div>
      {showTabs && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
          <TabButton
            active={tab === "vocab"}
            onClick={() => setTab("vocab")}
            icon={<BookText className="size-4" />}
            label="المفردات"
          />
          <TabButton
            active={tab === "comprehension"}
            onClick={() => setTab("comprehension")}
            icon={<ListChecks className="size-4" />}
            label="الفهم"
          />
        </div>
      )}

      {tab === "vocab" ? (
        <LessonQuiz vocab={vocab} lessonSlug={lessonSlug} />
      ) : (
        <ComprehensionQuiz questions={questions} lessonSlug={lessonSlug} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      {label}
    </button>
  );
}
