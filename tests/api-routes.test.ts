import { describe, expect, test } from "bun:test";

import { GET as dictGET } from "@/app/api/dictionary/route";
import { GET as freqGET } from "@/app/api/frequency/route";
import { GET as keepaliveGET } from "@/app/api/cron/keepalive/route";

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

describe("GET /api/cron/keepalive", () => {
  function authedReq(token?: string): Request {
    return new Request("http://localhost/api/cron/keepalive", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  }

  test("tanpa env Supabase: 503 supabase_not_configured", async () => {
    const res = await keepaliveGET(authedReq());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("supabase_not_configured");
  });

  test("menolak permintaan tanpa bearer yang benar bila CRON_SECRET diatur", async () => {
    process.env.CRON_SECRET = "rahasia-uji";
    try {
      expect((await keepaliveGET(authedReq())).status).toBe(401);
      expect((await keepaliveGET(authedReq("salah"))).status).toBe(401);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });

  test("melewati gerbang auth bila bearer cocok", async () => {
    process.env.CRON_SECRET = "rahasia-uji";
    try {
      // Lolos auth, lalu berhenti di pemeriksaan konfigurasi Supabase —
      // bukan 401. Inilah yang membedakan "ditolak" dari "diizinkan".
      const res = await keepaliveGET(authedReq("rahasia-uji"));
      expect(res.status).not.toBe(401);
      expect(res.status).toBe(503);
    } finally {
      delete process.env.CRON_SECRET;
    }
  });
});
