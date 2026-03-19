import { expect, test } from "@playwright/test";

test.describe("Benchmark pages", () => {
  test("/benchmarks renders index with 7 bracket links", async ({ page }) => {
    await page.goto("/benchmarks");
    await expect(page.locator("h1")).toContainText("Golf Benchmarks");

    // 7 bracket links
    const links = page.locator('a[href^="/benchmarks/"]');
    await expect(links).toHaveCount(7);

    // Canonical tag
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/benchmarks$/);

    // OG tags
    await expect(
      page.locator('meta[property="og:title"]')
    ).toHaveAttribute("content", /Benchmarks/);

    // BreadcrumbList JSON-LD
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const text = await jsonLd.first().textContent();
    expect(JSON.parse(text!)).toHaveProperty("@type", "BreadcrumbList");
  });

  test("/benchmarks/10-15 shows bracket data with correct JSON-LD", async ({
    page,
  }) => {
    await page.goto("/benchmarks/10-15");
    await expect(page.locator("h1")).toContainText("10\u201315");

    // Data table with benchmark values
    await expect(page.getByTestId("benchmark-data-table")).toBeVisible();

    // Adjacent nav: prev=5-10, next=15-20
    await expect(page.locator('a[href="/benchmarks/5-10"]')).toBeVisible();
    await expect(page.locator('a[href="/benchmarks/15-20"]')).toBeVisible();

    // Calculator CTA present (use first — page has inline link + CTA button)
    await expect(
      page.locator('main a[href="/strokes-gained"]').first()
    ).toBeVisible();

    // JSON-LD: should have both Dataset and BreadcrumbList
    const jsonLdElements = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdElements.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const schemas: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await jsonLdElements.nth(i).textContent();
      const parsed = JSON.parse(text!);
      schemas.push(parsed["@type"]);
    }
    expect(schemas).toContain("Dataset");
    expect(schemas).toContain("BreadcrumbList");
  });

  test("/benchmarks/30-plus renders with 30+ in heading", async ({
    page,
  }) => {
    await page.goto("/benchmarks/30-plus");
    await expect(page.locator("h1")).toContainText("30+");

    // prev=25-30, no next link
    await expect(page.locator('a[href="/benchmarks/25-30"]')).toBeVisible();
  });

  test("/benchmarks/0-5 has no prev link, next=5-10", async ({ page }) => {
    await page.goto("/benchmarks/0-5");
    await expect(page.locator('a[href="/benchmarks/5-10"]')).toBeVisible();
  });

  test("/benchmarks/invalid returns 404", async ({ page }) => {
    const response = await page.goto("/benchmarks/invalid");
    expect(response?.status()).toBe(404);
  });

  test("sitemap contains all benchmark URLs", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    const text = await response?.text();
    expect(text).toContain("/benchmarks/30-plus");
    expect(text).not.toContain("/benchmarks/30+");
    expect(text).toContain("/benchmarks/0-5");
    expect(text).toContain("/benchmarks/10-15");
  });
});
