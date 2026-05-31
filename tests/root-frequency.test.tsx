import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RootFrequencyButton } from "@/components/reader/root-frequency";
import type { RootFrequency } from "@/lib/data/frequency-core";

const FREQ: RootFrequency = {
  root_ar: "ج م ع",
  total: 2,
  occurrences: [
    {
      lessonSlug: "as-salamu-alaykum",
      lessonTitle: "السلام عليكم",
      unitTitle: "التحية والتعارف",
      volumeNumber: 1,
      position: 19,
      snippet: "…في الجامعةِ…",
    },
    {
      lessonSlug: "min-ayna-anta",
      lessonTitle: "من أين أنت",
      unitTitle: "التحية والتعارف",
      volumeNumber: 1,
      position: 20,
      snippet: "…في هذه الجامعةِ…",
    },
  ],
};

function stubFetch(freq: RootFrequency | null) {
  globalThis.fetch = mock(async () =>
    new Response(JSON.stringify({ frequency: freq }), {
      headers: { "content-type": "application/json" },
    })
  ) as unknown as typeof fetch;
}

afterEach(cleanup);

describe("RootFrequencyButton", () => {
  test("tidak fetch sebelum dialog dibuka", () => {
    const f = mock(async () =>
      new Response(JSON.stringify({ frequency: null }))
    );
    globalThis.fetch = f as unknown as typeof fetch;
    render(<RootFrequencyButton surface="الجامعة" />);
    expect(f).not.toHaveBeenCalled();
  });

  test("membuka dialog & menampilkan total kemunculan", async () => {
    stubFetch(FREQ);
    render(<RootFrequencyButton surface="الجامعة" />);
    fireEvent.click(screen.getByText("عدد مرّات ورود الجذر"));
    await waitFor(() =>
      expect(screen.getByText(/وردَ 2 مرّة/)).toBeDefined()
    );
  });

  test("menampilkan tautan deep-link ke setiap kemunculan", async () => {
    stubFetch(FREQ);
    render(<RootFrequencyButton surface="الجامعة" />);
    fireEvent.click(screen.getByText("عدد مرّات ورود الجذر"));
    // Dialog Radix dirender ke portal → cari di document.
    await waitFor(() => {
      const links = document.querySelectorAll('a[href*="#t="]');
      expect(links.length).toBe(2);
    });
    const hrefs = [...document.querySelectorAll('a[href*="#t="]')].map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/baca/as-salamu-alaykum#t=19");
  });

  test("pesan kosong saat tak ada data", async () => {
    stubFetch(null);
    render(<RootFrequencyButton surface="زقفونة" />);
    fireEvent.click(screen.getByText("عدد مرّات ورود الجذر"));
    await waitFor(() =>
      expect(screen.getByText(/لا توجد بيانات/)).toBeDefined()
    );
  });
});
