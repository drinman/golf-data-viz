import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release:
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  person_profiles: "always",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});
