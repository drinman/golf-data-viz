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
    await expect(page.getByTestId("sg-results")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\?d=/);

    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
    await page.getByTestId("download-png").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("strokes-gained.png");
  });

  test("partial round flow shows estimate help", async ({ page }) => {
    skipUnlessRemoteBaseUrl();
    await page.goto("/strokes-gained");
    await submitPartialRound(page);

    const partialResults = page.getByTestId("sg-results");
    await expect(partialResults).toBeVisible();

    const estButtons = partialResults.getByRole("button", { name: "Est." });
    await expect(estButtons.first()).toBeVisible();
    await estButtons.first().click();
    await expect(
      partialResults.getByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      partialResults.getByText(
        "This category is estimated from related stats because not all inputs were provided."
      )
    ).not.toBeVisible();
  });
});
