import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireStaff } from "@/lib/auth";
import { listLessons, listUnits, listVolumes } from "@/lib/data/admin";
import {
  createUnit,
  createVolume,
  deleteLesson,
  setLessonStatus,
} from "./actions";

export const dynamic = "force-dynamic";

const field =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export default async function AdminDashboard() {
  await requireStaff();
  const [volumes, units, lessons] = await Promise.all([
    listVolumes(),
    listUnits(),
    listLessons(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المحتوى</h1>
        <Button asChild className="gap-1.5">
          <Link href="/admin/lessons/new">
            <Plus className="size-4" />
            نصّ جديد
          </Link>
        </Button>
      </div>

      {/* Lessons */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>النصوص</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {lessons.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد نصوص بعد.</p>
          )}
          {lessons.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-naskh text-lg">{l.title_ar}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.unitTitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={l.status === "published" ? "default" : "secondary"}
                >
                  {l.status === "published" ? "منشور" : "مسوّدة"}
                </Badge>
                <form
                  action={setLessonStatus.bind(
                    null,
                    l.id,
                    l.status === "published" ? "draft" : "published"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    title={l.status === "published" ? "إلغاء النشر" : "نشر"}
                  >
                    {l.status === "published" ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </form>
                <Button asChild variant="ghost" size="icon" title="تعديل">
                  <Link href={`/admin/lessons/${l.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <form action={deleteLesson.bind(null, l.id)}>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="حذف"
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Volumes */}
        <Card>
          <CardHeader>
            <CardTitle>الأجزاء</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1 text-sm">
              {volumes.map((v) => (
                <li key={v.id} className="flex justify-between">
                  <span className="font-naskh">{v.title_ar}</span>
                  <span className="text-muted-foreground">#{v.number}</span>
                </li>
              ))}
              {volumes.length === 0 && (
                <li className="text-muted-foreground">لا توجد أجزاء بعد.</li>
              )}
            </ul>
            <form
              action={createVolume}
              className="flex flex-col gap-2 border-t pt-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="v-title">العنوان</Label>
                <Input id="v-title" name="title_ar" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="v-number">الرقم</Label>
                  <Input id="v-number" name="number" type="number" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="v-slug">المعرّف (slug)</Label>
                  <Input id="v-slug" name="slug" dir="ltr" required />
                </div>
              </div>
              <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                <Plus className="size-4" /> إضافة جزء
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader>
            <CardTitle>الوحدات</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1 text-sm">
              {units.map((u) => (
                <li key={u.id} className="flex justify-between">
                  <span className="font-naskh">{u.title_ar}</span>
                  <span className="text-muted-foreground">{u.volumeTitle}</span>
                </li>
              ))}
              {units.length === 0 && (
                <li className="text-muted-foreground">لا توجد وحدات بعد.</li>
              )}
            </ul>
            <form
              action={createUnit}
              className="flex flex-col gap-2 border-t pt-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="u-volume">الجزء</Label>
                <select id="u-volume" name="volume_id" required className={field}>
                  {volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="u-title">العنوان</Label>
                <Input id="u-title" name="title_ar" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="u-number">الرقم</Label>
                  <Input id="u-number" name="number" type="number" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="u-slug">المعرّف (slug)</Label>
                  <Input id="u-slug" name="slug" dir="ltr" required />
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={volumes.length === 0}
              >
                <Plus className="size-4" /> إضافة وحدة
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
