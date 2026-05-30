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

  const segments = React.useMemo(() => tokenize(text), [text]);

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

      <p className="font-naskh text-2xl leading-[2.6] sm:text-3xl sm:leading-[2.8]">
        {segments.map((seg, i) => {
          if (seg.type === "sep") {
            return <span key={i}>{seg.text}</span>;
          }
          const display = showHarakat ? seg.text : stripDiacritics(seg.text);
          const isActive = selected !== null && selected === seg.text;
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
                (isActive ? "bg-primary/15 text-primary" : "")
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
