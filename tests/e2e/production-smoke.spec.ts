import { expect, test } from "@playwright/test";
import {
  fillFullRound,
  submitPartialRound,
} from "./helpers/round-form";

function skipUnlessRemoteBaseUrl() {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL?.startsWith("https://"),
    "Production smoke runs only against an explicit remote base URL"
  );
}

test.describe("Production smoke", () => {
  test("homepage CTA and full round flow work end-to-end", async ({
    page,
  }) => {
    skipUnlessRemoteBaseUrl();
    await page.goto("/?utm_source=reddit");
    await expect(page.getByTestId("hero-headline")).toBeVisible();
    await expect(page.getByTestId("hero-cta")).toHaveAttribute(
      "href",
      "/strokes-gained?utm_source=reddit"
    );

    await page.getByTestId("hero-cta").click();
    await expect(page).toHaveURL(/\/strokes-gained\?utm_source=reddit/);

    await fillFullRound(page);
    await page.click('button[type="submit"]');
    await expect(page.getByTestId("sg-results")).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\?d=/);

    // Verify share buttons render (download behavior is browser-specific;
    // covered by functional tests on Chromium)
    await expect(page.getByTestId("share-image")).toBeVisible();
    await expect(page.getByTestId("copy-link")).toBeVisible();
  });

  test("partial round flow shows confidence badges", async ({ page }) => {
    skipUnlessRemoteBaseUrl();
    await page.goto("/strokes-gained");
    await submitPartialRound(page);

    const partialResults = page.getByTestId("sg-results");
    await expect(partialResults).toBeVisible();

    // Confidence badges render as buttons with aria-label "X confidence"
    const confidenceButtons = partialResults.getByRole("button", {
      name: /confidence/,
    });
    await expect(confidenceButtons.first()).toBeVisible();
    await confidenceButtons.first().click();
    // Clicking opens an explanation popover
    await expect(
      partialResults.locator('[role="dialog"]').first()
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      partialResults.locator('[role="dialog"]')
    ).not.toBeVisible();
  });
});
