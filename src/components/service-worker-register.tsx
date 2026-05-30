"use client";

import * as React from "react";

// Mendaftarkan service worker di produksi untuk dukungan offline (PWA).
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registrasi gagal — abaikan; app tetap berfungsi online.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
