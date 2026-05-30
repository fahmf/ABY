import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getUnits, getVolume } from "@/lib/data/repository";

export default async function VolumePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const volume = getVolume(Number(number));
  if (!volume) notFound();

  const units = getUnits(volume.number);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/">
          <ArrowRight className="size-4" />
          الرئيسية
        </Link>
      </Button>
      <h1 className="font-naskh text-3xl font-bold sm:text-4xl">
        {volume.title_ar}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">الوحدات</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {units.map((u) => (
          <Link
            key={u.slug}
            href={`/jilid/${volume.number}/${u.slug}`}
            className="group"
          >
            <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-sm font-medium">
                    {u.number}
                  </span>
                  <CardTitle className="font-naskh text-xl">
                    {u.title_ar}
                  </CardTitle>
                </div>
                <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {units.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border bg-muted/30 p-10 text-center">
          <Layers className="size-7 text-muted-foreground" />
          <p className="text-muted-foreground">لا توجد وحدات بعد.</p>
        </div>
      )}
    </div>
  );
}
