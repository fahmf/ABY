// Apakah kredensial Supabase tersedia? Jika tidak, app jatuh ke data seed.
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Apakah API key Gemini tersedia? (untuk pipeline ingest)
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
