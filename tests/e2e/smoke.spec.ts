import { expect, test } from "@playwright/test";

test("home page responds", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("strokes-gained page loads", async ({ page }) => {
  await page.goto("/strokes-gained");
  await expect(page.locator("h1")).toContainText("Strokes Gained");
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
