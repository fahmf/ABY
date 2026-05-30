import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "العربية بين يديك — قارئ تفاعلي",
    short_name: "العربية بين يديك",
    description:
      "قارئ تفاعلي لنصوص كتاب العربية بين يديك مع معجم لكل كلمة.",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
