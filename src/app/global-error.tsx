"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: "1.5rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>عذراً، حدث خطأ جسيم!</h2>
          <p style={{ marginTop: "1rem", color: "#6b7280" }}>لقد حدث خطأ غير متوقع في التطبيق.</p>
          <button 
            onClick={() => reset()} 
            style={{ marginTop: "1.5rem", padding: "0.5rem 1rem", backgroundColor: "#2563eb", color: "#ffffff", borderRadius: "0.25rem", border: "none", cursor: "pointer" }}
          >
            حاول مرة أخرى
          </button>
        </div>
      </body>
    </html>
  );
}
