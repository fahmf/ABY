"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol submit untuk aksi "معالجة" (ingest). Memakai useFormStatus agar
 * menampilkan spinner & menonaktifkan diri selama server action berjalan,
 * sehingga pengguna tahu prosesnya sedang berlangsung.
 *
 * Harus dirender DI DALAM <form> yang memanggil ingestLessonAction.
 */
export function IngestButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      title={pending ? "جارٍ المعالجة…" : "معالجة (الجذر + المعجم)"}
      aria-busy={pending}
      disabled={disabled || pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
    </Button>
  );
}
