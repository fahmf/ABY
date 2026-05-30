"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { stripDiacritics, tokenize } from "@/lib/arabic";
import { DictionaryPanel } from "./dictionary-panel";

export function ReaderText({ text }: { text: string }) {
  const [showHarakat, setShowHarakat] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [highlighted, setHighlighted] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLParagraphElement>(null);

  const segments = React.useMemo(() => tokenize(text), [text]);

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
      <div className="mb-6 flex items-center justify-end">
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

      <p
        ref={containerRef}
        className="font-naskh text-2xl leading-[2.6] sm:text-3xl sm:leading-[2.8]"
      >
        {segments.map((seg, i) => {
          if (seg.type === "sep") {
            return <span key={i}>{seg.text}</span>;
          }
          const display = showHarakat ? seg.text : stripDiacritics(seg.text);
          const isActive = selected !== null && selected === seg.text;
          const isHighlighted = highlighted === seg.index;
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              data-token={seg.index}
              onClick={() => setSelected(seg.text)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(seg.text);
                }
              }}
              className={
                "cursor-pointer rounded-md px-0.5 transition-colors hover:bg-accent " +
                (isActive ? "bg-primary/15 text-primary " : "") +
                (isHighlighted
                  ? "bg-amber-300/60 dark:bg-amber-400/30 ring-2 ring-amber-400/50 "
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
          {selected && <DictionaryPanel surface={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
