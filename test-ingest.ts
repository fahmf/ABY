import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { tokenize, lemmaCandidates } from "./src/lib/arabic";

const env = readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";

for (const line of env.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].replace(/"/g, "").trim();
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].replace(/"/g, "").trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogic() {
  const candsArray = lemmaCandidates("الوحدة");
  console.log("Local candidates:", candsArray);

  const { data: entries } = await supabase
    .from("dictionary_entries")
    .select("lemma_norm, lemma_ar, root_id")
    .eq("status", "published")
    .in("lemma_norm", candsArray);
    
  console.log("Found published entries in DB:", entries);

  const validNormToEntry = new Map();
  for (const e of entries || []) {
    validNormToEntry.set(e.lemma_norm, e);
  }

  const validCand = candsArray.find(c => validNormToEntry.has(c));
  console.log("WINNER Candidate:", validCand);
  if (validCand) {
    console.log("Resolved to:", validNormToEntry.get(validCand));
  }
}

checkLogic();
