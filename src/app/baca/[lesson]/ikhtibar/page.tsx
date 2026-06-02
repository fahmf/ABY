import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonQuiz } from "@/components/reader/lesson-quiz";
import { getLesson, getLessonVocabulary } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson } = await params;
  const data = await getLesson(decodeURIComponent(lesson));
  return { title: data ? `اختبار: ${data.title_ar}` : "اختبار" };
}

export default async function QuizPage({
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
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/baca/${data.slug}`}>
          <ArrowRight className="size-4" />
          {data.title_ar}
        </Link>
      </Button>

      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <GraduationCap className="size-6 text-primary" />
        اختبر نفسك
      </h1>

      {vocab.length < 4 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد كلماتٌ كافية في هذا النصّ لإنشاء اختبار بعد. عُد لاحقًا بعد
            إثراء المعجم.
          </CardContent>
        </Card>
      ) : (
        <LessonQuiz vocab={vocab} lessonSlug={data.slug} />
      )}
    </div>
  );
}
