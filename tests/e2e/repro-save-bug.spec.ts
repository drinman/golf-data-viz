/**
 * Save flow regression tests.
 *
 * Verifies anonymous saves work without any client-side bot checks.
 * Turnstile was removed 2026-03-23 — honeypot + rate limiting provide defense-in-depth.
 *
 * Run: npx playwright test repro-save-bug --project=functional --reporter=list
 */
import { test, expect } from "@playwright/test";
import { submitFullRound } from "./helpers/round-form";

test.describe("Save flow", () => {
  /**
   * Helper: submit a round and return the save CTA locator.
   * Skips the calling test if the save CTA is not rendered
   * (requires ENABLE_ROUND_SAVE + Supabase env vars on the server).
   */
  async function submitAndRequireSaveCta(page: import("@playwright/test").Page) {
    await page.goto("/strokes-gained", { waitUntil: "networkidle" });
    await submitFullRound(page);
    const saveCta = page.locator('[data-testid="post-results-save-cta"]');
    const visible = await saveCta.isVisible().catch(() => false);
    if (!visible) {
      // Wait a moment in case of animation delay
      await page.waitForTimeout(2000);
      const retryVisible = await saveCta.isVisible().catch(() => false);
      if (!retryVisible) {
        test.skip(true, "Save CTA not rendered — ENABLE_ROUND_SAVE likely disabled on server");
      }
    }
    return saveCta;
  }

  test("Anonymous save succeeds without bot check", async ({
    page,
  }) => {
    const saveCta = await submitAndRequireSaveCta(page);

    // Click save — should succeed immediately (no Turnstile delay)
    await saveCta.locator("button").first().click();

    const savedFlash = page.locator("text=Saved!");
    const alreadySaved = page.locator("text=Already saved");

    // Wait up to 15s for success
    const succeeded = await Promise.race([
      savedFlash.waitFor({ timeout: 15000 }).then(() => "saved" as const),
      alreadySaved.waitFor({ timeout: 15000 }).then(() => "already_saved" as const),
      saveCta.waitFor({ state: "hidden", timeout: 15000 }).then(() => "cta_unmounted" as const),
    ]).catch(() => "timeout" as const);

    console.log(`\n=== SAVE TEST ===`);
    console.log(`Result: ${succeeded}`);

    expect(["saved", "already_saved", "cta_unmounted"]).toContain(succeeded);
  });

  test("Anonymous save baseline — button and success state", async ({
    page,
  }) => {
    const saveCta = await submitAndRequireSaveCta(page);

    const btnText = await saveCta.locator("button").first().textContent();
    console.log(`\nSave button: "${btnText?.trim()}"`);

    await saveCta.locator("button").first().click();
    await page.waitForTimeout(10000);

    const errorEl = saveCta.locator(".text-amber-800");
    const errorText = (await errorEl.count()) > 0
      ? await errorEl.textContent()
      : null;
    const saved = (await page.locator("text=Saved!").count()) > 0;
    const alreadySaved = (await page.locator("text=Already saved").count()) > 0;

    console.log(`\n=== BASELINE RESULTS ===`);
    console.log(`Error: "${errorText?.trim() ?? "(none)"}"`);
    console.log(`Saved: ${saved}`);
    console.log(`Already saved: ${alreadySaved}`);

    // Should succeed
    expect(saved || alreadySaved).toBeTruthy();
  });

  test("Honeypot input is not visible to real users", async ({
    page,
  }) => {
    const saveCta = await submitAndRequireSaveCta(page);

    // Honeypot should exist in DOM but be invisible
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).not.toBeVisible();
  });

  test("Save CTA shows no Turnstile disclosure", async ({
    page,
  }) => {
    const saveCta = await submitAndRequireSaveCta(page);

    // Verify no Turnstile/Cloudflare references
    const hasTurnstileText = (await page.locator("text=Cloudflare Turnstile").count()) > 0;
    expect(hasTurnstileText).toBe(false);

    // Verify anonymous mode copy
    const btnText = await saveCta.locator("button").first().textContent();
    expect(btnText?.includes("Start Tracking")).toBe(true);
  });
});
