import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { search, type SearchMode } from "@/lib/data/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q = "", mode: modeParam } = await searchParams;
  const query = q.trim();
  const mode: SearchMode = modeParam === "root" ? "root" : "text";
  const hits = query ? await search(query, mode) : [];

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

      <div className="mb-4 flex items-center gap-2">
        {tab("text", "في النصوص")}
        {tab("root", "حسب الجذر")}
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
              mode === "root" ? "اكتب كلمة لإيجاد كل مشتقات جذرها…" : "ابحث في النصوص…"
            }
            autoFocus
            className="border-input bg-background h-11 w-full rounded-md border pr-10 pl-4 text-base outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </div>
      </form>

      {query && (
        <p className="mb-4 text-sm text-muted-foreground">
          {hits.length > 0
            ? `${hits.length} نتيجة لـ «${query}»`
            : `لا نتائج لـ «${query}»`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {hits.map((h, i) => (
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
        ))}
      </div>
    </div>
  );
}
