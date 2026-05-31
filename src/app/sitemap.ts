import type { MetadataRoute } from "next";

import { getAllLessonSlugs, getVolumes } from "@/lib/data/repository";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [volumes, lessonSlugs] = await Promise.all([
    getVolumes(),
    getAllLessonSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/cari`, priority: 0.5 },
  ];
  const volumeRoutes = volumes.map((v) => ({
    url: `${BASE}/jilid/${v.number}`,
    priority: 0.7,
  }));
  const lessonRoutes = lessonSlugs.map((slug) => ({
    url: `${BASE}/baca/${slug}`,
    priority: 0.8,
  }));

  return [...staticRoutes, ...volumeRoutes, ...lessonRoutes];
}
