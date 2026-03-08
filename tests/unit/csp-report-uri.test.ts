import { describe, it, expect, vi, beforeEach } from "vitest";

async function loadCspModule() {
  vi.resetModules();
  return import("../../src/lib/security/csp");
}

describe("CSP reporting directives", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes report-uri and report-to when DSN is set", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SENTRY_DSN",
      "https://abc123@o456.ingest.us.sentry.io/789"
    );
    const { csp, reportUri } = await loadCspModule();
    expect(csp).toContain(
      "report-uri https://o456.ingest.us.sentry.io/api/789/security/?sentry_key=abc123"
    );
    expect(csp).toContain("report-to csp-endpoint");
    expect(reportUri).toBe(
      "https://o456.ingest.us.sentry.io/api/789/security/?sentry_key=abc123"
    );
  });

  it("omits both directives when DSN is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const { csp, reportUri } = await loadCspModule();
    expect(csp).not.toContain("report-uri");
    expect(csp).not.toContain("report-to");
    expect(reportUri).toBeNull();
  });

  it("omits both directives when DSN is malformed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "not-a-url");
    const { csp, reportUri } = await loadCspModule();
    expect(csp).not.toContain("report-uri");
    expect(csp).not.toContain("report-to");
    expect(reportUri).toBeNull();
  });
});
