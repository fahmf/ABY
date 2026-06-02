"use client";

import * as React from "react";

/*
  Penyimpanan belajar pribadi — SEPENUHNYA di sisi klien (localStorage), tanpa
  perlu akun. Menyimpan: kata simpanan (مفرداتي), kata yang sudah dikuasai,
  状態 kartu hafalan (SRS/Leitner), dan kemajuan membaca.

  Memakai satu external store + useSyncExternalStore agar semua komponen
  tersinkron (termasuk antar-tab) tanpa hujan useEffect.
*/

const KEY = "aby:learner:v1";

export type SavedWord = {
  lemma: string;
  root?: string;
  meaning?: string;
  surface?: string;
  addedAt: number;
};

export type SrsCard = {
  box: number; // 0..4 (kotak Leitner)
  due: number; // epoch ms — jatuh tempo berikutnya
  reps: number;
  lapses: number;
};

export type Progress = {
  slug: string;
  title: string;
  volume: number;
  unitSlug: string;
  position: number; // token terakhir yang disentuh
  done: boolean;
  at: number;
};

export type LearnerState = {
  saved: Record<string, SavedWord>;
  known: Record<string, true>;
  srs: Record<string, SrsCard>;
  progress: Record<string, Progress>;
};

const EMPTY: LearnerState = { saved: {}, known: {}, srs: {}, progress: {} };

// Interval Leitner (hari) per kotak 0..4.
const DAY = 86_400_000;
const MIN = 60_000;
const INTERVALS_DAYS = [0, 1, 3, 7, 16];
const MAX_BOX = INTERVALS_DAYS.length - 1;

let state: LearnerState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): LearnerState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { saved: {}, known: {}, srs: {}, progress: {} };
    const p = JSON.parse(raw) as Partial<LearnerState>;
    return {
      saved: p.saved ?? {},
      known: p.known ?? {},
      srs: p.srs ?? {},
      progress: p.progress ?? {},
    };
  } catch {
    return { saved: {}, known: {}, srs: {}, progress: {} };
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = read();
    loaded = true;
  }
}

function commit(next: LearnerState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* kuota penuh / mode privat — abaikan */
    }
  }
  for (const l of listeners) l();
}

if (typeof window !== "undefined") {
  // Sinkronisasi antar-tab.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      for (const l of listeners) l();
    }
  });
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot() {
  ensureLoaded();
  return state;
}
function getServerSnapshot() {
  return EMPTY;
}

/** Hook reaktif: kembalikan seluruh state belajar. */
export function useLearner(): LearnerState {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------------- aksi (di luar React) ----------------

export const learner = {
  isSaved(lemma: string) {
    ensureLoaded();
    return !!state.saved[lemma];
  },
  isKnown(lemma: string) {
    ensureLoaded();
    return !!state.known[lemma];
  },

  /** Simpan kata + buat kartu SRS baru (jatuh tempo sekarang). */
  save(word: SavedWord) {
    ensureLoaded();
    if (state.saved[word.lemma]) return;
    commit({
      ...state,
      saved: { ...state.saved, [word.lemma]: { ...word, addedAt: Date.now() } },
      srs: {
        ...state.srs,
        [word.lemma]: state.srs[word.lemma] ?? {
          box: 0,
          due: Date.now(),
          reps: 0,
          lapses: 0,
        },
      },
    });
  },

  remove(lemma: string) {
    ensureLoaded();
    const saved = { ...state.saved };
    const srs = { ...state.srs };
    delete saved[lemma];
    delete srs[lemma];
    commit({ ...state, saved, srs });
  },

  toggleSaved(word: SavedWord) {
    ensureLoaded();
    if (state.saved[word.lemma]) this.remove(word.lemma);
    else this.save(word);
  },

  toggleKnown(lemma: string) {
    ensureLoaded();
    const known = { ...state.known };
    if (known[lemma]) delete known[lemma];
    else known[lemma] = true;
    commit({ ...state, known });
  },

  /** Catat/segarkan kemajuan membaca sebuah pelajaran. */
  setProgress(p: Omit<Progress, "at" | "done"> & { done?: boolean }) {
    ensureLoaded();
    const prev = state.progress[p.slug];
    commit({
      ...state,
      progress: {
        ...state.progress,
        [p.slug]: {
          ...p,
          done: p.done ?? prev?.done ?? false,
          at: Date.now(),
        },
      },
    });
  },

  setDone(slug: string, done: boolean) {
    ensureLoaded();
    const prev = state.progress[slug];
    if (!prev) return;
    commit({
      ...state,
      progress: { ...state.progress, [slug]: { ...prev, done, at: Date.now() } },
    });
  },

  /** Nilai sebuah kartu saat sesi hafalan: "good" naik kotak, "again" reset. */
  review(lemma: string, grade: "good" | "again") {
    ensureLoaded();
    const card: SrsCard = state.srs[lemma] ?? {
      box: 0,
      due: Date.now(),
      reps: 0,
      lapses: 0,
    };
    let next: SrsCard;
    if (grade === "good") {
      const box = Math.min(card.box + 1, MAX_BOX);
      next = {
        box,
        due: Date.now() + INTERVALS_DAYS[box] * DAY,
        reps: card.reps + 1,
        lapses: card.lapses,
      };
    } else {
      next = {
        box: 0,
        due: Date.now() + 10 * MIN,
        reps: card.reps,
        lapses: card.lapses + 1,
      };
    }
    commit({ ...state, srs: { ...state.srs, [lemma]: next } });
  },
};

// ---------------- selektor murni (untuk komponen) ----------------

/** Kartu yang jatuh tempo untuk direview (tersimpan, belum dikuasai). */
export function dueCards(s: LearnerState, now = Date.now()): SavedWord[] {
  return Object.values(s.saved)
    .filter((w) => !s.known[w.lemma])
    .filter((w) => (s.srs[w.lemma]?.due ?? 0) <= now)
    .sort((a, b) => (s.srs[a.lemma]?.due ?? 0) - (s.srs[b.lemma]?.due ?? 0));
}

/** Kata yang masih dipelajari (tersimpan & belum dikuasai). */
export function learningWords(s: LearnerState): SavedWord[] {
  return Object.values(s.saved)
    .filter((w) => !s.known[w.lemma])
    .sort((a, b) => b.addedAt - a.addedAt);
}

/** Pelajaran yang sedang/baru dibaca, terbaru dulu. */
export function recentProgress(s: LearnerState): Progress[] {
  return Object.values(s.progress).sort((a, b) => b.at - a.at);
}
