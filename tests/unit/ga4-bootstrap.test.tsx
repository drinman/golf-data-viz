import { describe, it, expect } from "vitest";
import { csp } from "@/lib/security/csp";

describe("GA4 CSP directives", () => {
  it("allows GA4 script sources in script-src", () => {
    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://www.google-analytics.com");
    expect(csp).toContain("https://ssl.google-analytics.com");
  });

  it("allows GA4 connect sources in connect-src", () => {
    expect(csp).toContain("https://*.google-analytics.com");
    expect(csp).toContain("https://*.analytics.google.com");
  });

  it("allows GA4 image beacons in img-src", () => {
    expect(csp).toContain("https://www.google-analytics.com");
  });
});
