import { test, expect } from "@playwright/test";

test.describe("Privacy policy page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/privacy");
  });

  test("page returns 200 and renders heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Privacy Policy");
  });

  test("page contains expected content sections", async ({ page }) => {
    await expect(page.getByTestId("privacy-collect")).toBeVisible();
    await expect(page.getByTestId("privacy-not-collect")).toBeVisible();
    await expect(page.getByTestId("privacy-storage")).toBeVisible();
    await expect(page.getByTestId("privacy-sharing")).toBeVisible();
    await expect(page.getByTestId("privacy-analytics")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toBeVisible();
  });

  test("page has effective date", async ({ page }) => {
    await expect(page.getByText("Effective")).toBeVisible();
  });

  test("privacy link exists in site footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByTestId("site-footer");
    await expect(footer).toBeVisible();
    const privacyLink = footer.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
  });
});
