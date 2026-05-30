import { requireStaff } from "@/lib/auth";
import { listUnits } from "@/lib/data/admin";
import { LessonForm } from "../lesson-form";

export const dynamic = "force-dynamic";

export default async function NewLessonPage() {
  await requireStaff();
  const units = await listUnits();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">نصّ جديد</h1>
      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          أضِف جزءاً ووحدةً أولاً من لوحة التحكّم.
        </p>
      ) : (
        <LessonForm units={units} />
      )}
    </div>
  );
}
