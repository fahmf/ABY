"use client";

import * as React from "react";
import { Hash, Languages, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RootFrequencyButton } from "./root-frequency";
import type { DictionaryEntry } from "@/lib/data/types";

export function DictionaryPanel({
  surface,
  lemma,
}: {
  surface: string;
  lemma?: string;
}) {
  const [entry, setEntry] = React.useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const t = setTimeout(() => active && setLoading(true), 0);
    let url = `/api/dictionary?q=${encodeURIComponent(surface)}`;
    if (lemma) url += `&lemma=${encodeURIComponent(lemma)}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (active) setEntry(d.entry ?? null);
      })
      .catch(() => active && setEntry(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [surface, lemma]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="shrink-0">
        <SheetTitle className="font-naskh text-3xl">{surface}</SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" />
              جارٍ البحث…
            </span>
          ) : entry ? (
            <Badge variant="secondary" className="gap-1">
              <Hash className="size-3" />
              الجذر: {entry.root_ar || "—"}
            </Badge>
          ) : (
            <span className="flex items-center gap-1">
              <Languages className="size-3.5" />
              قيد المراجعة — لا يوجد مدخل بعد
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      {!loading && entry && (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
          {/* Morphology Info */}
          {(entry.word_type || entry.plural_ar || entry.singular_ar || entry.past_ar || entry.present_ar || entry.masdar_ar) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-b pb-3">
              {entry.word_type && (
                <Badge variant="outline" className="bg-primary/5 text-primary">
                  {entry.word_type}
                </Badge>
              )}
              {entry.plural_ar && (
                <span className="flex items-center gap-1 border-r-2 pr-2">
                  <span className="text-xs">الجمع:</span>
                  <span className="font-naskh text-foreground">{entry.plural_ar}</span>
                </span>
              )}
              {entry.singular_ar && (
                <span className="flex items-center gap-1 border-r-2 pr-2">
                  <span className="text-xs">المفرد:</span>
                  <span className="font-naskh text-foreground">{entry.singular_ar}</span>
                </span>
              )}
              {entry.past_ar && (
                <span className="flex items-center gap-1 border-r-2 pr-2">
                  <span className="text-xs">الماضي:</span>
                  <span className="font-naskh text-foreground">{entry.past_ar}</span>
                </span>
              )}
              {entry.present_ar && (
                <span className="flex items-center gap-1 border-r-2 pr-2">
                  <span className="text-xs">المضارع:</span>
                  <span className="font-naskh text-foreground">{entry.present_ar}</span>
                </span>
              )}
              {entry.masdar_ar && (
                <span className="flex items-center gap-1 border-r-2 pr-2">
                  <span className="text-xs">المصدر:</span>
                  <span className="font-naskh text-foreground">{entry.masdar_ar}</span>
                </span>
              )}
            </div>
          )}

          <Field label="المعنى">
            <p className="leading-relaxed">{entry.meaning_ar}</p>
          </Field>

          {entry.synonyms_ar.length > 0 && (
            <Field label="المرادفات">
              <div className="flex flex-wrap gap-1.5">
                {entry.synonyms_ar.map((w) => (
                  <Badge key={w} variant="outline">
                    {w}
                  </Badge>
                ))}
              </div>
            </Field>
          )}

          {entry.antonyms_ar.length > 0 && (
            <Field label="الأضداد">
              <div className="flex flex-wrap gap-1.5">
                {entry.antonyms_ar.map((w) => (
                  <Badge key={w} variant="outline">
                    {w}
                  </Badge>
                ))}
              </div>
            </Field>
          )}

          {entry.examples_ar.length > 0 && (
            <Field label="أمثلة">
              <ul className="flex flex-col gap-1.5">
                {entry.examples_ar.map((ex, i) => (
                  <li
                    key={i}
                    className="font-naskh border-r-2 border-border pr-3 leading-relaxed text-muted-foreground"
                  >
                    {ex}
                  </li>
                ))}
              </ul>
            </Field>
          )}

          <RootFrequencyButton surface={surface} />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      {children}
    </div>
  );
}
