import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined;

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
