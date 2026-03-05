import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("includes a Content-Security-Policy header", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeDefined();

    const routes = await headersFn!();
    const catchAll = routes.find((r) => r.source === "/(.*)");
    expect(catchAll).toBeDefined();

    const csp = catchAll!.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(csp).toBeDefined();
    expect(csp!.value).toContain("object-src 'none'");
    expect(csp!.value).toContain("base-uri 'self'");
    expect(csp!.value).toContain("form-action 'self'");
    expect(csp!.value).toContain("frame-ancestors 'none'");
    expect(csp!.value).toContain("https://*.ingest.sentry.io");
    expect(csp!.value).toContain("default-src 'self'");
    expect(csp!.value).toContain(
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com https://challenges.cloudflare.com"
    );
    expect(csp!.value).toContain(
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.ingest.sentry.io https://challenges.cloudflare.com"
    );
    expect(csp!.value).toContain(
      "frame-src 'self' https://challenges.cloudflare.com"
    );
    expect(csp!.value).not.toContain("default-src 'self' blob:");
  });
});
