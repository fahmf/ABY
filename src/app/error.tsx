"use client";

import * as React from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <TriangleAlert className="mb-4 size-10 text-destructive" />
      <h1 className="text-2xl font-bold">حدث خطأ ما</h1>
      <p className="mt-2 text-muted-foreground">
        تعذّر تحميل هذا المحتوى. حاوِل مرّة أخرى.
      </p>
      <Button onClick={reset} className="mt-6 gap-1.5">
        <RotateCcw className="size-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
