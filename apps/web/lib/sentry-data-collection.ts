import type * as Sentry from "@sentry/nextjs";

// What reaches Sentry is the error and its stack, nothing else. The SDK's
// defaults also collect cookies, headers, request bodies, local variables and
// AI prompts/outputs - here that means sessions and the regulated marketing
// scripts people are drafting.
export const sentryDataCollection: NonNullable<Parameters<typeof Sentry.init>[0]>["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
};
