import Link from "next/link";
import { BookOpenText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenText className="size-5" />
          </span>
          <span className="font-semibold tracking-tight">العربية بين يديك</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="بحث">
            <Link href="/cari">
              <Search className="size-5" />
            </Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
