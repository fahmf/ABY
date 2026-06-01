"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RematchButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="gap-1.5"
      disabled={pending}
      title="تحديث مطابقة الكلمات مع المعجم لكل النصوص المفهرسة (بدون ذكاء اصطناعي)"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "جارٍ التحديث…" : "تحديث مطابقة المعجم"}
    </Button>
  );
}
