import * as Sentry from "@sentry/nextjs";
import { sentryDataCollection } from "./lib/sentry-data-collection";

// Browser side of instrumentation.ts. The DSN has to be NEXT_PUBLIC_ to reach
// the browser; a DSN is meant to be public (it can only send events in).
// No session replay: it would record the scripts people are writing.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: sentryDataCollection,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
