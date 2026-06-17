import { describe, expect, test } from "bun:test";

import {
  dateKey,
  streakDays,
  todayCount,
  type LearnerState,
} from "@/lib/learner/store";

function emptyState(activity: Record<string, number> = {}): LearnerState {
  return {
    saved: {},
    known: {},
    srs: {},
    progress: {},
    notes: {},
    highlights: {},
    activity,
    goal: 10,
  };
}

function dayOffset(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

describe("learner store — streak & activity", () => {
  const now = new Date("2026-06-16T10:00:00");

  test("todayCount membaca aktivitas hari ini", () => {
    const s = emptyState({ [dateKey(now)]: 4 });
    expect(todayCount(s, now)).toBe(4);
    expect(todayCount(emptyState(), now)).toBe(0);
  });

  test("streak menghitung hari berturut-turut termasuk hari ini", () => {
    const s = emptyState({
      [dayOffset(now, 0)]: 2,
      [dayOffset(now, -1)]: 1,
      [dayOffset(now, -2)]: 5,
    });
    expect(streakDays(s, now)).toBe(3);
  });

  test("streak tetap hidup bila hari ini kosong tapi kemarin aktif", () => {
    const s = emptyState({
      [dayOffset(now, -1)]: 1,
      [dayOffset(now, -2)]: 1,
    });
    expect(streakDays(s, now)).toBe(2);
  });

  test("streak putus saat ada celah hari", () => {
    const s = emptyState({
      [dayOffset(now, 0)]: 1,
      [dayOffset(now, -2)]: 1, // kemarin (-1) bolong
    });
    expect(streakDays(s, now)).toBe(1);
  });

  test("streak nol tanpa aktivitas hari ini/kemarin", () => {
    const s = emptyState({ [dayOffset(now, -3)]: 9 });
    expect(streakDays(s, now)).toBe(0);
  });
});
