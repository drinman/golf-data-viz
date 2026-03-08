/**
 * Parse a Sentry DSN into the CSP security report URI.
 * DSN format: https://<key>@o<org_id>.ingest.<region>.sentry.io/<project_id>
 * Report URI: https://o<org_id>.ingest.<region>.sentry.io/api/<project_id>/security/?sentry_key=<key>
 */
function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/\//g, "");
    return `https://${url.hostname}/api/${projectId}/security/?sentry_key=${key}`;
  } catch {
    return null;
  }
}

const reportUri = sentryReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.googletagmanager.com",
  "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.ingest.sentry.io https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(reportUri ? [`report-uri ${reportUri}`] : []),
];

export const csp = cspDirectives.join("; ");
