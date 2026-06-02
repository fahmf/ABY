"use client";

import { useFormStatus } from "react-dom";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FastIndexButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      disabled={pending}
      title={pending ? "جارٍ الفهرسة…" : "فهرسة سريعة (بدون ذكاء اصطناعي)"}
    >
      <Zap className={`size-4 sm:mr-2 ${pending ? "animate-pulse" : ""}`} />
      {/* Label disembunyikan di layar kecil agar baris tetap rapi di الهاتف. */}
      <span className="hidden sm:inline">
        {pending ? "جارٍ الفهرسة…" : "فهرسة سريعة"}
      </span>
    </Button>
  );
}
