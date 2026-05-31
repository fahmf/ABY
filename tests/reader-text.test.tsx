import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ReaderText } from "@/components/reader/reader-text";

// Panel kamus melakukan fetch ke /api/dictionary — sediakan stub.
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ entry: null }), {
    headers: { "content-type": "application/json" },
  })) as unknown as typeof fetch;

afterEach(() => {
  cleanup();
  window.location.hash = "";
  localStorage.clear();
});

const TEXT = "السَّلامُ عَلَيْكُمْ ورحمةُ اللهِ";

describe("ReaderText", () => {
  test("merender tiap kata sebagai token clickable", () => {
    const { container } = render(<ReaderText text={TEXT} />);
    const tokens = container.querySelectorAll("[data-token]");
    // 4 kata pada teks contoh
    expect(tokens.length).toBe(4);
  });

  test("token pertama menampilkan kata berharakat", () => {
    const { container } = render(<ReaderText text={TEXT} />);
    const first = container.querySelector('[data-token="0"]');
    expect(first?.textContent).toBe("السَّلامُ");
  });

  test("toggle harakat menyembunyikan tasykil", () => {
    const { container } = render(<ReaderText text={TEXT} />);
    fireEvent.click(screen.getByText("إخفاء التشكيل"));
    const first = container.querySelector('[data-token="0"]');
    expect(first?.textContent).toBe("السلام");
  });

  test("klik kata membuka panel kamus (judulnya = kata)", async () => {
    render(<ReaderText text={TEXT} />);
    const word = document.querySelector('[data-token="1"]') as HTMLElement;
    fireEvent.click(word);
    // Judul Sheet menampilkan surface kata yang dipilih
    const titles = await screen.findAllByText("عَلَيْكُمْ");
    expect(titles.length).toBeGreaterThan(0);
  });

  test("tombol perbesar font menambah kelas ukuran", () => {
    const { container } = render(<ReaderText text={TEXT} />);
    const p = container.querySelector("p.font-naskh") as HTMLElement;
    const before = p.className;
    fireEvent.click(screen.getByLabelText("تكبير الخط"));
    expect(p.className).not.toBe(before);
  });

  test("menyorot token sesuai hash #t=<id> saat mount", () => {
    window.location.hash = "#t=2";
    const { container } = render(<ReaderText text={TEXT} />);
    const el = container.querySelector('[data-token="2"]') as HTMLElement;
    expect(el.className).toContain("amber");
  });
});
