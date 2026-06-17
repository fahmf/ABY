"use client";

import * as React from "react";
import { Check, Highlighter, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useLearner,
  learner,
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@/lib/learner/store";

// Kelas Tailwind statis per warna (agar tak terpangkas oleh JIT).
export const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  amber: "bg-amber-300/60 dark:bg-amber-400/30",
  emerald: "bg-emerald-300/60 dark:bg-emerald-400/30",
  sky: "bg-sky-300/60 dark:bg-sky-400/30",
  rose: "bg-rose-300/60 dark:bg-rose-400/30",
  violet: "bg-violet-300/60 dark:bg-violet-400/30",
};

const SWATCH: Record<HighlightColor, string> = {
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
};

/**
 * محرّر ملاحظة شخصية + اختيار لون التظليل لكلمة (lemma). يُخزَّن محليًّا.
 * Catatan disimpan saat blur / klik «حفظ». التظليل يظهر فورًا في القارئ.
 */
export function WordNote({ lemma }: { lemma: string }) {
  const state = useLearner();
  const note = state.notes[lemma] ?? "";
  const highlight = state.highlights[lemma] ?? null;
  const [draft, setDraft] = React.useState(note);
  const [saved, setSaved] = React.useState(false);

  // Selaraskan draft saat kata berubah (panel dipakai ulang antar كلمات) —
  // pola "تعديل الحالة أثناء الرسم" بدل useEffect لتفادي إعادة الرسم المتتالي.
  const [seenLemma, setSeenLemma] = React.useState(lemma);
  if (lemma !== seenLemma) {
    setSeenLemma(lemma);
    setDraft(note);
    setSaved(false);
  }

  function persist() {
    if (draft.trim() === note.trim()) return;
    learner.setNote(lemma, draft);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Highlighter className="size-3.5" />
        تظليل
        <div className="flex items-center gap-1.5">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`تظليل ${c}`}
              aria-pressed={highlight === c}
              onClick={() => learner.toggleHighlight(lemma, c)}
              className={
                "size-5 rounded-full ring-offset-2 ring-offset-background transition-all " +
                SWATCH[c] +
                (highlight === c ? " ring-2 ring-foreground/60" : " hover:scale-110")
              }
            />
          ))}
          {highlight && (
            <button
              type="button"
              onClick={() => learner.setHighlight(lemma, null)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              إزالة
            </button>
          )}
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <StickyNote className="size-3.5" />
        ملاحظتي
      </label>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        onBlur={persist}
        rows={2}
        placeholder="اكتب ملاحظةً تساعدك على التذكّر…"
        className="w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" /> حُفِظت
          </span>
        )}
        <Button type="button" size="sm" variant="outline" onClick={persist}>
          حفظ الملاحظة
        </Button>
      </div>
    </div>
  );
}
