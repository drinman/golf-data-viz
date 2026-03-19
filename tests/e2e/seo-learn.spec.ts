import { expect, test } from "@playwright/test";

test.describe("Learn pages", () => {
  test("/learn renders index with 4 article links", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.locator("h1")).toBeVisible();

    // 4 article links
    const links = page.locator('a[href^="/learn/"]');
    await expect(links).toHaveCount(4);

    // Canonical tag
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/learn$/);

    // BreadcrumbList JSON-LD
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const text = await jsonLd.first().textContent();
    expect(JSON.parse(text!)).toHaveProperty("@type", "BreadcrumbList");
  });

  test("/learn/strokes-gained-explained has Article JSON-LD and CTA", async ({
    page,
  }) => {
    await page.goto("/learn/strokes-gained-explained");
    await expect(page.locator("h1")).toBeVisible();

    // Canonical tag
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      /\/learn\/strokes-gained-explained$/
    );

    // Article + BreadcrumbList JSON-LD
    const jsonLdElements = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdElements.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const schemas: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await jsonLdElements.nth(i).textContent();
      schemas.push(JSON.parse(text!)["@type"]);
    }
    expect(schemas).toContain("Article");
    expect(schemas).toContain("BreadcrumbList");

    // Calculator CTA present (scoped to main to avoid header nav matches)
    await expect(
      page.locator('main a[href="/strokes-gained"]')
    ).toBeVisible();

    // Server-rendered content present
    const content = await page.textContent("main");
    expect(content!.length).toBeGreaterThan(500);
  });

  test("/learn/strokes-gained-calculator has CTA button", async ({
    page,
  }) => {
    await page.goto("/learn/strokes-gained-calculator");
    await expect(page.locator("h1")).toBeVisible();

    // Canonical tag
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      /\/learn\/strokes-gained-calculator$/
    );

    // CTA button linking to calculator (use first since page has top + bottom CTAs)
    await expect(
      page.locator('main a[href="/strokes-gained"]').first()
    ).toBeVisible();
  });

  test("/learn/average-strokes-gained-by-handicap links to benchmark pages", async ({
    page,
  }) => {
    await page.goto("/learn/average-strokes-gained-by-handicap");
    await expect(page.locator("h1")).toBeVisible();

    // Links to benchmark pages
    await expect(
      page.locator('a[href^="/benchmarks/"]').first()
    ).toBeVisible();

    // Static visual present (BenchmarkVisual has role="img")
    await expect(page.locator('svg[role="img"]')).toBeVisible();
  });

  test("/learn/strokes-gained-putting renders with CTA", async ({
    page,
  }) => {
    await page.goto("/learn/strokes-gained-putting");
    await expect(page.locator("h1")).toBeVisible();

    // Canonical tag
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      /\/learn\/strokes-gained-putting$/
    );

    // CTA present (scoped to main)
    await expect(
      page.locator('main a[href="/strokes-gained"]')
    ).toBeVisible();
  });

  test("all 4 learn routes return 200", async ({ page }) => {
    const paths = [
      "/learn/strokes-gained-explained",
      "/learn/strokes-gained-calculator",
      "/learn/average-strokes-gained-by-handicap",
      "/learn/strokes-gained-putting",
    ];
    for (const path of paths) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should be 200`).toBe(200);
    }
  });

  test("/learn/nonexistent returns 404", async ({ page }) => {
    const response = await page.goto("/learn/nonexistent");
    expect(response?.status()).toBe(404);
  });
});
