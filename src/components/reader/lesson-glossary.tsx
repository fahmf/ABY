"use client";

import * as React from "react";
import { BookmarkCheck, BookmarkPlus, Hash, Printer, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLearner, learner } from "@/lib/learner/store";
import { speak, useSpeechSupported } from "@/lib/learner/speech";
import type { VocabItem } from "@/lib/data/repository";

/**
 * قائمة كلمات الدرس (مسرد) للمراجعة قبل/بعد القراءة: حفظ مفرد أو حفظ الكل
 * إلى «مفرداتي»، نطق، وطباعة/حفظ PDF. مبنيّ على المفردات المنشورة في النصّ.
 */
export function LessonGlossary({ vocab }: { vocab: VocabItem[] }) {
  const state = useLearner();
  const canSpeak = useSpeechSupported();

  const savedCount = vocab.filter((v) => state.saved[v.lemma_ar]).length;
  const allSaved = vocab.length > 0 && savedCount === vocab.length;

  function saveAll() {
    for (const v of vocab) {
      learner.save({
        lemma: v.lemma_ar,
        root: v.root_ar,
        meaning: v.meaning_ar,
        addedAt: Date.now(),
      });
    }
  }

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {vocab.length} كلمة · محفوظ منها {savedCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            طباعة
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={allSaved}
            onClick={saveAll}
          >
            {allSaved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <BookmarkPlus className="size-4" />
            )}
            {allSaved ? "محفوظة كلّها" : "احفظ كلّ الكلمات"}
          </Button>
        </div>
      </div>

      <ul className="print-area flex flex-col gap-2">
        {vocab.map((v) => {
          const isSaved = !!state.saved[v.lemma_ar];
          return (
            <li
              key={v.lemma_ar}
              className="break-avoid flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-naskh text-xl">{v.lemma_ar}</span>
                  {v.root_ar && (
                    <Badge variant="secondary" className="gap-1">
                      <Hash className="size-3" />
                      {v.root_ar}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {v.meaning_ar}
                </p>
              </div>
              <div className="no-print flex shrink-0 items-center gap-1">
                {canSpeak && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="نطق"
                    onClick={() => speak(v.lemma_ar)}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isSaved ? "محفوظة" : "حفظ"}
                  title={isSaved ? "محفوظة" : "حفظ"}
                  onClick={() =>
                    learner.toggleSaved({
                      lemma: v.lemma_ar,
                      root: v.root_ar,
                      meaning: v.meaning_ar,
                      addedAt: Date.now(),
                    })
                  }
                >
                  {isSaved ? (
                    <BookmarkCheck className="size-4 text-primary" />
                  ) : (
                    <BookmarkPlus className="size-4" />
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
