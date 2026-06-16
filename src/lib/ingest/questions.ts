import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuestions, isGeminiConfigured } from "./gemini";

export type GenerateQuestionsResult = {
  lessonId: string;
  count: number;
};

type QuestionRow = {
  lesson_id: string;
  type: "mcq" | "truefalse";
  prompt: string;
  options: string[];
  answer: number;
  explanation: string | null;
  sort_order: number;
  status: "published";
};

/**
 * Hasilkan soal pemahaman untuk sebuah pelajaran lalu simpan (langsung
 * published). Idempoten: soal lama pelajaran ini dihapus dan diganti dengan
 * hasil terbaru, jadi menekan tombol lagi = regenerasi.
 */
export async function generateLessonQuestions(
  lessonId: string
): Promise<GenerateQuestionsResult> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const supabase = createAdminClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id,body_ar")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) throw new Error("النصّ غير موجود.");

  const body = (lesson as { body_ar: string }).body_ar ?? "";
  if (!body.trim()) return { lessonId, count: 0 };

  const generated = await generateQuestions(body);

  // Saring & rapikan: hanya soal valid (prompt ada, ≥2 pilihan, jawaban dalam
  // rentang). Untuk truefalse paksa pilihan baku agar konsisten di UI.
  const rows: QuestionRow[] = [];
  for (const q of generated) {
    const prompt = (q.prompt ?? "").trim();
    const type = q.type === "truefalse" ? "truefalse" : "mcq";
    let options = Array.isArray(q.options)
      ? q.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    let answer = Math.trunc(Number(q.answer));

    if (type === "truefalse") {
      // Jaga konsistensi: selalu ["صحيح","خطأ"]; pertahankan sisi yang benar.
      const wasTrue = answer === 0;
      options = ["صحيح", "خطأ"];
      answer = wasTrue ? 0 : 1;
    }

    if (
      !prompt ||
      options.length < 2 ||
      new Set(options).size !== options.length ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer >= options.length
    ) {
      continue;
    }

    rows.push({
      lesson_id: lessonId,
      type,
      prompt,
      options,
      answer,
      explanation: (q.explanation ?? "").trim() || null,
      sort_order: rows.length,
      status: "published",
    });
  }

  // Ganti total: hapus soal lama lalu sisipkan yang baru.
  const { error: delErr } = await supabase
    .from("lesson_questions")
    .delete()
    .eq("lesson_id", lessonId);
  if (delErr) throw delErr;

  if (rows.length > 0) {
    const { error: insErr } = await supabase
      .from("lesson_questions")
      .insert(rows);
    if (insErr) throw insErr;
  }

  return { lessonId, count: rows.length };
}
