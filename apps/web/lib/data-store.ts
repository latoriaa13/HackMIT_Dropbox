import fs from "node:fs";
import path from "node:path";
import type { ProcessedDataset, ConstituentProfile } from "@tuesday/core";

let cached: ProcessedDataset | null = null;
let profileMap: Map<string, ConstituentProfile> | null = null;

function dataPath(): string {
  return path.resolve(process.cwd(), "../../data/processed/tuesday-data.json");
}

export function loadDataset(): ProcessedDataset {
  if (cached) return cached;
  const p = dataPath();
  if (!fs.existsSync(p)) {
    throw new Error(
      "Processed data not found. Run `npm run ingest` from the repository root."
    );
  }
  const raw = fs.readFileSync(p, "utf-8");
  cached = JSON.parse(raw) as ProcessedDataset;
  for (const p of cached.profiles) {
    for (const g of p.gifts) {
      if (typeof (g as { anonymous?: boolean }).anonymous !== "boolean") {
        (g as { anonymous: boolean }).anonymous = false;
      }
    }
  }
  profileMap = new Map(cached.profiles.map((pr) => [pr.id, pr]));
  return cached;
}

export function getProfile(id: string): ConstituentProfile | undefined {
  loadDataset();
  return profileMap?.get(id);
}

export function resetCacheForTests() {
  cached = null;
  profileMap = null;
}
