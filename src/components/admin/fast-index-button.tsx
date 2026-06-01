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
      <Zap className={`mr-2 size-4 ${pending ? "animate-pulse" : ""}`} />
      {pending ? "جارٍ الفهرسة…" : "فهرسة سريعة"}
    </Button>
  );
}
