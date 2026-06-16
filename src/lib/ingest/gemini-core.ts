import { GoogleGenAI, Type } from "@google/genai";

import { isGeminiConfigured } from "@/lib/supabase/config";

// Modul Gemini untuk pipeline ingest. Menghasilkan entri kamus + akar per kata.

export { isGeminiConfigured };

export type GeminiEntry = {
  word: string; // lafaz yang dikirim (surface)
  lemma: string; // lema/mujarrad
  root: string; // akar, mis. "ك ت ب"
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
  word_type?: string;
  plural_ar?: string;
  singular_ar?: string;
  past_ar?: string;
  present_ar?: string;
  masdar_ar?: string;
};

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      lemma: { type: Type.STRING },
      root: { type: Type.STRING },
      meaning: { type: Type.STRING },
      synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
      antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
      examples: { type: Type.ARRAY, items: { type: Type.STRING } },
      word_type: { type: Type.STRING },
      plural_ar: { type: Type.STRING },
      singular_ar: { type: Type.STRING },
      past_ar: { type: Type.STRING },
      present_ar: { type: Type.STRING },
      masdar_ar: { type: Type.STRING },
    },
    required: ["word", "lemma", "root", "meaning"],
    propertyOrdering: [
      "word",
      "lemma",
      "root",
      "meaning",
      "word_type",
      "plural_ar",
      "singular_ar",
      "past_ar",
      "present_ar",
      "masdar_ar",
      "synonyms",
      "antonyms",
      "examples",
    ],
  },
};

const SYSTEM =
  "أنت معلّم عربية للناطقين بغيرها (مبتدئون، مستوى كتاب «العربية بين يديك»). لكل كلمةٍ مُعطاة أعطِ: " +
  "lemma (اللفظ المجرّد)، root (الجذر مفصولاً بمسافات مثل: ك ت ب)، " +
  "meaning (شرح بسيط جدًّا بجملة قصيرة واحدة، بكلمات شائعة يفهمها المبتدئ — " +
  "تجنّب الكلمات النادرة والتعريفات المعجمية المعقّدة؛ اشرح كما تشرح لطالب في أول سنة)، " +
  "synonyms (مرادفات شائعة وسهلة، اذكر مرادفين على الأقل إن وُجدت)، antonyms (أضداد الكلمة، اذكر ضدين على الأقل إن وُجدت)، " +
  "examples (مثالان اثنان على الأقل: جمل قصيرة سهلة من الحياة اليومية). " +
  "بالإضافة إلى ذلك، قدّم المعلومات الصرفية (إن وُجدت): " +
  "word_type (نوع الكلمة: اسم، فعل، حرف)، plural_ar (الجمع للأسماء)، singular_ar (المفرد للجموع)، " +
  "past_ar (الماضي للأفعال)، present_ar (المضارع للأفعال)، masdar_ar (المصدر). " +
  "أعِد JSON فقط بالعربية دون أي شرح إضافي. الحقول الصرفية اختيارية وتُترك فارغة إذا لم تنطبق.";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Status HTTP transien yang layak dicoba ulang (overload/rate-limit/internal). */
const RETRYABLE = new Set([429, 500, 503]);

function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: number; code?: number };
    return e.status ?? e.code;
  }
  return undefined;
}

/**
 * Daftar model: yang utama (GEMINI_MODEL) lalu fallback opsional
 * (GEMINI_FALLBACK_MODEL, dipisah koma) bila yang utama kelebihan beban.
 */
