import { test, expect } from "@playwright/test";

// Precomputed deterministic fixture: a 14.3 HCP round at Pebble Beach, score 82
// Generated via: npx tsx -e "import { encodeRound } from './src/lib/golf/share-codec'; console.log(encodeRound({...}))"
const ENCODED =
  "eyJjb3Vyc2UiOiJQZWJibGUgQmVhY2ggR29sZiBMaW5rcyIsImRhdGUiOiIyMDI2LTAyLTI4Iiwic2NvcmUiOjgyLCJoYW5kaWNhcEluZGV4IjoxNC4zLCJjb3Vyc2VSYXRpbmciOjcyLCJzbG9wZVJhdGluZyI6MTMwLCJmYWlyd2F5c0hpdCI6NywiZmFpcndheUF0dGVtcHRzIjoxNCwiZ3JlZW5zSW5SZWd1bGF0aW9uIjo4LCJ0b3RhbFB1dHRzIjozMSwicGVuYWx0eVN0cm9rZXMiOjEsImVhZ2xlcyI6MCwiYmlyZGllcyI6MiwicGFycyI6OCwiYm9nZXlzIjo1LCJkb3VibGVCb2dleXMiOjIsInRyaXBsZVBsdXMiOjF9";

test.use({
  reducedMotion: "reduce",
  viewport: { width: 1280, height: 800 },
});

test.describe("Visual regression", () => {
  test("home hero matches snapshot", async ({ page }) => {
    await page.goto("/");

    const heroContent = page.getByTestId("hero-content");
    await expect(heroContent).toBeVisible();
    await expect(heroContent).toHaveScreenshot("home-hero.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("strokes-gained results match snapshot", async ({ page }) => {
    await page.goto(`/strokes-gained?d=${ENCODED}`);

    const results = page.getByTestId("sg-results");
    await expect(results).toBeVisible();
    await expect(results).toHaveScreenshot("sg-results.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("share card matches snapshot", async ({ page }) => {
    await page.goto(`/strokes-gained/share-card-preview?d=${ENCODED}`);

    await expect(page.getByTestId("share-card")).toBeVisible();
    const card = page.getByTestId("share-card");
    await expect(card).toHaveScreenshot("share-card.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("lesson-prep builder matches snapshot", async ({ page }) => {
    await page.goto("/test-lesson-prep-builder");

    const builder = page.locator("main");
    await expect(builder).toBeVisible();
    await expect(builder).toHaveScreenshot("lesson-prep-builder.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("lesson-report view matches snapshot", async ({ page }) => {
    await page.goto("/test-lesson-report");

    const report = page.locator("main");
    await expect(report).toBeVisible();
    await expect(report).toHaveScreenshot("lesson-report-view.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("error boundary matches snapshot", async ({ page }) => {
    await page.goto("/test-error");

    const errorSurface = page.locator("main");
    await expect(errorSurface).toBeVisible();
    await expect(errorSurface).toHaveScreenshot("global-error.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
