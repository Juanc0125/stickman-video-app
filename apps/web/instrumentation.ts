import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "./lib/sentry-data-collection";

// Error reporting only, and only when SENTRY_DSN is set: without it the SDK
// stays disabled and sends nothing. No tracing - the goal is to hear about
// failures, not to profile requests.
export async function register() {
  const dsn = process.env.SENTRY_DSN?.trim();
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    dataCollection: sentryDataCollection,
  });
}

// Errors thrown in route handlers, server components and proxy.ts.
export const onRequestError = Sentry.captureRequestError;
