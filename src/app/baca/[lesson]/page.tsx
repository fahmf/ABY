import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReaderText } from "@/components/reader/reader-text";
import { stripDiacritics } from "@/lib/arabic";
import { getUnit, getLesson, getDictionaryMatches } from "@/lib/data/repository";
import { getStaffProfile } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson } = await params;
  const decodedLesson = decodeURIComponent(lesson);
  const data = await getLesson(decodedLesson);
  if (!data) return { title: "النص غير موجود" };
  const desc = stripDiacritics(data.body_ar).slice(0, 150);
  return {
    title: `${data.title_ar} — العربية بين يديك`,
    description: desc,
    openGraph: { title: data.title_ar, description: desc },
  };
}

export default async function ReadPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson } = await params;
  const decodedLesson = decodeURIComponent(lesson);
  const data = await getLesson(decodedLesson);
  if (!data) notFound();

  const [unit, dictMatches, staff] = await Promise.all([
    getUnit(data.volumeNumber, data.unitSlug),
    getDictionaryMatches(data.slug),
    getStaffProfile(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/jilid/${data.volumeNumber}/${data.unitSlug}`}>
          <ArrowRight className="size-4" />
          {unit?.title_ar ?? "رجوع"}
        </Link>
      </Button>

      <h1 className="font-naskh mb-2 text-3xl font-bold sm:text-4xl">
        {data.title_ar}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        انقر أيّ كلمة لعرض معناها في المعجم.
      </p>

      <ReaderText
        text={data.body_ar}
        dictMatches={dictMatches}
        lesson={{
          slug: data.slug,
          title: data.title_ar,
          volume: data.volumeNumber,
          unitSlug: data.unitSlug,
        }}
        isStaff={!!staff}
      />
    </div>
  );
}
