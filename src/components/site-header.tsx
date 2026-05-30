import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">العربية بين يديك</span>
        </Link>
        <ModeToggle />
      </div>
    </header>
  );
}
