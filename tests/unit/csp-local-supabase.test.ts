import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadCspModule() {
  vi.resetModules();
  return import("../../src/lib/security/csp");
}

describe("CSP local Supabase allowance", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows a local Supabase origin in connect-src during local development", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const { csp } = await loadCspModule();

    expect(csp).toContain("connect-src");
    expect(csp).toContain("http://127.0.0.1:54321");
  });

  it("does not add a non-local Supabase origin to connect-src", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");

    const { csp } = await loadCspModule();

    expect(csp).toContain("https://*.supabase.co");
    expect(csp).not.toContain("https://project-ref.supabase.co");
  });
});