function modelChain(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODEL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

/** Daftar model efektif (utama + fallback). Berguna untuk round-robin di CLI. */
export function geminiModels(): string[] {
  return modelChain();
}

/**
 * Respons Gemini kosong / bukan JSON valid. Bukan galat transien — mencoba
 * ulang otomatis hanya membakar kuota, jadi langsung dilempar ke pemanggil
 * (pipeline menyimpan kursor; pengguna bisa menekan "معالجة" lagi).
 */
export class GeminiParseError extends Error {}

function parseEntries(text: string | undefined, model: string): GeminiEntry[] {
  if (!text) {
    throw new GeminiParseError(`Gemini (${model}) mengembalikan respons kosong.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(
      `Respons Gemini (${model}) bukan JSON valid (kemungkinan terpotong):`,
      text.slice(0, 200)
    );
    throw new GeminiParseError(`Gemini (${model}) mengembalikan JSON tak valid.`);
  }
  if (!Array.isArray(parsed)) {
    console.error(
      `Respons Gemini (${model}) bukan array:`,
      JSON.stringify(parsed).slice(0, 200)
    );
    throw new GeminiParseError(`Gemini (${model}) mengembalikan bentuk tak terduga.`);
  }
  return parsed as GeminiEntry[];
}

/** Panggil Gemini untuk sekumpulan kata (satu batch).
 *  opts.models: paksa urutan model tertentu (mis. untuk round-robin antar
 *  bucket RPM); bila kosong, pakai rantai default dari env. */
export async function generateEntries(
  words: string[],
  opts?: { models?: string[] }
): Promise<GeminiEntry[]> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const models = opts?.models?.length ? opts.models : modelChain();
  const maxAttempts = 5; // per model

  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: `${SYSTEM}\n\nالكلمات:\n${words.join("\n")}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            temperature: 0.2,
            // Beri ruang besar agar batch banyak-kata tidak terpotong (JSON
            // tak lengkap → gagal di-parse). Tier gratis dibatasi RPM, bukan
            // TPM, jadi batch besar + sedikit request justru lebih efisien.
            maxOutputTokens: 32768,
          },
        });

        return parseEntries(res.text, model);
      } catch (err) {
        if (err instanceof GeminiParseError) throw err;
        lastErr = err;
        const status = statusOf(err);
        // Error non-transien: percuma diulang, lempar langsung.
        if (status !== undefined && !RETRYABLE.has(status)) throw err;
        // Sudah percobaan terakhir untuk model ini → pindah ke fallback.
        if (attempt === maxAttempts) break;
        // Backoff eksponensial dasar
        let delay = 2 ** (attempt - 1) * 2000 + Math.random() * 500;
        
        // Coba tangkap saran waktu dari pesan error Gemini ("Please retry in X.Xs")
        if (err instanceof Error) {
          const match = err.message.match(/retry in ([\d\.]+)s/i);
          if (match && match[1]) {
            const suggested = parseFloat(match[1]) * 1000 + 500; // +500ms safety margin
            delay = Math.max(delay, suggested);
          }
        }
        
        await sleep(delay);
      }
    }
  }

  throw lastErr ?? new Error("Gagal memanggil Gemini.");
}

// ===================== Soal pemahaman teks =====================

export type GeneratedQuestion = {
  type: "mcq" | "truefalse";
  prompt: string;
  options: string[];
  answer: number; // indeks jawaban benar dalam options
  explanation?: string;
};

const QUESTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING }, // "mcq" | "truefalse"
      prompt: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      answer: { type: Type.INTEGER },
      explanation: { type: Type.STRING },
    },
    required: ["type", "prompt", "options", "answer"],
    propertyOrdering: ["type", "prompt", "options", "answer", "explanation"],
  },
};

const QUESTION_SYSTEM =
  "أنت معلّم عربية للناطقين بغيرها (مستوى «العربية بين يديك»). اقرأ النصّ التالي " +
  "وأنشئ من 5 إلى 8 أسئلةٍ تقيس فهم الطالب لمضمون النصّ (لا لمعاني المفردات فقط). " +
  "اجعل الأسئلة والخيارات بعربيةٍ بسيطةٍ يفهمها المبتدئ، وكلّ سؤالٍ تكون إجابته " +
  "مستخرجةً من النصّ صراحةً (لا تتطلّب معلوماتٍ خارجيّة). " +
  "نوّع بين نوعين: " +
  "type=\"mcq\" (اختيار من متعدّد): options أربعة خياراتٍ مختلفةٍ معقولة، " +
  "answer رقم فهرس الخيار الصحيح (يبدأ من 0). " +
  "type=\"truefalse\" (صح أو خطأ): options دائمًا [\"صحيح\", \"خطأ\"]، " +
  "answer=0 إن كانت العبارة صحيحةً و1 إن كانت خاطئة. " +
  "explanation: جملةٌ قصيرةٌ تبرّر الإجابة بالاستناد إلى النصّ. " +
  "أعِد JSON فقط بالعربية دون أيّ شرحٍ إضافيّ.";

/** Hasilkan soal pemahaman dari teks pelajaran (satu panggilan Gemini). */
export async function generateQuestions(
  text: string,
  opts?: { models?: string[] }
): Promise<GeneratedQuestion[]> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const models = opts?.models?.length ? opts.models : modelChain();
  const maxAttempts = 4;

  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: `${QUESTION_SYSTEM}\n\nالنصّ:\n${text}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: QUESTION_SCHEMA,
            temperature: 0.4,
            maxOutputTokens: 8192,
          },
        });
        const parsed = parseEntries(res.text, model) as unknown as GeneratedQuestion[];
        return parsed;
      } catch (err) {
        if (err instanceof GeminiParseError) throw err;
        lastErr = err;
        const status = statusOf(err);
        if (status !== undefined && !RETRYABLE.has(status)) throw err;
        if (attempt === maxAttempts) break;
        const delay = 2 ** (attempt - 1) * 2000 + Math.random() * 500;
        await sleep(delay);
      }
    }
  }

  throw lastErr ?? new Error("Gagal memanggil Gemini.");
}
