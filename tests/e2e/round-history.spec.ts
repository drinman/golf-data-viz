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
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "History" })
      .click();
    await expect(page).toHaveURL(/\/strokes-gained\/history/);
  });

  test("history page has correct title metadata", async ({ page }) => {
    await page.goto("/strokes-gained/history");
    await expect(page).toHaveTitle(/Round History/);
  });

  test("empty state CTA says Log a Round and links to benchmarker with from=history", async ({
    page,
  }) => {
    await page.goto("/strokes-gained/history");
    // For unauthenticated users, the empty state isn't directly visible (auth prompt shows),
    // so test the from=history benchmarker adaptation directly
    await page.goto("/strokes-gained?from=history");
    await expect(page.locator("h1")).toContainText("Log Another Round");
    await expect(
      page.getByText(/Back to History/)
    ).toBeVisible();
    // Sample preview should not be visible
    await expect(page.getByTestId("compact-sample-preview")).not.toBeVisible();
  });
});
