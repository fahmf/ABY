"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUnit, AdminVolume } from "@/lib/data/admin";
import {
  createUnit,
  createVolume,
  deleteUnit,
  deleteVolume,
  updateUnit,
  updateVolume,
} from "@/app/admin/actions";

const field =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function StructureManager({
  volumes,
  units,
}: {
  volumes: AdminVolume[];
  units: AdminUnit[];
}) {
  const [, startTransition] = React.useTransition();
  const [editVol, setEditVol] = React.useState<string | null>(null);
  const [editUnit, setEditUnit] = React.useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Volumes */}
      <Card>
        <CardHeader>
          <CardTitle>الأجزاء</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1 text-sm">
            {volumes.length === 0 && (
              <li className="text-muted-foreground">لا توجد أجزاء بعد.</li>
            )}
            {volumes.map((v) =>
              editVol === v.id ? (
                <li key={v.id} className="rounded-md border p-3">
                  <form
                    action={updateVolume}
                    className="flex flex-col gap-2"
                    onSubmit={() => setEditVol(null)}
                  >
                    <input type="hidden" name="id" value={v.id} />
                    <Input name="title_ar" defaultValue={v.title_ar} required />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        name="number"
                        type="number"
                        defaultValue={v.number}
                        required
                      />
                      <Input
                        name="slug"
                        dir="ltr"
                        defaultValue={v.slug}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        حفظ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditVol(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5"
                >
                  <span className="font-naskh">{v.title_ar}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">#{v.number}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="تعديل"
                      onClick={() => setEditVol(v.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="حذف"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`حذف «${v.title_ar}» وكلّ ما تحته؟`))
                          startTransition(() => deleteVolume(v.id));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </li>
              )
            )}
          </ul>
          <form action={createVolume} className="flex flex-col gap-2 border-t pt-4">
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
            {units.length === 0 && (
              <li className="text-muted-foreground">لا توجد وحدات بعد.</li>
            )}
            {units.map((u) =>
              editUnit === u.id ? (
                <li key={u.id} className="rounded-md border p-3">
                  <form
                    action={updateUnit}
                    className="flex flex-col gap-2"
                    onSubmit={() => setEditUnit(null)}
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <select
                      name="volume_id"
                      defaultValue={u.volume_id}
                      className={field}
                      required
                    >
                      {volumes.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title_ar}
                        </option>
                      ))}
                    </select>
                    <Input name="title_ar" defaultValue={u.title_ar} required />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        name="number"
                        type="number"
                        defaultValue={u.number}
                        required
                      />
                      <Input name="slug" dir="ltr" defaultValue={u.slug} required />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        حفظ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditUnit(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5"
                >
                  <span className="font-naskh">{u.title_ar}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {u.volumeTitle}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="تعديل"
                      onClick={() => setEditUnit(u.id)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="حذف"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`حذف «${u.title_ar}» وكلّ ما تحته؟`))
                          startTransition(() => deleteUnit(u.id));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </li>
              )
            )}
          </ul>
          <form action={createUnit} className="flex flex-col gap-2 border-t pt-4">
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
  );
}
