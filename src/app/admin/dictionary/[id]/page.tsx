import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Hash, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireStaff } from "@/lib/auth";
import { getDictionaryEntry } from "@/lib/data/admin";
import { saveDictionaryEntry } from "../../actions";

export const dynamic = "force-dynamic";

const field =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const entry = await getDictionaryEntry(id);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/dictionary">
          <ArrowRight className="size-4" />
          مراجعة المعجم
        </Link>
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-naskh text-3xl font-bold">{entry.lemma_ar}</h1>
        <Badge variant="secondary" className="gap-1">
          <Hash className="size-3" />
          {entry.root_ar || "—"}
        </Badge>
      </div>

      <form action={saveDictionaryEntry} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={entry.id} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meaning_ar">المعنى</Label>
          <Textarea
            id="meaning_ar"
            name="meaning_ar"
            dir="rtl"
            defaultValue={entry.meaning_ar}
            className="font-naskh min-h-24 text-lg leading-relaxed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="synonyms_ar">المرادفات (افصِل بفاصلة)</Label>
          <Input
            id="synonyms_ar"
            name="synonyms_ar"
            dir="rtl"
            defaultValue={entry.synonyms_ar.join("، ")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="antonyms_ar">الأضداد (افصِل بفاصلة)</Label>
          <Input
            id="antonyms_ar"
            name="antonyms_ar"
            dir="rtl"
            defaultValue={entry.antonyms_ar.join("، ")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="examples_ar">أمثلة (مثال في كل سطر)</Label>
          <Textarea
            id="examples_ar"
            name="examples_ar"
            dir="rtl"
            defaultValue={entry.examples_ar.join("\n")}
            className="font-naskh min-h-28 text-lg leading-relaxed"
          />
        </div>

        {/* ---------- الصرف: نوع الكلمة + جمع/مفرد + تصريف الفعل ---------- */}
        <fieldset className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-xs font-medium text-muted-foreground">
            الصرف (اختياري — املأ ما ينطبق)
          </legend>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="word_type">نوع الكلمة</Label>
            <Input
              id="word_type"
              name="word_type"
              dir="rtl"
              placeholder="اسم / فعل / حرف"
              defaultValue={entry.word_type ?? ""}
              className="font-naskh"
            />
          </div>

          <div className="hidden sm:block" aria-hidden />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plural_ar">الجمع</Label>
            <Input
              id="plural_ar"
              name="plural_ar"
              dir="rtl"
              defaultValue={entry.plural_ar ?? ""}
              className="font-naskh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="singular_ar">المفرد</Label>
            <Input
              id="singular_ar"
              name="singular_ar"
              dir="rtl"
              defaultValue={entry.singular_ar ?? ""}
              className="font-naskh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="past_ar">الماضي</Label>
            <Input
              id="past_ar"
              name="past_ar"
              dir="rtl"
              defaultValue={entry.past_ar ?? ""}
              className="font-naskh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="present_ar">المضارع</Label>
            <Input
              id="present_ar"
              name="present_ar"
              dir="rtl"
              defaultValue={entry.present_ar ?? ""}
              className="font-naskh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="masdar_ar">المصدر</Label>
            <Input
              id="masdar_ar"
              name="masdar_ar"
              dir="rtl"
              defaultValue={entry.masdar_ar ?? ""}
              className="font-naskh"
            />
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">الحالة</Label>
          <select
            id="status"
            name="status"
            defaultValue={entry.status}
            className={field}
          >
            <option value="draft">مسوّدة</option>
            <option value="published">منشور (مُراجَع)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" className="gap-1.5">
            <Save className="size-4" />
            حفظ
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/dictionary">رجوع</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
