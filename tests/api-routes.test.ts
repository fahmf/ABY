import { describe, expect, test } from "bun:test";

import { GET as dictGET } from "@/app/api/dictionary/route";
import { GET as freqGET } from "@/app/api/frequency/route";

// Catatan: tanpa env Supabase, route jatuh ke data seed (jalur publik).

function req(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe("GET /api/dictionary", () => {
  test("400 bila tanpa query", async () => {
    const res = await dictGET(req("/api/dictionary"));
    expect(res.status).toBe(400);
  });

  test("mengembalikan entri seed untuk kata dikenal", async () => {
    const res = await dictGET(req("/api/dictionary?q=السلام"));
    const body = await res.json();
    expect(body.entry).not.toBeNull();
    expect(body.entry.root_ar).toBe("س ل م");
  });

  test("entry null untuk kata tak dikenal", async () => {
    const res = await dictGET(req("/api/dictionary?q=زقفونة"));
    const body = await res.json();
    expect(body.entry).toBeNull();
  });
});

describe("GET /api/frequency", () => {
  test("400 bila tanpa query", async () => {
    const res = await freqGET(req("/api/frequency"));
    expect(res.status).toBe(400);
  });

  test("menghitung kemunculan se-akar dari seed", async () => {
    const res = await freqGET(req("/api/frequency?q=الجامعة"));
    const body = await res.json();
    expect(body.frequency).not.toBeNull();
    expect(body.frequency.root_ar).toBe("ج م ع");
    expect(body.frequency.total).toBeGreaterThanOrEqual(2);
    // setiap kemunculan punya posisi token untuk deep-link
    for (const o of body.frequency.occurrences) {
      expect(typeof o.position).toBe("number");
    }
  });

  test("frequency null untuk kata tak dikenal", async () => {
    const res = await freqGET(req("/api/frequency?q=زقفونة"));
    const body = await res.json();
    expect(body.frequency).toBeNull();
  });
});
