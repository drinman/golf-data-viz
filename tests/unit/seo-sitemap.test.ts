import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("returns 16 total entries (4 existing + 12 new)", () => {
    expect(entries).toHaveLength(16);
  });

  it("contains /benchmarks/30-plus (not /benchmarks/30+)", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes("/benchmarks/30-plus"))).toBe(true);
    expect(urls.some((u) => u.includes("/benchmarks/30+"))).toBe(false);
  });

  it("contains all learn page URLs", () => {
    const urls = entries.map((e) => e.url);
    expect(
      urls.some((u) => u.includes("/learn/strokes-gained-explained"))
    ).toBe(true);
    expect(
      urls.some((u) => u.includes("/learn/strokes-gained-calculator"))
    ).toBe(true);
    expect(
      urls.some((u) =>
        u.includes("/learn/average-strokes-gained-by-handicap")
      )
    ).toBe(true);
    expect(
      urls.some((u) => u.includes("/learn/strokes-gained-putting"))
    ).toBe(true);
  });

  it("contains /benchmarks index page", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/benchmarks"))).toBe(true);
  });
});
