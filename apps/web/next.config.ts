import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const rootEnvPath = resolve(__dirname, "../../.env.local");
if (existsSync(rootEnvPath)) loadEnvFile(rootEnvPath);

const nextConfig: NextConfig = {
  /* config options here */
};

// Source maps only upload when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT
// are set in Vercel; without them the build is the same as before and stack
// traces from the browser stay minified.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
  telemetry: false,
});
