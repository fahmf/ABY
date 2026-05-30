import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLesson, AdminUnit } from "@/lib/data/admin";
import { saveLesson } from "../actions";

const field =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function LessonForm({
  units,
  lesson,
}: {
  units: AdminUnit[];
  lesson?: AdminLesson;
}) {
  return (
    <form action={saveLesson} className="flex flex-col gap-4">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_id">الوحدة</Label>
        <select
          id="unit_id"
          name="unit_id"
          required
          defaultValue={lesson?.unit_id}
          className={field}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.volumeTitle} — {u.title_ar}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title_ar">العنوان</Label>
          <Input
            id="title_ar"
            name="title_ar"
            required
            defaultValue={lesson?.title_ar}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">المعرّف (slug)</Label>
          <Input
            id="slug"
            name="slug"
            dir="ltr"
            required
            defaultValue={lesson?.slug}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body_ar">النصّ</Label>
        <Textarea
          id="body_ar"
          name="body_ar"
          required
          dir="rtl"
          defaultValue={lesson?.body_ar}
          className="font-naskh min-h-64 text-lg leading-loose"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">الحالة</Label>
        <select
          id="status"
          name="status"
          defaultValue={lesson?.status ?? "draft"}
          className={field}
        >
          <option value="draft">مسوّدة</option>
          <option value="published">منشور</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" className="gap-1.5">
          <Save className="size-4" />
          حفظ
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin">
            <ArrowRight className="size-4" />
            رجوع
          </Link>
        </Button>
      </div>
    </form>
  );
}
