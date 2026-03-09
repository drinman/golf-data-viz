import { expect, test } from "@playwright/test";

test.describe("Round History", () => {
  test("unauthenticated user sees auth prompt on history page", async ({
    page,
  }) => {
    await page.goto("/strokes-gained/history");
    await expect(page.getByText("Round History")).toBeVisible();
    await expect(page.getByTestId("auth-prompt-sign-in")).toBeVisible();
    await expect(page.getByTestId("auth-prompt-sign-in")).toHaveText(
      "Create free account to start tracking"
    );
    // Feature preview cards
    await expect(page.getByText("Biggest Mover")).toBeVisible();
    await expect(page.getByText("SG Trends Over Time")).toBeVisible();
    await expect(page.getByText("Round-by-Round Breakdown")).toBeVisible();
  });

  test("header History link navigates to history page", async ({ page }) => {
    await page.goto("/");
    await page.getByText("History").click();
    await expect(page).toHaveURL(/\/strokes-gained\/history/);
  });

  test("history page has correct title metadata", async ({ page }) => {
    await page.goto("/strokes-gained/history");
    await expect(page).toHaveTitle(/Round History/);
  });
});
