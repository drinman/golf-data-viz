import { describe, it, expect, vi, afterEach } from "vitest";
import { buildShareUrl, type ShareMedium } from "@/lib/golf/share-url";

describe("buildShareUrl", () => {
  const payload = "eyJjb3Vyc2UiOiJUZXN0In0";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("contains ?d=<payload> and all three UTM params", () => {
    const url = buildShareUrl({ encodedPayload: payload, medium: "copy_link" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("d")).toBe(payload);
    expect(parsed.searchParams.get("utm_source")).toBe("share");
    expect(parsed.searchParams.get("utm_campaign")).toBe("round_share");
    expect(parsed.searchParams.get("utm_medium")).toBe("copy_link");
  });

  it.each([
    ["copy_link", "copy_link"],
    ["receipt_qr", "receipt_qr"],
    ["cta", "cta"],
  ] as [ShareMedium, string][])(
    "medium '%s' produces utm_medium='%s'",
    (medium, expected) => {
      const url = buildShareUrl({ encodedPayload: payload, medium });
      const parsed = new URL(url);
      expect(parsed.searchParams.get("utm_medium")).toBe(expected);
    }
  );

  it("custom baseUrl overrides default", () => {
    const url = buildShareUrl({
      encodedPayload: payload,
      medium: "copy_link",
      baseUrl: "https://staging.golfdataviz.com/strokes-gained",
    });
    expect(url).toContain("https://staging.golfdataviz.com/strokes-gained");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("d")).toBe(payload);
  });

  it("preserves encoded payload with special chars", () => {
    const specialPayload = "abc-_123+/=";
    const url = buildShareUrl({ encodedPayload: specialPayload, medium: "copy_link" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("d")).toBe(specialPayload);
  });

  it("uses NEXT_PUBLIC_BASE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://staging.golfdataviz.com");
    const url = buildShareUrl({ encodedPayload: payload, medium: "receipt_qr" });
    expect(url).toContain("https://staging.golfdataviz.com/strokes-gained");
  });

  it("falls back to window.location.origin in browser context", () => {
    // jsdom sets window.location.origin to http://localhost
    const url = buildShareUrl({ encodedPayload: payload, medium: "receipt_qr" });
    expect(url).toContain("/strokes-gained");
    expect(new URL(url).searchParams.get("d")).toBe(payload);
  });
});
