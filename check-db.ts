import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";

for (const line of env.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].replace(/"/g, "").trim();
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].replace(/"/g, "").trim();
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("dictionary_entries")
    .select("lemma_ar, lemma_norm, status")
    .in("lemma_norm", ["وحده", "الوحده", "حد", "وحد"]);
    
  console.log("Dictionary entries matching candidates:");
  console.log(data);

  const { data: tokens } = await supabase
    .from("tokens")
    .select("surface_ar, lemma_ar, root_id")
    .eq("surface_ar", "الوحدة")
    .limit(5);

  console.log("Tokens for الوحدة:");
  console.log(tokens);
}

check();
