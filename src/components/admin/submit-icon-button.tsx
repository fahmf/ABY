"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tombol-ikon submit untuk form server action yang TIDAK berpindah halaman
 * (mis. publish/hapus). Menampilkan spinner & nonaktif selama aksi berjalan
 * agar pengguna tahu kliknya direspons. Harus dirender di dalam <form>.
 */
export function SubmitIconButton({
  children,
  title,
  className,
  disabled,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="icon"
      title={title}
      aria-busy={pending}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  );
}
