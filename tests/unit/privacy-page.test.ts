import { describe, it, expect } from "vitest";

describe("Privacy page metadata", () => {
  it("exports correct title and description", async () => {
    const { metadata } = await import("@/app/privacy/page");

    expect(metadata).toBeDefined();
    expect(metadata.title).toBe("Privacy Policy");
    expect(metadata.description).toMatch(/privacy|data/i);
    expect(metadata.alternates?.canonical).toBe("/privacy");
  });
});
