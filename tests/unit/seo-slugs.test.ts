import { describe, it, expect } from "vitest";
import {
  ALL_BRACKET_SLUGS,
  slugToBracket,
  bracketToSlug,
  getAdjacentBrackets,
} from "@/lib/seo/slugs";

describe("ALL_BRACKET_SLUGS", () => {
  it("has exactly 7 entries", () => {
    expect(ALL_BRACKET_SLUGS).toHaveLength(7);
  });
});

describe("slugToBracket", () => {
  it("returns identity for standard brackets", () => {
    expect(slugToBracket("10-15")).toBe("10-15");
  });

  it("converts 30-plus to 30+", () => {
    expect(slugToBracket("30-plus")).toBe("30+");
  });

  it("returns null for invalid slug", () => {
    expect(slugToBracket("invalid")).toBeNull();
  });
});

describe("bracketToSlug", () => {
  it("returns identity for standard brackets", () => {
    expect(bracketToSlug("10-15")).toBe("10-15");
  });

  it("converts 30+ to 30-plus", () => {
    expect(bracketToSlug("30+")).toBe("30-plus");
  });

  it("maps plus to 0-5 (no plus page)", () => {
    expect(bracketToSlug("plus")).toBe("0-5");
  });
});

describe("getAdjacentBrackets", () => {
  it("returns correct neighbors for middle bracket", () => {
    expect(getAdjacentBrackets("10-15")).toEqual({
      prev: "5-10",
      next: "15-20",
    });
  });

  it("returns null prev for first bracket", () => {
    expect(getAdjacentBrackets("0-5")).toEqual({
      prev: null,
      next: "5-10",
    });
  });

  it("returns null next for last bracket", () => {
    expect(getAdjacentBrackets("30+")).toEqual({
      prev: "25-30",
      next: null,
    });
  });
});
