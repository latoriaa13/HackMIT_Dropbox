import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(path.resolve(__dirname, ".."), "data", "raw");

if (!fs.existsSync(rawDir)) {
  console.error("Run npm run ingest first (or extract CSVs to data/raw).");
  process.exit(1);
}

for (const file of fs.readdirSync(rawDir).filter((f) => f.endsWith(".csv"))) {
  const text = fs.readFileSync(path.join(rawDir, file), "utf-8");
  const rows = parse(text, { columns: true, skip_empty_lines: true }) as Record<
    string,
    string
  >[];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  console.log(`\n${file}: ${rows.length} rows`);
  console.log("  columns:", headers.join(", "));
}
