"use client";

import * as React from "react";

/*
  Pelafalan via Web Speech API (SpeechSynthesis) — gratis & di perangkat.
  Kualitas suara bergantung pada sistem/peramban pengguna; bila tak ada suara
  Arab, peramban memakai suara bawaan (mungkin kurang tepat) — tetap berguna.
*/

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const noopSubscribe = () => () => {};

/**
 * Hook aman-hidrasi: false di server/render awal, lalu nilai sebenarnya di
 * klien — tanpa setState-in-effect.
 */
export function useSpeechSupported(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    speechSupported,
    () => false
  );
}

let cachedArVoice: SpeechSynthesisVoice | null | undefined;

function pickArabicVoice(): SpeechSynthesisVoice | null {
  if (cachedArVoice !== undefined) return cachedArVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedArVoice =
    voices.find((v) => v.lang?.toLowerCase().startsWith("ar")) ?? null;
  return cachedArVoice;
}

// Daftar suara bisa terisi belakangan; segarkan cache saat berubah.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedArVoice = undefined;
  };
}

/** Lafalkan sebuah teks Arab. Mengembalikan false bila tak didukung. */
export function speak(text: string): boolean {
  if (!speechSupported() || !text.trim()) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar";
    u.rate = 0.9;
    const voice = pickArabicVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}
