import { test, expect } from "@playwright/test";
import { submitFullRound } from "./helpers/round-form";

test.describe("Copy Link", () => {
  test("copies URL-only to clipboard (no headline prefix)", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Click the copy link icon button
    await page.click('[data-testid="copy-link"]');

    // Read clipboard contents
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    // Should start with https:// (URL only, no headline prefix)
    expect(clipboardText).toMatch(/^https?:\/\//);
    // Should not contain newlines (which would cause browser to Google-search)
    expect(clipboardText).not.toContain("\n");
    // Should contain the share URL
    expect(clipboardText).toContain("/strokes-gained");
  });

  test("shows Copied feedback after clicking copy link", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    await page.click('[data-testid="copy-link"]');

    // Should show "Copied!" text
    await expect(page.getByText("Copied!")).toBeVisible({ timeout: 2000 });
  });
});
