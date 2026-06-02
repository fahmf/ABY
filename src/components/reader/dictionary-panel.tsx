"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Hash, Languages, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RootFrequencyButton } from "./root-frequency";
import type { DictionaryEntry } from "@/lib/data/types";

type Suggestion = { lemma_ar: string; root_ar: string; meaning_ar: string };

export function DictionaryPanel({
  surface,
  lemma,
}: {
  surface: string;
  lemma?: string;
}) {
  const [entry, setEntry] = React.useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [savedNote, setSavedNote] = React.useState(false);
  const [aiError, setAiError] = React.useState<
    "unauthorized" | "busy" | "failed" | "rate_limited" | null
  >(null);

  React.useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setAiError(null);
      setSavedNote(false);
    }, 0);
    let url = `/api/dictionary?q=${encodeURIComponent(surface)}`;
    if (lemma) url += `&lemma=${encodeURIComponent(lemma)}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setEntry(d.entry ?? null);
        setSuggestions(d.entry ? [] : (d.suggestions ?? []));
      })
      .catch(() => {
        if (!active) return;
        setEntry(null);
        setSuggestions([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [surface, lemma]);

  // Klik saran "هل تقصد؟" → ambil entri lemma terpilih.
  function pickSuggestion(pickedLemma: string) {
    setLoading(true);
    setSuggestions([]);
    fetch(
      `/api/dictionary?q=${encodeURIComponent(surface)}&lemma=${encodeURIComponent(
        pickedLemma
      )}`
    )
      .then((r) => r.json())
      .then((d) => setEntry(d.entry ?? null))
      .catch(() => setEntry(null))
      .finally(() => setLoading(false));
  }

  // Analisis AI on-demand (khusus staff) → tampilkan & simpan draft.
  function runAnalyze() {
    setAnalyzing(true);
    setAiError(null);
    fetch(`/api/analyze?q=${encodeURIComponent(surface)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.entry) {
          setEntry(d.entry as DictionaryEntry);
          setSuggestions([]);
          setSavedNote(true);
        } else if (r.status === 403) {
          setAiError("unauthorized");
        } else if (r.status === 429) {
          setAiError("rate_limited");
        } else if (r.status === 503) {
          setAiError("busy");
        } else {
          setAiError("failed");
        }
      })
      .catch(() => setAiError("failed"))
      .finally(() => setAnalyzing(false));
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4">
      <SheetHeader className="shrink-0">
        <SheetTitle className="font-naskh text-3xl sm:text-4xl">{surface}</SheetTitle>
        <SheetDescription className="flex items-center gap-2 text-sm sm:text-base">
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="size-4 animate-spin" />
              جارٍ البحث…
            </span>
          ) : entry ? (
            <Badge variant="secondary" className="gap-1 text-sm">
              <Hash className="size-3.5" />
              الجذر: {entry.root_ar || "—"}
            </Badge>
          ) : (
            <span className="flex items-center gap-1">
              <Languages className="size-4" />
              قيد المراجعة — لا يوجد مدخل بعد
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      {!loading && entry && (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 text-base sm:text-lg">
          {savedNote && (
            <p className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-700 sm:text-sm dark:text-emerald-300">
              <Check className="size-4 shrink-0" />
              تمّ التحليل وحُفِظ كمسوّدة — سيظهر للجميع بعد مراجعة المشرف.
            </p>
          )}
          {/* Morphology Info */}
          {(entry.word_type || entry.plural_ar || entry.singular_ar || entry.past_ar || entry.present_ar || entry.masdar_ar) && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground border-b pb-3 sm:text-base">
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
                  <Badge
                    key={w}
                    variant="outline"
                    className="font-naskh text-sm sm:text-base"
                  >
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
                  <Badge
                    key={w}
                    variant="outline"
                    className="font-naskh text-sm sm:text-base"
                  >
                    {w}
                  </Badge>
                ))}
              </div>
            </Field>
          )}

          {entry.examples_ar.length > 0 && (
            <Field label="أمثلة">
              <ul className="flex flex-col gap-2">
                {entry.examples_ar.map((ex, i) => (
                  <li
                    key={i}
                    className="font-naskh border-r-2 border-primary/30 pr-3 leading-relaxed text-muted-foreground"
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

      {!loading && !entry && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
                هل تقصد؟
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.lemma_ar}
                    type="button"
                    onClick={() => pickSuggestion(s.lemma_ar)}
                    title={s.meaning_ar}
                    className="rounded-md border px-3 py-1.5 font-naskh text-base transition-colors hover:border-primary/40 hover:bg-accent sm:text-lg"
                  >
                    {s.lemma_ar}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4">
            <Button
              onClick={runAnalyze}
              disabled={analyzing}
              variant="outline"
              className="w-fit gap-1.5"
            >
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {analyzing ? "جارٍ التحليل…" : "تحليل بالذكاء الاصطناعي"}
            </Button>

            {aiError === "unauthorized" && (
              <p className="text-sm text-muted-foreground">
                هذه الميزة للمشرف.{" "}
                <Link href="/admin/login" className="text-primary underline">
                  سجّل الدخول
                </Link>
              </p>
            )}
            {aiError === "busy" && (
              <p className="text-sm text-muted-foreground">
                الخادم مزدحم حاليًّا، حاول بعد قليل.
              </p>
            )}
            {aiError === "rate_limited" && (
              <p className="text-sm text-muted-foreground">
                لقد أكثرتَ من الطلبات. انتظر قليلاً ثم حاول مجدّدًا.
              </p>
            )}
            {aiError === "failed" && (
              <p className="text-sm text-muted-foreground">
                تعذّر التحليل. حاول مرّةً أخرى.
              </p>
            )}
          </div>

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
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
        {label}
      </h3>
      {children}
    </div>
  );
}
