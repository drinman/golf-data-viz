import { describe, it, expect, vi, beforeEach } from "vitest";

async function loadCsp() {
  // Force fresh import each test so env var changes take effect
  vi.resetModules();
  const mod = await import("../../src/lib/security/csp");
  return mod.csp;
}

describe("CSP report-uri", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes report-uri when NEXT_PUBLIC_SENTRY_DSN is set", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SENTRY_DSN",
      "https://abc123@o456.ingest.us.sentry.io/789"
    );
    const csp = await loadCsp();
    expect(csp).toContain(
      "report-uri https://o456.ingest.us.sentry.io/api/789/security/?sentry_key=abc123"
    );
  });

  it("omits report-uri when NEXT_PUBLIC_SENTRY_DSN is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const csp = await loadCsp();
    expect(csp).not.toContain("report-uri");
  });

  it("omits report-uri when DSN is malformed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "not-a-url");
    const csp = await loadCsp();
    expect(csp).not.toContain("report-uri");
  });
});
