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
