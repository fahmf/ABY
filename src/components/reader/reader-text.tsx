"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Minus,
  Plus,
  BookOpen,
  Book,
  CheckCircle2,
  Circle,
  GraduationCap,
  Settings2,
  Play,
  Square,
  ListChecks,
  Printer,
  Type,
  AlignJustify,
  MoveHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { stripDiacritics, tokenize } from "@/lib/arabic";
import { useLearner, learner } from "@/lib/learner/store";
import {
  cancelSpeech,
  makeUtterance,
  useSpeechSupported,
} from "@/lib/learner/speech";
import { HIGHLIGHT_BG } from "@/components/learner/word-note";
import type { HighlightColor } from "@/lib/learner/store";
import { track } from "@/lib/learner/track";
import { DictionaryPanel } from "./dictionary-panel";

const FONT_SIZES = [
  "text-xl sm:text-2xl",
  "text-2xl sm:text-3xl",
  "text-3xl sm:text-4xl",
  "text-4xl sm:text-5xl",
];
const LINE_STEPS = [2.0, 2.4, 2.8, 3.2];
const WIDTHS = ["max-w-lg", "max-w-xl", "max-w-2xl"];
const FAMILIES = ["font-naskh", "font-sans"] as const;
const FAMILY_LABEL = ["نسخ (أميري)", "حديث (Cairo)"];

const ONBOARD_KEY = "aby:onboarded:v1";

export type LessonMeta = {
  slug: string;
  title: string;
  volume: number;
  unitSlug: string;
};

