import { expect, test } from "@playwright/test";
import { submitFullRound } from "./helpers/round-form";

test.describe("SEO navigation", () => {
  test("footer shows Learn and Benchmarks links on every page", async ({
    page,
  }) => {
    for (const path of ["/", "/strokes-gained", "/methodology", "/privacy"]) {
      await page.goto(path);
      const footer = page.getByTestId("site-footer");
      await expect(
        footer.getByRole("link", { name: "Learn" })
      ).toBeVisible();
      await expect(
        footer.getByRole("link", { name: "Benchmarks" })
      ).toBeVisible();
    }
  });

  test("footer Learn link navigates to /learn", async ({ page }) => {
    await page.goto("/");
    await page
      .getByTestId("site-footer")
      .getByRole("link", { name: "Learn" })
      .click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("footer Benchmarks link navigates to /benchmarks", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByTestId("site-footer")
      .getByRole("link", { name: "Benchmarks" })
      .click();
    await expect(page).toHaveURL(/\/benchmarks$/);
  });

  test("results summary Benchmarks link points to correct bracket", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // submitFullRound uses handicap 14.3 → 10-15 bracket
    const benchmarkLink = page.locator('a[href="/benchmarks/10-15"]');
    await expect(benchmarkLink).toBeVisible();
  });

  test("plus-handicap results Benchmarks link points to /methodology", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Toggle to plus and fill a plus-handicap round
    await page.click('[data-testid="plus-handicap-toggle"]');
    await page.fill('[name="handicapIndex"]', "2.3");
    await page.fill('[name="course"]', "Plus Nav Test");
    await page.fill('[name="courseRating"]', "72.0");
    await page.fill('[name="slopeRating"]', "113");
    await page.fill('[name="score"]', "71");
    await page.fill('[name="fairwaysHit"]', "10");
    await page.fill('[name="fairwayAttempts"]', "14");
    await page.fill('[name="greensInRegulation"]', "12");
    await page.fill('[name="totalPutts"]', "29");
    await page.fill('[name="penaltyStrokes"]', "0");
    await page.fill('[name="eagles"]', "0");
    await page.fill('[name="birdies"]', "3");
    await page.fill('[name="pars"]', "12");
    await page.fill('[name="bogeys"]', "3");
    await page.fill('[name="doubleBogeys"]', "0");
    await page.fill('[name="triplePlus"]', "0");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Benchmarks link should point to /methodology, not /benchmarks/0-5
    const sgResults = page.locator('[data-testid="sg-results"]');
    const benchmarksLink = sgResults
      .getByRole("link", { name: /Benchmarks/i })
      .first();
    await expect(benchmarksLink).toHaveAttribute("href", "/methodology");
  });

  test("methodology page links to /learn/strokes-gained-explained", async ({
    page,
  }) => {
    await page.goto("/methodology");
    const link = page.locator(
      'a[href="/learn/strokes-gained-explained"]'
    );
    await expect(link).toBeVisible();
  });
});
