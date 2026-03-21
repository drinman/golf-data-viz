/**
 * Reproduction script for the save-round bug.
 *
 * Bug report:
 * 1. Originally: "Bot check failed. Please try again" (Turnstile failure)
 * 2. After signing out/in: "won't save the round" with NO bot error message
 *
 * Run: PLAYWRIGHT_BASE_URL=https://golfdataviz.com npx playwright test repro-save-bug --project=functional --reporter=list
 */
import { test, expect } from "@playwright/test";
import { submitFullRound } from "./helpers/round-form";

test.describe("Reproduce save-round bug", () => {
  test("Anonymous save succeeds even when Turnstile is blocked by adblocker", async ({
    page,
  }) => {
    // Block Turnstile domain to simulate adblocker
    const blockedRequests: string[] = [];
    await page.route("**/challenges.cloudflare.com/**", (route) => {
      blockedRequests.push(route.request().url());
      route.abort("blockedbyclient");
    });

    await page.goto("/strokes-gained", { waitUntil: "networkidle" });
    await submitFullRound(page);

    const saveCta = page.locator('[data-testid="post-results-save-cta"]');
    await expect(saveCta).toBeVisible({ timeout: 10000 });

    // Click save — should succeed despite blocked Turnstile
    await saveCta.locator("button").first().click();

    // On success: "Saved!" flashes briefly (300ms) then the CTA unmounts
    // (parent sets saveSuccess=true). Wait for either the flash or the unmount.
    // On failure: CTA stays visible with an error message.
    const savedFlash = page.locator("text=Saved!");
    const alreadySaved = page.locator("text=Already saved");

    // Wait up to 15s for one of: success flash, already-saved, or CTA disappears
    const succeeded = await Promise.race([
      savedFlash.waitFor({ timeout: 15000 }).then(() => "saved" as const),
      alreadySaved.waitFor({ timeout: 15000 }).then(() => "already_saved" as const),
      saveCta.waitFor({ state: "hidden", timeout: 15000 }).then(() => "cta_unmounted" as const),
    ]).catch(() => "timeout" as const);

    console.log(`\n=== ADBLOCKER SAVE TEST ===`);
    console.log(`Result: ${succeeded}`);
    console.log(`Blocked Turnstile requests: ${blockedRequests.length}`);

    // Save MUST succeed even with Turnstile blocked
    expect(["saved", "already_saved", "cta_unmounted"]).toContain(succeeded);
  });

  test("REPRO 2: Anonymous + Turnstile working → baseline should save", async ({
    page,
  }) => {
    await page.goto("/strokes-gained", { waitUntil: "networkidle" });
    await submitFullRound(page);

    const saveCta = page.locator('[data-testid="post-results-save-cta"]');
    await expect(saveCta).toBeVisible({ timeout: 10000 });

    const btnText = await saveCta.locator("button").first().textContent();
    console.log(`\nSave button: "${btnText?.trim()}"`);

    await page.screenshot({
      path: "tests/screenshots/repro2-before-save.png",
      fullPage: true,
    });

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

    await page.screenshot({
      path: "tests/screenshots/repro2-after-save.png",
      fullPage: true,
    });

    // Should succeed
    expect(saved || alreadySaved).toBeTruthy();
  });

  test("DIAG: Page state + save CTA for unauthenticated user", async ({
    page,
  }) => {
    await page.goto("/strokes-gained", { waitUntil: "networkidle" });

    // Check auth state
    const authState = await page.evaluate(() => {
      const cookies = document.cookie;
      return {
        hasSbCookies: cookies.includes("sb-"),
        cookieSnippet: cookies.substring(0, 300),
      };
    });
    console.log(`\nAuth: sb-cookies=${authState.hasSbCookies}`);
    expect(authState.hasSbCookies).toBe(false);

    // Submit round
    await submitFullRound(page);

    const saveCta = page.locator('[data-testid="post-results-save-cta"]');
    await expect(saveCta).toBeVisible({ timeout: 10000 });

    // Check all the CTA state
    const btnText = await saveCta.locator("button").first().textContent();
    const hasTurnstileText = (await page.locator("text=Cloudflare Turnstile").count()) > 0;
    const hasAnonLabel = btnText?.includes("Save This Round");
    const hasAuthLabel = btnText?.includes("Save to History");

    console.log(`Button: "${btnText?.trim()}"`);
    console.log(`Anonymous mode: ${hasAnonLabel}`);
    console.log(`Authenticated mode: ${hasAuthLabel}`);
    console.log(`Turnstile disclosure: ${hasTurnstileText}`);

    // For anonymous user, we should see anonymous mode + Turnstile
    expect(hasAnonLabel).toBe(true);
    expect(hasTurnstileText).toBe(true);

    await page.screenshot({
      path: "tests/screenshots/repro-diag.png",
      fullPage: true,
    });
  });
});
