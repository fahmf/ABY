import Link from "next/link";
import { ArrowLeft, BookText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// MVP: jilid 1 aktif, sisanya "قريباً". Nanti diambil dari Supabase.
const volumes = [
  { number: 1, title: "الكتاب الأول", available: true },
  { number: 2, title: "الكتاب الثاني", available: false },
  { number: 3, title: "الكتاب الثالث", available: false },
  { number: 4, title: "الكتاب الرابع", available: false },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Sparkles className="size-3" />
          قارئ تفاعلي مع معجم لكل كلمة
        </Badge>
        <h1 className="font-naskh text-4xl font-bold leading-tight sm:text-5xl">
          العربية بين يديك
        </h1>
        <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
          اقرأ نصوص الكتاب، وانقر أي كلمة لتظهر لك معناها وجذرها ومرادفاتها
          وأضدادها وأمثلتها، وعدد مرات ورود الجذر في النصوص.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          اختر الجزء
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {volumes.map((v) =>
            v.available ? (
              <Link key={v.number} href={`/jilid/${v.number}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                  <CardHeader>
                    <BookText className="size-6 text-primary" />
                    <CardTitle className="mt-2 font-naskh text-xl">
                      {v.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 text-primary">
                      ابدأ القراءة
                      <ArrowLeft className="size-3.5" />
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
                  <BookText className="size-6 text-muted-foreground" />
                  <CardTitle className="mt-2 font-naskh text-xl">
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
  );
}
