"use client";

/**
 * Kirim أحداث الاستخدام (تحليلات) كـ fire-and-forget. لا تُعطّل واجهة المستخدم
 * ولا تُلقي أخطاء. تُفضّل sendBeacon لموثوقية الإرسال عند مغادرة الصفحة.
 */
export type TrackKind = "word" | "lesson" | "quiz_wrong";

export function track(kind: TrackKind, key: string): void {
  if (typeof window === "undefined" || !key) return;
  try {
    const payload = JSON.stringify({ kind, key });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], {
        type: "application/json",
      }));
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* abaikan */
  }
}
