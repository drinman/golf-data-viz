import { test, expect } from "@playwright/test";
import { submitFullRound } from "./helpers/round-form";

test.describe("Share buttons layout", () => {
  test("Share button triggers native share or download fallback", async ({
    page,
  }) => {
    // Stub navigator.canShare and navigator.share for testing
    await page.addInitScript(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (window as any).__shareData = null;
      Object.defineProperty(navigator, "canShare", {
        value: () => true,
        writable: true,
      });
      Object.defineProperty(navigator, "share", {
        value: async (data: any) => {
          (window as any).__shareData = data;
        },
        writable: true,
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Click the Share button
    await page.click('[data-testid="share-image"]');

    // Wait for the share to complete
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).__shareData !== null,
      null,
      { timeout: 10000 }
    );

    // Verify share was called with a File
    const shareData = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).__shareData;
      if (!data?.files?.[0]) return null;
      return {
        fileCount: data.files.length,
        fileName: data.files[0].name,
        fileType: data.files[0].type,
      };
    });

    expect(shareData).not.toBeNull();
    expect(shareData!.fileCount).toBe(1);
    expect(shareData!.fileType).toBe("image/png");
  });

  test("old download-story and download-png buttons do not exist", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    await expect(page.getByTestId("download-story")).not.toBeVisible();
    await expect(page.getByTestId("download-png")).not.toBeVisible();
  });

  test("copy link icon button copies URL-only", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const copyBtn = page.getByTestId("copy-link");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    // URL-only, no headline prefix, no newlines
    expect(clipboardText).toMatch(/^https?:\/\//);
    expect(clipboardText).not.toContain("\n");
  });

  test("copy link shows Copied feedback", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    await page.getByTestId("copy-link").click();
    await expect(page.getByText("Copied!")).toBeVisible({ timeout: 2000 });
  });

  test("receipt discovery section renders with CTA", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const discovery = page.getByTestId("receipt-discovery");
    await expect(discovery).toBeVisible();
    await expect(discovery.getByText("Want the retro receipt?")).toBeVisible();
    await expect(
      discovery.getByText("Monospace scorecard with QR code.")
    ).toBeVisible();

    const receiptBtn = discovery.getByTestId("download-receipt");
    await expect(receiptBtn).toBeVisible();
    await expect(receiptBtn).toContainText("Get the Receipt");
  });

  test("receipt download triggers file download", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-testid="download-receipt"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-receipt\.png$/);
  });

  test("Share button shows Preparing... while capturing", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const shareBtn = page.getByTestId("share-image");
    await expect(shareBtn).toContainText("Share");

    // Click — button should flip to loading state
    const downloadPromise = page.waitForEvent("download");
    await shareBtn.click();
    await expect(shareBtn).toContainText("Preparing...");
    await expect(shareBtn).toBeDisabled();

    // After download completes (fallback path in headless), button resets
    await downloadPromise;
    await expect(shareBtn).toContainText("Share", { timeout: 5000 });
    await expect(shareBtn).toBeEnabled();
  });

  test("two-tier layout: Share + link icon on top, receipt below", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const shareBtn = page.getByTestId("share-image");
    const copyBtn = page.getByTestId("copy-link");
    const discovery = page.getByTestId("receipt-discovery");

    await expect(shareBtn).toBeVisible();
    await expect(copyBtn).toBeVisible();
    await expect(discovery).toBeVisible();

    // Share and copy link should be on the same row
    const shareBox = await shareBtn.boundingBox();
    const copyBox = await copyBtn.boundingBox();
    expect(shareBox).toBeTruthy();
    expect(copyBox).toBeTruthy();
    // On narrow viewports the icon may wrap; use generous tolerance
    expect(Math.abs(shareBox!.y - copyBox!.y)).toBeLessThan(50);
    expect(copyBox!.x).toBeGreaterThan(shareBox!.x);

    // Receipt discovery should be below the primary share row
    const discoveryBox = await discovery.boundingBox();
    expect(discoveryBox).toBeTruthy();
    expect(discoveryBox!.y).toBeGreaterThan(shareBox!.y + shareBox!.height);
  });
});
