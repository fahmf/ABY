"use client";

import { useFormStatus } from "react-dom";
import { ListChecks, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol submit untuk «توليد أسئلة الفهم» (soal pemahaman teks). Menampilkan
 * spinner & nonaktif selama server action berjalan. Harus dirender di dalam
 * <form> yang memanggil generateQuestionsAction.
 */
export function GenerateQuizButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      title={pending ? "جارٍ توليد الأسئلة…" : "توليد أسئلة الفهم"}
      aria-busy={pending}
      disabled={disabled || pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ListChecks className="size-4" />
      )}
    </Button>
  );
}
