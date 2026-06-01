"use client";

import * as React from "react";
import { Eye, EyeOff, Minus, Plus, BookOpen, Book } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { stripDiacritics, tokenize } from "@/lib/arabic";
import { DictionaryPanel } from "./dictionary-panel";

const FONT_STEPS = [
  "text-xl leading-[2.6] sm:text-2xl sm:leading-[2.8]",
  "text-2xl leading-[2.6] sm:text-3xl sm:leading-[2.8]",
  "text-3xl leading-[2.7] sm:text-4xl sm:leading-[2.9]",
  "text-4xl leading-[2.8] sm:text-5xl sm:leading-[3]",
];

export function ReaderText({
  text,
  dictMatches,
}: {
  text: string;
  dictMatches?: Record<number, string>;
}) {
  const [showHarakat, setShowHarakat] = React.useState(true);
  const [showDictMatches, setShowDictMatches] = React.useState(true);
  const [fontStep, setFontStep] = React.useState(1);
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
    if (h !== null) setShowHarakat(h === "1");
    if (d !== null) setShowDictMatches(d === "1");
    if (f !== null) setFontStep(Number(f));
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
          const isDictMatch = dictMatches ? !!dictMatches[seg.index] : false;

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              data-token={seg.index}
              onClick={() =>
                setSelected({
                  surface: seg.text,
                  lemma: dictMatches?.[seg.index],
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected({
                    surface: seg.text,
                    lemma: dictMatches?.[seg.index],
                  });
                }
              }}
              className={
                "cursor-pointer rounded-md px-0.5 transition-colors hover:bg-accent " +
                (isActive ? "bg-primary/15 text-primary " : "") +
                (isHighlighted
                  ? "bg-amber-300/60 dark:bg-amber-400/30 ring-2 ring-amber-400/50 "
                  : "") +
                (isDictMatch && showDictMatches && !isActive
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
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
