import { lemmaCandidates, normalize } from "./src/lib/arabic";
console.log("Normalize الوحدة:", normalize("الوحدة"));
console.log("Candidates:", lemmaCandidates("الوحدة"));
