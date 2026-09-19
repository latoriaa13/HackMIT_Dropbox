import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");

/** Load KEY=VALUE lines from .env.local (no expansion; server-only). */
function loadEnvLocalFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadEnvLocalFile(path.join(repoRoot, ".env.local"));
loadEnvLocalFile(path.join(__dirname, ".env.local"));

const nextConfig: NextConfig = {
  transpilePackages: ["@tuesday/core", "@tuesday/m365"],
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tuesday/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@tuesday/m365": path.resolve(__dirname, "../../packages/m365/src/index.ts"),
    };
    return config;
  },
};

export default nextConfig;
