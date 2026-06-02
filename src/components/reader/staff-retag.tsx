"use client";

import * as React from "react";
import { Loader2, Unlink, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Khusus staff: koreksi kecocokan sebuah kata di teks ini secara permanen.
 * - تعيين: petakan kata ke lemma yang benar (harus ada sebagai مدخل منشور).
 * - إزالة الربط: hapus kecocokan yang salah (kata tetap bisa diklik).
 * Menyimpan langsung ke tabel tokens via /api/admin/retag.
 */
export function StaffRetag({
  surface,
  lessonSlug,
  currentLemma,
  onChanged,
}: {
  surface: string;
  lessonSlug: string;
  currentLemma?: string;
  onChanged?: (lemma: string | null) => void;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState<"assign" | "clear" | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function send(lemma: string | null) {
    setBusy(lemma === null ? "clear" : "assign");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/retag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonSlug, surface, lemma }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(`تمّ تحديث ${d.updated ?? 0} موضعًا.`);
        onChanged?.(lemma);
        setValue("");
      } else if (res.status === 404) {
        setMsg("لا يوجد مدخل منشور بهذا اللفظ.");
      } else if (res.status === 403) {
        setMsg("غير مصرّح.");
      } else {
        setMsg("تعذّر الحفظ، حاول مجدّدًا.");
      }
    } catch {
      setMsg("تعذّر الاتصال.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-primary">
        <Wand2 className="size-4" /> تصحيح الكشف (للمشرف)
      </p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="اللفظ الصحيح (lemma)…"
          className="h-9 font-naskh"
          dir="rtl"
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={!value.trim() || busy !== null}
          onClick={() => send(value.trim())}
        >
          {busy === "assign" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          تعيين
        </Button>
      </div>
      {currentLemma && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          disabled={busy !== null}
          onClick={() => send(null)}
        >
          {busy === "clear" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Unlink className="size-4" />
          )}
          إزالة الربط الحالي
        </Button>
      )}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
