import { generateEntries } from "./src/lib/ingest/gemini-core";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  if (line.startsWith("GEMINI_API_KEY=")) process.env.GEMINI_API_KEY = line.split("=")[1].replace(/"/g, "").trim();
}

async function testGemini() {
  try {
    const res = await generateEntries(["وَحْدَة", "كتاب", "طاولة"]);
    console.log("Success! Output:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    const e = err as { message?: string; status?: number };
    console.error("Error occurred:", e.message);
    if (e.status) console.error("Status:", e.status);
    console.log(err);
  }
}

testGemini();
