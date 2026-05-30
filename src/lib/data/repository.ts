import type { Lesson, Unit, Volume } from "./types";
import { LESSONS, UNITS, VOLUMES } from "./seed";

// Lapisan akses data. Fase 1: membaca seed lokal.
// Fase 2: diganti query Supabase (lihat src/lib/supabase/*), antarmuka tetap sama.

export function getVolumes(): Volume[] {
  return [...VOLUMES].sort((a, b) => a.number - b.number);
}

export function getVolume(number: number): Volume | null {
  return VOLUMES.find((v) => v.number === number) ?? null;
}

export function getUnits(volumeNumber: number): Unit[] {
  return UNITS.filter((u) => u.volumeNumber === volumeNumber).sort(
    (a, b) => a.number - b.number
  );
}

export function getUnit(volumeNumber: number, unitSlug: string): Unit | null {
  return (
    UNITS.find(
      (u) => u.volumeNumber === volumeNumber && u.slug === unitSlug
    ) ?? null
  );
}

export function getLessons(unitSlug: string): Lesson[] {
  return LESSONS.filter((l) => l.unitSlug === unitSlug);
}

export function getLesson(lessonSlug: string): Lesson | null {
  return LESSONS.find((l) => l.slug === lessonSlug) ?? null;
}
