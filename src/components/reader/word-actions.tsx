"use client";

import { Bookmark, BookmarkCheck, GraduationCap, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLearner, learner } from "@/lib/learner/store";
import { speak, useSpeechSupported } from "@/lib/learner/speech";

/**
 * Baris aksi pribadi untuk satu kata di panel kamus:
 *  - حفظ (simpan ke مفرداتي + masuk antrean hafalan)
 *  - أتقنتها (tandai dikuasai → diredupkan saat membaca)
 *  - نطق (lafalkan)
 */
export function WordActions({
  lemma,
  root,
  meaning,
  surface,
}: {
  lemma: string;
  root?: string;
  meaning?: string;
  surface: string;
}) {
  const state = useLearner();
  const saved = !!state.saved[lemma];
  const known = !!state.known[lemma];
  const canSpeak = useSpeechSupported();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size="sm"
        className="gap-1.5"
        aria-pressed={saved}
        onClick={() => learner.toggleSaved({ lemma, root, meaning, surface, addedAt: Date.now() })}
      >
        {saved ? (
          <BookmarkCheck className="size-4 text-primary" />
        ) : (
          <Bookmark className="size-4" />
        )}
        {saved ? "محفوظة" : "حفظ"}
      </Button>

      <Button
        type="button"
        variant={known ? "secondary" : "outline"}
        size="sm"
        className="gap-1.5"
        aria-pressed={known}
        onClick={() => learner.toggleKnown(lemma)}
      >
        <GraduationCap className={known ? "size-4 text-primary" : "size-4"} />
        {known ? "أتقنتها" : "أعرفها"}
      </Button>

      {canSpeak && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="نطق الكلمة"
          title="نطق الكلمة"
          onClick={() => speak(surface || lemma)}
        >
          <Volume2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
