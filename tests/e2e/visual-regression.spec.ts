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

    await expect(page.getByTestId("hero-headline")).toBeVisible();
    await expect(page).toHaveScreenshot("home-hero.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: false,
    });
  });

  test("strokes-gained results match snapshot", async ({ page }) => {
    await page.goto(`/strokes-gained?d=${ENCODED}`);

    await expect(page.getByTestId("sg-results")).toBeVisible();
    await expect(page).toHaveScreenshot("sg-results.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
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
});
