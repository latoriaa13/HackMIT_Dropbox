import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import AdmZip from "adm-zip";
import {
  buildProfilesFromRaw,
  DEFAULT_FISCAL_CONFIG,
} from "@tuesday/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const rawDir = path.join(root, "data", "raw");
const processedDir = path.join(root, "data", "processed");
const zipPath = path.join(root, "data-20260919T163645Z-1-001.zip");

function ensureRawCsvs() {
  const constituents = path.join(rawDir, "constituents.csv");
  if (fs.existsSync(constituents)) return;
  if (!fs.existsSync(zipPath)) {
    throw new Error(
      `No data/raw CSVs and no zip at ${zipPath}. Add dataset files first.`
    );
  }
  fs.mkdirSync(rawDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = path.basename(entry.entryName);
    if (!name.endsWith(".csv")) continue;
    fs.writeFileSync(path.join(rawDir, name), entry.getData());
  }
  console.log("Extracted CSVs to data/raw/");
}

function readCsv(filename: string): Record<string, string>[] {
  const p = path.join(rawDir, filename);
  if (!fs.existsSync(p)) {
    console.warn(`Missing ${filename}, using empty.`);
    return [];
  }
  const text = fs.readFileSync(p, "utf-8");
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Record<string, string>[];
}

async function main() {
  ensureRawCsvs();
  const schools = readCsv("schools.csv");
  const school = schools[0];
  const config = {
    ...DEFAULT_FISCAL_CONFIG,
    fiscalYearStartMonth: parseInt(school?.fiscal_year_start_month ?? "7", 10),
  };

  console.log("Building constituent profiles…");
  const dataset = buildProfilesFromRaw(
    {
      schoolName: school?.name ?? "School",
      fiscalYearStartMonth: config.fiscalYearStartMonth,
      constituents: readCsv("constituents.csv"),
      gifts: readCsv("gifts.csv"),
      degrees: readCsv("degrees.csv"),
      affiliations: readCsv("affiliations.csv"),
      activities: readCsv("activities.csv"),
      events: readCsv("events.csv"),
      eventAttendance: readCsv("event_attendance.csv"),
      interactions: readCsv("interactions.csv"),
      careerHistory: readCsv("career_history.csv"),
      campaigns: readCsv("campaigns.csv"),
    },
    config
  );

  fs.mkdirSync(processedDir, { recursive: true });
  const outPath = path.join(processedDir, "tuesday-data.json");
  fs.writeFileSync(outPath, JSON.stringify(dataset));
  console.log(`Wrote ${dataset.meta.constituentCount} profiles → ${outPath}`);
  console.log(
    `Donors: ${dataset.meta.donorCount}, LYBUNT: ${dataset.meta.lybuntCount}, FY: ${dataset.meta.currentFiscalYear}`
  );

  const manifest = {
    generatedAt: dataset.meta.generatedAt,
    files: fs.readdirSync(rawDir).filter((f) => f.endsWith(".csv")),
    meta: dataset.meta,
  };
  fs.mkdirSync(path.join(root, "data", "schema"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data", "schema", "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
