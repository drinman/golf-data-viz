import { expect, test } from "@playwright/test";

test.describe("Round History", () => {
  test("unauthenticated user sees auth prompt on history page", async ({
    page,
  }) => {
    await page.goto("/strokes-gained/history");
    await expect(
      page.getByText("Track Your Progress Over Time")
    ).toBeVisible();
    await expect(page.getByTestId("auth-prompt-sign-in")).toBeVisible();
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
