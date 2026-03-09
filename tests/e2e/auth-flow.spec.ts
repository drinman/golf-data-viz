import { expect, test } from "@playwright/test";

test.describe("Auth Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/strokes-gained/history");
    await expect(page.getByTestId("auth-prompt-sign-in")).toBeVisible();
  });

  test("auth modal opens when clicking sign-in button on history auth prompt", async ({
    page,
  }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();
  });

  test("auth modal has email input, password input, and submit button", async ({
    page,
  }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();
    await expect(page.getByTestId("auth-email-input")).toBeVisible();
    await expect(page.getByTestId("auth-password-input")).toBeVisible();
    await expect(page.getByTestId("auth-submit-btn")).toBeVisible();
  });

  test("auth modal can toggle between sign-in and sign-up modes", async ({
    page,
  }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();

    // Should start in sign-in mode
    await expect(page.getByTestId("auth-modal-title")).toContainText("Welcome back");

    // Toggle to sign-up mode
    await page.getByTestId("auth-toggle-mode").click();
    await expect(page.getByTestId("auth-modal-title")).toContainText("Create your account");

    // Toggle back to sign-in mode
    await page.getByTestId("auth-toggle-mode").click();
    await expect(page.getByTestId("auth-modal-title")).toContainText("Welcome back");
  });

  test("auth modal closes on backdrop click", async ({ page }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();

    // Click the backdrop to close
    await page.getByTestId("auth-modal-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("auth-modal")).not.toBeVisible();
  });

  test("auth modal closes on Escape key", async ({ page }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("auth-modal")).not.toBeVisible();
  });

  test("auth modal shows Google sign-in button", async ({ page }) => {
    await page.getByTestId("auth-prompt-sign-in").click();
    await expect(page.getByTestId("auth-modal")).toBeVisible();
    await expect(page.getByTestId("google-signin-btn")).toBeVisible();
  });
});