export function ReaderText({
  text,
  dictMatches,
  lesson,
  isStaff = false,
}: {
  text: string;
  dictMatches?: Record<number, string>;
  lesson?: LessonMeta;
  isStaff?: boolean;
}) {
  const [showHarakat, setShowHarakat] = React.useState(true);
  const [showDictMatches, setShowDictMatches] = React.useState(true);
  const [fontStep, setFontStep] = React.useState(1);
  const [lineStep, setLineStep] = React.useState(2);
  const [widthStep, setWidthStep] = React.useState(2);
  const [familyStep, setFamilyStep] = React.useState(0);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [showOnboard, setShowOnboard] = React.useState(false);

  const canSpeak = useSpeechSupported();
  const [playing, setPlaying] = React.useState(false);
  const [speakingIndex, setSpeakingIndex] = React.useState<number | null>(null);
  const playingRef = React.useRef(false);

  const learnerState = useLearner();
  const knownLemmas = learnerState.known;
  const highlights = learnerState.highlights;
  const done = lesson ? !!learnerState.progress[lesson.slug]?.done : false;
  const [selected, setSelected] = React.useState<{
    surface: string;
    lemma?: string;
  } | null>(null);
  const [highlighted, setHighlighted] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLParagraphElement>(null);

  const segments = React.useMemo(() => tokenize(text), [text]);
  const wordSegs = React.useMemo(
    () => segments.filter((s) => s.type === "word"),
    [segments]
  );

  // Muat preferensi baca dari localStorage.
  React.useEffect(() => {
    const num = (k: string, set: (n: number) => void) => {
      const v = localStorage.getItem(k);
      if (v !== null && Number.isFinite(Number(v))) set(Number(v));
    };
    const t = setTimeout(() => {
      const h = localStorage.getItem("aby:harakat");
      const d = localStorage.getItem("aby:showDictMatches");
      if (h !== null) setShowHarakat(h === "1");
      if (d !== null) setShowDictMatches(d === "1");
      num("aby:fontStep", setFontStep);
      num("aby:lineStep", setLineStep);
      num("aby:widthStep", setWidthStep);
      num("aby:familyStep", setFamilyStep);
      if (lesson && !localStorage.getItem(ONBOARD_KEY)) setShowOnboard(true);
    }, 0);
    return () => clearTimeout(t);
  }, [lesson]);

  React.useEffect(() => {
    localStorage.setItem("aby:harakat", showHarakat ? "1" : "0");
  }, [showHarakat]);
  React.useEffect(() => {
    localStorage.setItem("aby:showDictMatches", showDictMatches ? "1" : "0");
  }, [showDictMatches]);
  React.useEffect(() => {
    localStorage.setItem("aby:fontStep", String(fontStep));
  }, [fontStep]);
  React.useEffect(() => {
    localStorage.setItem("aby:lineStep", String(lineStep));
  }, [lineStep]);
  React.useEffect(() => {
    localStorage.setItem("aby:widthStep", String(widthStep));
  }, [widthStep]);
  React.useEffect(() => {
    localStorage.setItem("aby:familyStep", String(familyStep));
  }, [familyStep]);

  // Catat kemajuan membaca saat membuka pelajaran (untuk "تابع القراءة").
  React.useEffect(() => {
    if (!lesson) return;
    const m = window.location.hash.match(/^#t=(\d+)$/);
    learner.setProgress({
      slug: lesson.slug,
      title: lesson.title,
      volume: lesson.volume,
      unitSlug: lesson.unitSlug,
      position: m ? Number(m[1]) : 0,
    });
    track("lesson", lesson.slug);
  }, [lesson]);

  // Deep-link: #t=<position> → scroll + sorot token, lalu redam setelah jeda.
  React.useEffect(() => {
    // Timer redam milik hash sebelumnya harus dibatalkan saat hash berganti,
    // agar sorotan baru tak ikut dipadamkan oleh timer lama.
    let clearDimTimer: (() => void) | undefined;
    const applyHash = () => {
      const m = window.location.hash.match(/^#t=(\d+)$/);
      if (!m) return;
      clearDimTimer?.();
      const pos = Number(m[1]);
      setHighlighted(pos);
      const el = containerRef.current?.querySelector<HTMLElement>(
        `[data-token="${pos}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = window.setTimeout(() => setHighlighted(null), 2600);
      clearDimTimer = () => window.clearTimeout(timer);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => {
      window.removeEventListener("hashchange", applyHash);
      clearDimTimer?.();
    };
  }, []);

  // Hentikan الاستماع saat مغادرة الصفحة.
  React.useEffect(() => {
    return () => {
      playingRef.current = false;
      cancelSpeech();
    };
  }, []);

  function stopListening() {
    playingRef.current = false;
    setPlaying(false);
    setSpeakingIndex(null);
    cancelSpeech();
  }

  // وضع الاستماع: انطق الكلمات تِباعًا مع تظليل الكلمة الجارية.
  function startListening() {
    if (!canSpeak || wordSegs.length === 0) return;
    cancelSpeech();
    playingRef.current = true;
    setPlaying(true);
    let i = 0;
    const step = () => {
      if (!playingRef.current || i >= wordSegs.length) {
        stopListening();
        return;
      }
      const seg = wordSegs[i] as Extract<
        (typeof wordSegs)[number],
        { type: "word" }
      >;
      setSpeakingIndex(seg.index);
      containerRef.current
        ?.querySelector<HTMLElement>(`[data-token="${seg.index}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      const u = makeUtterance(seg.text);
      if (!u) {
        stopListening();
        return;
      }
      u.onend = () => {
        i++;
        step();
      };
      u.onerror = () => {
        i++;
        step();
      };
      window.speechSynthesis.speak(u);
    };
    step();
  }

  function dismissOnboard() {
    localStorage.setItem(ONBOARD_KEY, "1");
    setShowOnboard(false);
  }

  return (
    <div>
      {showOnboard && (
        <div className="no-print mb-5 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-foreground">مرحبًا بك في القارئ 👋</p>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>انقر أيّ كلمة لرؤية معناها وحفظها للمراجعة.</li>
              {canSpeak && <li>اضغط «استماع» ليُقرأ النصّ مع تظليل الكلمات.</li>}
              <li>من «إعدادات القراءة» تتحكّم بالخط والتباعد والعرض.</li>
            </ul>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissOnboard}>
            فهمت
          </Button>
        </div>
      )}

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="تصغير الخط"
            disabled={fontStep === 0}
            onClick={() => setFontStep((s) => Math.max(0, s - 1))}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="تكبير الخط"
            disabled={fontStep === FONT_SIZES.length - 1}
            onClick={() => setFontStep((s) => Math.min(FONT_SIZES.length - 1, s + 1))}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="إعدادات القراءة"
            title="إعدادات القراءة"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSpeak && (
            <Button
              variant={playing ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={playing ? stopListening : startListening}
            >
              {playing ? (
                <Square className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              {playing ? "إيقاف" : "استماع"}
            </Button>
          )}
          {dictMatches && Object.keys(dictMatches).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowDictMatches((v) => !v)}
            >
              {showDictMatches ? (
                <Book className="size-3.5" />
              ) : (
                <BookOpen className="size-3.5" />
              )}
              {showDictMatches ? "إخفاء كلمات المعجم" : "تحديد كلمات المعجم"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowHarakat((v) => !v)}
          >
            {showHarakat ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {showHarakat ? "إخفاء التشكيل" : "إظهار التشكيل"}
          </Button>
        </div>
      </div>

      <div className={`mx-auto ${WIDTHS[widthStep]} print-area`}>
        <p
          ref={containerRef}
          className={`${FAMILIES[familyStep]} ${FONT_SIZES[fontStep]}`}
          style={{ lineHeight: LINE_STEPS[lineStep] }}
        >
          {segments.map((seg, i) => {
            if (seg.type === "sep") {
              return <span key={i}>{seg.text}</span>;
            }
            const display = showHarakat ? seg.text : stripDiacritics(seg.text);
            const isActive = selected !== null && selected.surface === seg.text;
            const isHighlighted = highlighted === seg.index;
            const isSpeaking = speakingIndex === seg.index;
            const matchLemma = dictMatches?.[seg.index];
            const isDictMatch = !!matchLemma;
            const isKnown = !!matchLemma && !!knownLemmas[matchLemma];
            const userColor = matchLemma
              ? (highlights[matchLemma] as HighlightColor | undefined)
              : undefined;

            const open = () => {
              setSelected({ surface: seg.text, lemma: matchLemma });
              if (matchLemma) track("word", matchLemma);
              if (lesson) {
                learner.setProgress({
                  slug: lesson.slug,
                  title: lesson.title,
                  volume: lesson.volume,
                  unitSlug: lesson.unitSlug,
                  position: seg.index,
                });
              }
            };

            return (
              <span
                key={i}
                role="button"
                tabIndex={0}
                data-token={seg.index}
                aria-label={`الكلمة: ${stripDiacritics(seg.text)}`}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }}
                className={
                  "cursor-pointer rounded-md px-0.5 transition-colors hover:bg-accent " +
                  (isActive ? "bg-primary/15 text-primary " : "") +
                  (isSpeaking
                    ? "bg-primary/20 ring-2 ring-primary/50 "
                    : "") +
                  (isHighlighted
                    ? "bg-amber-300/60 dark:bg-amber-400/30 ring-2 ring-amber-400/50 "
                    : "") +
                  (userColor && !isActive && !isSpeaking && !isHighlighted
                    ? HIGHLIGHT_BG[userColor] + " "
                    : "") +
                  // Kata yang sudah dikuasai diredupkan agar kata baru menonjol.
                  (isKnown && !isActive && !userColor ? "text-muted-foreground/50 " : "") +
                  (isDictMatch && showDictMatches && !isActive && !isKnown && !userColor
                    ? "border-b border-dashed border-primary/60 pb-[2px] "
                    : "")
                }
              >
                {display}
              </span>
            );
          })}
        </p>
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent side="bottom" className="pb-2">
          {selected && (
            <DictionaryPanel
              surface={selected.surface}
              lemma={selected.lemma}
              lessonSlug={lesson?.slug}
              isStaff={isStaff}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* إعدادات القراءة */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="pb-6">
          <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-2">
            <h2 className="text-lg font-semibold">إعدادات القراءة</h2>

            <SettingRow icon={<Type className="size-4" />} label="نوع الخط">
              <div className="flex gap-2">
                {FAMILIES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFamilyStep(i)}
                    className={
                      "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                      (familyStep === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent")
                    }
                  >
                    {FAMILY_LABEL[i]}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              icon={<AlignJustify className="size-4" />}
              label="تباعد الأسطر"
            >
              <Stepper
                value={lineStep}
                max={LINE_STEPS.length - 1}
                onChange={setLineStep}
              />
            </SettingRow>

            <SettingRow
              icon={<MoveHorizontal className="size-4" />}
              label="عرض النصّ"
            >
              <Stepper
                value={widthStep}
                max={WIDTHS.length - 1}
                onChange={setWidthStep}
              />
            </SettingRow>
          </div>
        </SheetContent>
      </Sheet>

      {lesson && (
        <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button
            variant={done ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => learner.setDone(lesson.slug, !done)}
          >
            {done ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <Circle className="size-4" />
            )}
            {done ? "تمّت قراءته" : "وضع علامة: تمّت القراءة"}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              طباعة
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/baca/${lesson.slug}/mufradat`}>
                <ListChecks className="size-4" />
                كلمات الدرس
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/baca/${lesson.slug}/ikhtibar`}>
                <GraduationCap className="size-4" />
                اختبر نفسك
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="أقل"
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <div className="flex w-16 justify-center gap-1">
        {Array.from({ length: max + 1 }).map((_, i) => (
          <span
            key={i}
            className={
              "h-1.5 w-4 rounded-full " +
              (i <= value ? "bg-primary" : "bg-muted")
            }
          />
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        aria-label="أكثر"
        disabled={value === max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
