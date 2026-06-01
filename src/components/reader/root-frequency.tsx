"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Hash, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RootFrequency } from "@/lib/data/frequency";

export function RootFrequencyButton({ surface }: { surface: string }) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<RootFrequency | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    const t = setTimeout(() => setLoading(true), 0);
    fetch(`/api/frequency?q=${encodeURIComponent(surface)}`)
      .then((r) => r.json())
      .then((d) => active && setData(d.frequency ?? null))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, surface]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Hash className="size-3.5" />
        عدد مرّات ورود الجذر
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              مواضع ورود الجذر
              {data && (
                <Badge variant="secondary" className="gap-1">
                  <Hash className="size-3" />
                  {data.root_ar}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {loading
                ? "جارٍ الحساب…"
                : data
                  ? `وردَ ${data.total} مرّة في النصوص.`
                  : "لا توجد بيانات لهذا الجذر بعد."}
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && data && data.occurrences.length > 0 && (
            <ul className="flex flex-col gap-2 overflow-y-auto pe-1">
              {data.occurrences.map((o, i) => (
                <li key={`${o.lessonSlug}-${o.position}-${i}`}>
                  <Link
                    href={`/baca/${o.lessonSlug}#t=${o.position}`}
                    onClick={() => setOpen(false)}
                    className="group block rounded-md border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{o.unitTitle}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        {o.lessonTitle}
                      </span>
                      <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-1" />
                    </div>
                    <p className="font-naskh text-lg leading-relaxed">
                      {o.snippet}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
