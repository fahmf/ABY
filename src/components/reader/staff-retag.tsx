"use client";

import * as React from "react";
import { Loader2, Unlink, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LemmaHit = {
  lemma_ar: string;
  meaning_ar: string;
  word_type: string;
  root_ar: string;
};

type Msg = { kind: "ok" | "warn" | "err"; text: string };

/**
 * Khusus staff: koreksi kecocokan sebuah kata di teks ini secara permanen.
 * - تعيين: petakan kata ke lemma yang benar (harus ada sebagai مدخل منشور).
 * - إزالة الربط: hapus kecocokan yang salah (kata tetap bisa diklik).
 * Menyimpan langsung ke tabel tokens via /api/admin/retag.
 *
 * Kotak isian memberi saran مدخل منشور saat mengetik agar staf MEMILIH lemma
 * yang benar-benar ada (bukan mengetik bentuk jamak/permukaan tanpa entri),
 * sekaligus memisahkan homograf (mis. سُوق "pasar" ↔ سَوْق مصدر ساق).
 */
export function StaffRetag({
  surface,
  lessonSlug,
  currentLemma,
  onChanged,
}: {
  surface: string;
  lessonSlug: string;
  currentLemma?: string;
  onChanged?: (lemma: string | null) => void;
}) {
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState<"assign" | "clear" | null>(null);
  const [msg, setMsg] = React.useState<Msg | null>(null);
  const [hits, setHits] = React.useState<LemmaHit[]>([]);
  // Lemma yang baru dipilih dari daftar — jangan picu pencarian ulang untuknya.
  const [picked, setPicked] = React.useState<string | null>(null);

  // Saran lemma منشور saat mengetik (di-debounce). Semua setState ditunda ke
  // dalam timeout agar tak berjalan sinkron di badan efek.
  React.useEffect(() => {
    const q = value.trim();
    let active = true;
    const t = setTimeout(() => {
      if (!active) return;
      if (q.length < 1 || q === picked) {
        setHits([]);
        return;
      }
      fetch(`/api/admin/lemma-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => active && setHits(d.entries ?? []))
        .catch(() => active && setHits([]));
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value, picked]);

  async function send(lemma: string | null) {
    setBusy(lemma === null ? "clear" : "assign");
    setMsg(null);
    setHits([]);
    try {
      const res = await fetch("/api/admin/retag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonSlug, surface, lemma }),
      });
      const d = await res.json().catch(() => ({}));
      const n: number = d.updated ?? 0;
      if (res.ok && lemma === null) {
        setMsg({ kind: "ok", text: `أُزيل الربط من ${n} موضعًا.` });
        onChanged?.(null);
        setValue("");
      } else if (res.ok && n > 0) {
        setMsg({ kind: "ok", text: `تمّ ربط ${n} موضعًا بـ «${d.lemma ?? lemma}».` });
        onChanged?.(lemma);
        setValue("");
        setPicked(null);
      } else if (res.ok) {
        // مدخل موجود لكن لا token في الدرس يطابق هذه الكلمة → لم يُحفظ شيء فعليًّا.
        setMsg({
          kind: "warn",
          text: "لم تُطابِق هذه الكلمةُ أيَّ موضعٍ في الدرس، فلم يُحفَظ شيء.",
        });
      } else if (res.status === 404) {
        setMsg({
          kind: "err",
          text: "لا يوجد مدخل منشور بهذا اللفظ — اكتب جزءًا منه ثمّ اختَر من القائمة.",
        });
      } else if (res.status === 403) {
        setMsg({ kind: "err", text: "غير مصرّح." });
      } else {
        setMsg({ kind: "err", text: "تعذّر الحفظ، حاول مجدّدًا." });
      }
    } catch {
      setMsg({ kind: "err", text: "تعذّر الاتصال." });
    } finally {
      setBusy(null);
    }
  }

  // Pilih lemma dari daftar saran → tetapkan langsung dengan lemma EKSAK-nya.
  function choose(hit: LemmaHit) {
    setPicked(hit.lemma_ar);
    setValue(hit.lemma_ar);
    send(hit.lemma_ar);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-primary">
        <Wand2 className="size-4" /> تصحيح الكشف (للمشرف)
      </p>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setPicked(null);
            setValue(e.target.value);
          }}
          placeholder="اللفظ الصحيح (lemma)…"
          className="h-9 font-naskh"
          dir="rtl"
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5"
          disabled={!value.trim() || busy !== null}
          onClick={() => send(value.trim())}
        >
          {busy === "assign" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          تعيين
        </Button>
      </div>

      {hits.length > 0 && (
        <ul className="flex flex-col gap-0.5 rounded-md border bg-background p-1 shadow-sm">
          {hits.map((h) => (
            <li key={h.lemma_ar}>
              <button
                type="button"
                dir="rtl"
                onClick={() => choose(h)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-right transition-colors hover:bg-accent"
              >
                <span className="font-naskh text-base">{h.lemma_ar}</span>
                {h.word_type && (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {h.word_type}
                  </span>
                )}
                <span className="truncate text-xs text-muted-foreground">
                  {h.meaning_ar}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {currentLemma && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          disabled={busy !== null}
          onClick={() => send(null)}
        >
          {busy === "clear" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Unlink className="size-4" />
          )}
          إزالة الربط الحالي
        </Button>
      )}

      {msg && (
        <p
          className={
            "text-xs " +
            (msg.kind === "ok"
              ? "text-emerald-700 dark:text-emerald-300"
              : msg.kind === "warn"
                ? "text-amber-700 dark:text-amber-300"
                : "text-destructive")
          }
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
