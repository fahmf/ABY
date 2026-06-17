import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonGlossary } from "@/components/reader/lesson-glossary";
import { getLesson, getLessonVocabulary } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson } = await params;
  const data = await getLesson(decodeURIComponent(lesson));
  return { title: data ? `كلمات الدرس: ${data.title_ar}` : "كلمات الدرس" };
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson } = await params;
  const decoded = decodeURIComponent(lesson);
  const data = await getLesson(decoded);
  if (!data) notFound();

  const vocab = await getLessonVocabulary(data.slug);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="no-print mb-4">
        <Link href={`/baca/${data.slug}`}>
          <ArrowRight className="size-4" />
          {data.title_ar}
        </Link>
      </Button>

      <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
        <ListChecks className="size-6 text-primary" />
        كلمات الدرس
      </h1>
      <p className="mb-6 font-naskh text-lg text-muted-foreground">
        {data.title_ar}
      </p>

      {vocab.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد كلماتٌ في معجم هذا النصّ بعد. عُد لاحقًا بعد إثراء المعجم.
          </CardContent>
        </Card>
      ) : (
        <LessonGlossary vocab={vocab} />
      )}
    </div>
  );
}
