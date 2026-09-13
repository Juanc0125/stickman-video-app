import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import type { NextConfig } from "next";

const rootEnvPath = resolve(__dirname, "../../.env.local");
if (existsSync(rootEnvPath)) loadEnvFile(rootEnvPath);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
