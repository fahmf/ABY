"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol submit untuk «تبسيط المعاني» (penyederhanaan makna massal). Memakai
 * useFormStatus agar menampilkan spinner & menonaktifkan diri selama server
 * action berjalan — prosesnya bisa lama (memanggil Gemini per batch).
 *
 * Harus dirender DI DALAM <form> yang memanggil refreshMeaningsAction.
 */
export function RefreshMeaningsButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="gap-1.5"
      aria-busy={pending}
      disabled={disabled || pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {pending ? "جارٍ التبسيط…" : label}
    </Button>
  );
}
