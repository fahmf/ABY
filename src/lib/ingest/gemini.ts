import "server-only";

// Guard server-only untuk pemakaian di aplikasi (RSC/server actions).
// Logika inti ada di ./gemini-core agar bisa dipakai ulang oleh skrip CLI
// lokal (scripts/ingest-local.ts) tanpa terkena batasan server-only.
export * from "./gemini-core";
