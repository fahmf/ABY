import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import * as React from "react";

import { DictionaryPanel } from "@/components/reader/dictionary-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { DictionaryEntry } from "@/lib/data/types";

// DictionaryPanel memakai primitive Sheet (Dialog) → bungkus dengan root terbuka.
function Wrapped({ surface }: { surface: string }) {
  return (
    <Sheet open>
      <SheetContent>
        <DictionaryPanel surface={surface} />
      </SheetContent>
    </Sheet>
  );
}

function stubFetch(entry: DictionaryEntry | null) {
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify({ entry }), {
      headers: { "content-type": "application/json" },
    })
  ) as unknown as typeof fetch;
}

afterEach(cleanup);

const ENTRY: DictionaryEntry = {
  lemma_ar: "سلام",
  root_ar: "س ل م",
  meaning_ar: "الأمان والتحية.",
  synonyms_ar: ["أمان", "تحية"],
  antonyms_ar: ["حرب"],
  examples_ar: ["ألقى السلام."],
};

describe("DictionaryPanel", () => {
  test("menampilkan kata (surface) sebagai judul", async () => {
    stubFetch(null);
    render(<Wrapped surface="السلام" />);
    expect(screen.getAllByText("السلام").length).toBeGreaterThan(0);
    // Tunggu fetch selesai agar setState tidak terjadi di luar act().
    await waitFor(() => expect(screen.getByText(/قيد المراجعة/)).toBeDefined());
  });

  test("menampilkan akar & makna saat entri ditemukan", async () => {
    stubFetch(ENTRY);
    render(<Wrapped surface="السلام" />);
    await waitFor(() =>
      expect(screen.getByText(/س ل م/)).toBeDefined()
    );
    expect(screen.getByText("الأمان والتحية.")).toBeDefined();
  });

  test("menampilkan sinonim & antonim", async () => {
    stubFetch(ENTRY);
    render(<Wrapped surface="السلام" />);
    await waitFor(() => expect(screen.getByText("أمان")).toBeDefined());
    expect(screen.getByText("حرب")).toBeDefined();
  });

  test("menampilkan status 'قيد المراجعة' bila entri null", async () => {
    stubFetch(null);
    render(<Wrapped surface="زقفونة" />);
    await waitFor(() =>
      expect(screen.getByText(/قيد المراجعة/)).toBeDefined()
    );
  });

  test("memanggil API dictionary dengan query ter-encode", async () => {
    const f = mock(async () =>
      new Response(JSON.stringify({ entry: null }), {
        headers: { "content-type": "application/json" },
      })
    );
    globalThis.fetch = f as unknown as typeof fetch;
    render(<Wrapped surface="بيت" />);
    // Panel menunda fetch satu macrotask (agar setState awal tak sinkron dalam
    // efek), jadi tunggu pemanggilan seperti tes lainnya.
    await waitFor(() => expect(f).toHaveBeenCalled());
    const firstCall = f.mock.calls[0] as unknown as [string];
    expect(String(firstCall[0])).toContain("/api/dictionary?q=");
  });
});
