import "server-only";
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
    },
    required: ["word", "lemma", "root", "meaning"],
    propertyOrdering: [
      "word",
      "lemma",
      "root",
      "meaning",
      "synonyms",
      "antonyms",
      "examples",
    ],
  },
};

const SYSTEM =
  "أنت معجميٌّ خبيرٌ في العربية الفصحى. لكل كلمةٍ مُعطاة أعطِ: " +
  "lemma (اللفظ المجرّد)، root (الجذر مفصولاً بمسافات مثل: ك ت ب)، " +
  "meaning (تعريف موجز بالعربية)، synonyms (مرادفات)، antonyms (أضداد)، " +
  "examples (مثال أو مثالان بالعربية). أعِد JSON فقط بالعربية دون أي شرح إضافي.";

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

/** Panggil Gemini untuk sekumpulan kata (satu batch). */
export async function generateEntries(
  words: string[]
): Promise<GeminiEntry[]> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const models = modelChain();
  const maxAttempts = 4; // per model

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
          },
        });

        const text = res.text;
        if (!text) return [];
        try {
          const parsed = JSON.parse(text) as GeminiEntry[];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      } catch (err) {
        lastErr = err;
        const status = statusOf(err);
        // Error non-transien: percuma diulang, lempar langsung.
        if (status !== undefined && !RETRYABLE.has(status)) throw err;
        // Sudah percobaan terakhir untuk model ini → pindah ke fallback.
        if (attempt === maxAttempts) break;
        // Backoff eksponensial + jitter: 1s, 2s, 4s (±250ms).
        const delay = 2 ** (attempt - 1) * 1000 + Math.random() * 250;
        await sleep(delay);
      }
    }
  }

  throw lastErr ?? new Error("Gagal memanggil Gemini.");
}
