import type { NextConfig } from "next";
import path from "path";

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
