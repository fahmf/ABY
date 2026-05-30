import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { getLessonById, listUnits } from "@/lib/data/admin";
import { LessonForm } from "../lesson-form";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [lesson, units] = await Promise.all([getLessonById(id), listUnits()]);
  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">تعديل النصّ</h1>
      <LessonForm units={units} lesson={lesson} />
    </div>
  );
}
