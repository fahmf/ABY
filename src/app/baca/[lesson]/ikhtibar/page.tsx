import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonAssessment } from "@/components/reader/lesson-assessment";
import {
  getLesson,
  getLessonQuestions,
  getLessonVocabulary,
} from "@/lib/data/repository";

// ISR: kosakata pelajaran berubah hanya saat kamus diperbarui — cache & segarkan
// tiap jam agar halaman kuis tak query DB lintas-region tiap kunjungan.
export const revalidate = 3600;

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

  const [vocab, questions] = await Promise.all([
    getLessonVocabulary(data.slug),
    getLessonQuestions(data.slug),
  ]);

  const hasAnything = vocab.length >= 4 || questions.length > 0;

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

      {hasAnything ? (
        <LessonAssessment
          vocab={vocab}
          questions={questions}
          lessonSlug={data.slug}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            لا توجد كلماتٌ كافية أو أسئلةٌ لهذا النصّ بعد. عُد لاحقًا بعد إثراء
            المحتوى.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
