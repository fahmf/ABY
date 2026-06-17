"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark,
  GraduationCap,
  Hash,
  Layers,
  Minus,
  Plus,
  StickyNote,
  Trash2,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudyStats } from "@/components/learner/study-stats";
import { WordNote, HIGHLIGHT_BG } from "@/components/learner/word-note";
import {
  useLearner,
  learner,
  dueCards,
  type SavedWord,
  type HighlightColor,
} from "@/lib/learner/store";
import { speak, useSpeechSupported } from "@/lib/learner/speech";

type Filter = "all" | "learning" | "known";

export default function MufradatiPage() {
  const state = useLearner();
  const [filter, setFilter] = React.useState<Filter>("all");
  const canSpeak = useSpeechSupported();

  const all = Object.values(state.saved).sort((a, b) => b.addedAt - a.addedAt);
  const due = dueCards(state).length;
  const known = all.filter((w) => state.known[w.lemma]);
  const learning = all.filter((w) => !state.known[w.lemma]);

  const list: SavedWord[] =
    filter === "known" ? known : filter === "learning" ? learning : all;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bookmark className="size-6 text-primary" />
            مفرداتي
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كلماتك المحفوظة للمراجعة والحفظ.
          </p>
        </div>
        {learning.length > 0 && (
          <Button asChild className="gap-1.5">
            <Link href="/mufradati/muraja3a">
              <Layers className="size-4" />
              ابدأ المراجعة
              {due > 0 && (
                <Badge variant="secondary" className="ms-1">
                  {due}
                </Badge>
              )}
            </Link>
          </Button>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <StudyStats />
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
          <span className="text-sm font-medium">الهدف اليومي للمراجعة</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="إنقاص الهدف"
              disabled={state.goal <= 5}
              onClick={() => learner.setGoal(state.goal - 5)}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-10 text-center text-lg font-bold tabular-nums">
              {state.goal}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="زيادة الهدف"
              onClick={() => learner.setGoal(state.goal + 5)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter + ringkasan */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          الكل ({all.length})
        </FilterTab>
        <FilterTab
          active={filter === "learning"}
          onClick={() => setFilter("learning")}
        >
          قيد الحفظ ({learning.length})
        </FilterTab>
        <FilterTab
          active={filter === "known"}
          onClick={() => setFilter("known")}
        >
          أتقنتها ({known.length})
        </FilterTab>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "لم تحفظ كلماتٍ بعد. اقرأ نصًّا وانقر أي كلمة، ثم اضغط «حفظ»."
              : "لا كلمات في هذا التصنيف."}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((w) => (
            <WordRow
              key={w.lemma}
              word={w}
              isKnown={!!state.known[w.lemma]}
              note={state.notes[w.lemma]}
              highlight={state.highlights[w.lemma] as HighlightColor | undefined}
              canSpeak={canSpeak}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WordRow({
  word: w,
  isKnown,
  note,
  highlight,
  canSpeak,
}: {
  word: SavedWord;
  isKnown: boolean;
  note?: string;
  highlight?: HighlightColor;
  canSpeak: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {highlight && (
              <span
                className={`size-3 rounded-full ${HIGHLIGHT_BG[highlight]}`}
                aria-hidden
              />
            )}
            <span className="font-naskh text-xl">{w.lemma}</span>
            {w.root && (
              <Badge variant="secondary" className="gap-1">
                <Hash className="size-3" />
                {w.root}
              </Badge>
            )}
            {isKnown && (
              <Badge variant="outline" className="text-primary">
                أتقنتها
              </Badge>
            )}
          </div>
          {w.meaning && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {w.meaning}
            </p>
          )}
          {note && !editing && (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-foreground/80">
              <StickyNote className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canSpeak && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="نطق"
              onClick={() => speak(w.surface || w.lemma)}
            >
              <Volume2 className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="ملاحظة وتظليل"
            title="ملاحظة وتظليل"
            aria-pressed={editing}
            onClick={() => setEditing((v) => !v)}
          >
            <StickyNote
              className={note || highlight ? "size-4 text-primary" : "size-4"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="أتقنتها"
            title="أتقنتها"
            onClick={() => learner.toggleKnown(w.lemma)}
          >
            <GraduationCap
              className={isKnown ? "size-4 text-primary" : "size-4"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="حذف"
            className="text-destructive"
            onClick={() => learner.remove(w.lemma)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-3">
          <WordNote lemma={w.lemma} />
        </div>
      )}
    </li>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-sm transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}
