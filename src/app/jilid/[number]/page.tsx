import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Hammer } from "lucide-react";

import { Button } from "@/components/ui/button";

const TITLES: Record<string, string> = {
  "1": "الكتاب الأول",
  "2": "الكتاب الثاني",
  "3": "الكتاب الثالث",
  "4": "الكتاب الرابع",
};

export default async function VolumePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const title = TITLES[number];
  if (!title) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-naskh text-3xl font-bold sm:text-4xl">{title}</h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-10">
        <Hammer className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          قائمة الوحدات والنصوص قيد الإنشاء — ستظهر هنا قريباً.
        </p>
      </div>
      <Button asChild variant="ghost" className="mt-8">
        <Link href="/">
          <ArrowRight className="size-4" />
          العودة إلى الرئيسية
        </Link>
      </Button>
    </div>
  );
}
