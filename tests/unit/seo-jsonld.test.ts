import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbLD,
  buildDatasetLD,
  buildArticleLD,
} from "@/lib/seo/jsonld";

describe("buildBreadcrumbLD", () => {
  it("returns valid BreadcrumbList with @context and positions starting at 1", () => {
    const result = buildBreadcrumbLD([
      { label: "Home", href: "/" },
      { label: "Benchmarks", href: "/benchmarks" },
    ]);
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(2);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
  });
});

describe("buildDatasetLD", () => {
  it("returns Dataset schema with name, description, url", () => {
    const result = buildDatasetLD({
      name: "Test Dataset",
      description: "A test",
      url: "https://example.com",
    });
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Dataset");
    expect(result.name).toBe("Test Dataset");
    expect(result.description).toBe("A test");
    expect(result.url).toBe("https://example.com");
  });
});

describe("buildArticleLD", () => {
  it("returns Article schema with headline and datePublished", () => {
    const result = buildArticleLD({
      headline: "Test Article",
      datePublished: "2026-03-18",
    });
    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Article");
    expect(result.headline).toBe("Test Article");
    expect(result.datePublished).toBe("2026-03-18");
  });
});
