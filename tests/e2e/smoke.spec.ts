import { expect, test } from "@playwright/test";

test("home page renders landing headline and CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-headline")).toBeVisible();
  await expect(page.getByTestId("hero-cta")).toBeVisible();
});

test("CTA navigates to /strokes-gained", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta").click();
  await expect(page).toHaveURL(/\/strokes-gained/);
});

test("how-it-works section is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("how-it-works")).toBeVisible();
  // 3 steps
  const steps = page.getByTestId("how-it-works").locator("[data-testid^='step-']");
  await expect(steps).toHaveCount(3);
});

test("no Next.js starter content remains", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=To get started")).not.toBeVisible();
  await expect(page.locator("text=Deploy Now")).not.toBeVisible();
});

test("strokes-gained page loads", async ({ page }) => {
  await page.goto("/strokes-gained");
  await expect(page.locator("h1")).toContainText("Strokes Gained");
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
