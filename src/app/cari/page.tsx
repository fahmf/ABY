import Link from "next/link";
import { ArrowLeft, Search, Hash } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { search, searchDictionary, type SearchMode } from "@/lib/data/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q = "", mode: modeParam } = await searchParams;
  const query = q.trim();
  const mode: SearchMode = (modeParam === "root" || modeParam === "dictionary") ? modeParam : "text";
  
  const textHits = query && mode !== "dictionary" ? await search(query, mode) : [];
  const dictHits = query && mode === "dictionary" ? await searchDictionary(query) : [];

  const tab = (value: SearchMode, label: string) => {
    const active = mode === value;
    const href = `/cari?mode=${value}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
    return (
      <Link
        href={href}
        className={
          "rounded-md px-3 py-1.5 text-sm transition-colors " +
          (active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-accent")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold">البحث</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("text", "في النصوص")}
        {tab("root", "حسب الجذر")}
        {tab("dictionary", "في المعجم")}
      </div>

      <form action="/cari" method="get" className="mb-6">
        <input type="hidden" name="mode" value={mode} />
        <div className="relative">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={
              mode === "root" ? "اكتب كلمة لإيجاد كل مشتقات جذرها…" : 
              mode === "dictionary" ? "ابحث عن كلمة في المعجم..." : "ابحث في النصوص…"
            }
            autoFocus
            className="border-input bg-background h-11 w-full rounded-md border pr-10 pl-4 text-base outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </div>
      </form>

      {query && (
        <p className="mb-4 text-sm text-muted-foreground">
          {mode === "dictionary" 
            ? dictHits.length > 0
              ? `${dictHits.length} نتيجة لـ «${query}»`
              : `لا نتائج لـ «${query}»`
            : textHits.length > 0
              ? `${textHits.length} نتيجة لـ «${query}»`
              : `لا نتائج لـ «${query}»`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {mode === "dictionary" ? (
          dictHits.map((h, i) => (
            <Card key={i} className="py-4 px-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-naskh text-2xl font-bold">{h.lemma_ar}</h3>
                  {h.root_ar && (
                    <Badge variant="secondary" className="gap-1">
                      <Hash className="size-3" />
                      الجذر: {h.root_ar}
                    </Badge>
                  )}
                </div>
                <p className="leading-relaxed text-muted-foreground">{h.meaning_ar || "لا يوجد معنى"}</p>
                {h.synonyms_ar.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.synonyms_ar.map((syn) => (
                      <Badge key={syn} variant="outline" className="text-xs">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          textHits.map((h, i) => (
            <Link key={`${h.lessonSlug}-${i}`} href={`/baca/${h.lessonSlug}`} className="group">
              <Card className="py-4 transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                <div className="flex flex-col gap-1 px-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{h.unitTitle}</span>
                    <span>·</span>
                    <span className="font-medium text-foreground">
                      {h.lessonTitle}
                    </span>
                    <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-1" />
                  </div>
                  <p className="font-naskh text-lg leading-relaxed">{h.snippet}</p>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
