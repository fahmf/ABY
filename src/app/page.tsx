import Link from "next/link";
import { ArrowLeft, BookText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getVolumes } from "@/lib/data/repository";
import { ContinueReading } from "@/components/learner/continue-reading";
import { StudyStats } from "@/components/learner/study-stats";

// ISR: daftar jilid jarang berubah — cache & segarkan tiap jam agar halaman
// depan tersaji dari edge (instan) alih-alih query DB tiap kunjungan.
export const revalidate = 3600;

const VOLUME_TITLES: Record<number, string> = {
  1: "الكتاب الأول",
  2: "الكتاب الثاني",
  3: "الكتاب الثالث",
  4: "الكتاب الرابع",
};

export default async function Home() {
  // Empat slot tampil; status "متاح" ditentukan oleh data (Supabase/seed).
  const available = new Set((await getVolumes()).map((v) => v.number));
  const volumes = [1, 2, 3, 4].map((number) => ({
    number,
    title: VOLUME_TITLES[number],
    available: available.has(number),
  }));

  return (
    <div className="bg-aura">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <section className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-5 gap-1.5 border border-primary/15 px-3 py-1"
          >
            <Sparkles className="size-3.5" />
            قارئ تفاعلي مع معجم لكل كلمة
          </Badge>
          <h1 className="text-gradient font-naskh text-5xl font-bold leading-tight sm:text-6xl">
            العربية بين يديك
          </h1>
          <p className="mt-5 text-balance text-muted-foreground sm:text-lg">
            اقرأ نصوص الكتاب، وانقر أي كلمة لتظهر لك معناها وجذرها ومرادفاتها
            وأضدادها وأمثلتها، وعدد مرات ورود الجذر في النصوص.
          </p>
        </section>

        <div className="mt-14 space-y-6">
          <StudyStats />
          <ContinueReading />
        </div>

        <section>
          <h2 className="mb-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            اختر الجزء
            <span className="h-px flex-1 bg-border" />
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {volumes.map((v) =>
              v.available ? (
                <Link
                  key={v.number}
                  href={`/jilid/${v.number}`}
                  className="group"
                >
                  <Card className="h-full transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-md group-hover:shadow-primary/5">
                    <CardHeader>
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <BookText className="size-6" />
                      </span>
                      <CardTitle className="mt-3 font-naskh text-xl">
                        {v.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-primary">
                        ابدأ القراءة
                        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ) : (
                <Card
                  key={v.number}
                  className="h-full opacity-60"
                  aria-disabled
                >
                  <CardHeader>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <BookText className="size-6" />
                    </span>
                    <CardTitle className="mt-3 font-naskh text-xl">
                      {v.title}
                    </CardTitle>
                    <CardDescription>
                      <Badge variant="outline">قريباً</Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
