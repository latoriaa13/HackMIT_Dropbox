import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTuesday } from "@tuesday/core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(
  fs.readFileSync(path.join(root, "data/processed/tuesday-data.json"), "utf-8")
);

const t0 = Date.now();
const result = buildTuesday(dataset, {
  objective: "protect_renewals",
  staffHours: 8,
  channels: ["phone", "email", "event_invitation", "stewardship_message"],
  riskPreference: "balanced",
});
console.log("Queue items:", result.items.length);
console.log("Candidates:", result.candidateCount);
console.log("Elapsed ms:", Date.now() - t0);
