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

/** Panggil Gemini untuk sekumpulan kata (satu batch). */
export async function generateEntries(
  words: string[]
): Promise<GeminiEntry[]> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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
}
