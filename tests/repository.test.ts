import { describe, expect, test } from "bun:test";

// Tanpa env Supabase → repository memakai data seed (jalur publik default).
import {
  getAllLessonSlugs,
  getLesson,
  getUnit,
  getUnits,
  getVolume,
  getVolumes,
} from "@/lib/data/repository";

describe("repository (jalur seed)", () => {
  test("getVolumes mengembalikan jilid seed", async () => {
    const vols = await getVolumes();
    expect(vols.length).toBeGreaterThan(0);
    expect(vols[0].number).toBe(1);
  });

  test("getVolume menemukan jilid yang ada", async () => {
    expect((await getVolume(1))?.title_ar).toBe("الكتاب الأول");
  });

  test("getVolume mengembalikan null utk jilid tak ada", async () => {
    expect(await getVolume(99)).toBeNull();
  });

  test("getUnits mengembalikan unit jilid 1", async () => {
    const units = await getUnits(1);
    expect(units.map((u) => u.slug)).toContain("tahiyya-wa-taaruf");
  });

  test("getUnit menemukan unit", async () => {
    const u = await getUnit(1, "al-usra");
    expect(u?.title_ar).toBe("الأسرة");
  });

  test("getLesson menemukan teks & memuat body", async () => {
    const l = await getLesson("usrati");
    expect(l).not.toBeNull();
    expect(l!.body_ar.length).toBeGreaterThan(0);
    expect(l!.unitSlug).toBe("al-usra");
  });

  test("getLesson null utk slug tak ada", async () => {
    expect(await getLesson("tidak-ada")).toBeNull();
  });

  test("getAllLessonSlugs mencakup semua teks seed", async () => {
    const slugs = await getAllLessonSlugs();
    expect(slugs).toContain("usrati");
    expect(slugs.length).toBeGreaterThanOrEqual(3);
  });
});
