import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getLessons, getUnit, getVolume } from "@/lib/data/repository";
import { LessonStatusDot } from "@/components/learner/lesson-status-dot";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ number: string; unit: string }>;
}) {
  const { number, unit } = await params;
  const decodedUnit = decodeURIComponent(unit);
  const volume = await getVolume(Number(number));
  const unitData = volume ? await getUnit(volume.number, decodedUnit) : null;
  if (!volume || !unitData) notFound();

  const lessons = await getLessons(unitData.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href={`/jilid/${volume.number}`}>
          <ArrowRight className="size-4" />
          {volume.title_ar}
        </Link>
      </Button>
      <h1 className="font-naskh text-3xl font-bold sm:text-4xl">
        {unitData.title_ar}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">النصوص</p>

      <div className="mt-6 flex flex-col gap-3">
        {lessons.map((l) => (
          <Link key={l.slug} href={`/baca/${l.slug}`} className="group">
            <Card className="py-4 transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
              <CardHeader className="flex-row items-center justify-between gap-3 px-5">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-primary" />
                  <CardTitle className="font-naskh text-xl">
                    {l.title_ar}
                  </CardTitle>
                  <LessonStatusDot slug={l.slug} />
                </div>
                <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
