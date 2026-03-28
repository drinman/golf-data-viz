/**
 * Reproduction test for NUMERIC(4,2) overflow bug.
 *
 * A 54-handicap golfer on a hard course (slope 155, rating 80) shooting 50
 * produces a total SG anchor of ~104, which can be concentrated into a single
 * SG category column. NUMERIC(4,2) max is 99.99 — this triggers DB overflow.
 *
 * Run: npx playwright test repro-numeric-overflow --project=functional --reporter=list
 */
import { test, expect } from "@playwright/test";

test("NUMERIC(4,2) overflow — 54 handicap extreme round triggers DB_ERROR", async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    consoleMessages.push(`[pageerror] ${err.message}`);
  });

  await page.goto("http://localhost:3000/strokes-gained", {
    waitUntil: "networkidle",
  });

  // Fill extreme inputs.
  //
  // Scoring tolerance check: |impliedOverPar - actualOverCourseRating| <= 5
  //   actualOverCourseRating = score - courseRating = 50 - 80 = -30
  //   impliedOverPar = (-2 * eagles) + (-1 * birdies) = (-2*15) + (-1*3) = -33
  //   |-33 - (-30)| = 3  ✓ passes
  //
  // Schema limits: score min=50, handicapIndex max=54, courseRating max=80, slopeRating max=155
  await page.fill('[name="course"]', "Overflow Test Course");
  await page.fill('[name="handicapIndex"]', "54");
  await page.fill('[name="courseRating"]', "80.0");
  await page.fill('[name="slopeRating"]', "155");
  await page.fill('[name="score"]', "50");
  await page.fill('[name="fairwaysHit"]', "14");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="greensInRegulation"]', "18");
  await page.fill('[name="totalPutts"]', "18");
  await page.fill('[name="penaltyStrokes"]', "0");
  // 15 eagles + 3 birdies = 18 holes; impliedOverPar = -33 (within tolerance of -30)
  await page.fill('[name="eagles"]', "15");
  await page.fill('[name="birdies"]', "3");
  await page.fill('[name="pars"]', "0");
  await page.fill('[name="bogeys"]', "0");
  await page.fill('[name="doubleBogeys"]', "0");
  await page.fill('[name="triplePlus"]', "0");

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for results
  await expect(page.getByText("Your Round Breakdown")).toBeVisible({
    timeout: 10000,
  });

  console.log("\n=== Calculation results rendered ===");

  // Look for the save CTA
  const saveCta = page.locator('[data-testid="post-results-save-cta"]');
  const ctaVisible = await saveCta.isVisible().catch(() => false);

  if (!ctaVisible) {
    await page.waitForTimeout(2000);
    const retryVisible = await saveCta.isVisible().catch(() => false);
    if (!retryVisible) {
      console.log(
        "\nSave CTA not present — ENABLE_ROUND_SAVE likely off. Skipping save step."
      );
      test.skip(
        true,
        "Save CTA not rendered — ENABLE_ROUND_SAVE likely disabled on server"
      );
      return;
    }
  }

  console.log("\nSave CTA found, clicking...");
  await saveCta.locator("button").first().click();

  // Wait for outcome
  const savedFlash = page.locator("text=Saved!");
  const alreadySaved = page.locator("text=Already saved");
  const errorText = page.locator(".text-amber-800, .text-red-600, .text-red-500");

  let outcome: "saved" | "already_saved" | "error" | "cta_hidden" | "timeout" =
    "timeout";

  outcome = await Promise.race([
    savedFlash
      .waitFor({ timeout: 15000 })
      .then(() => "saved" as const),
    alreadySaved
      .waitFor({ timeout: 15000 })
      .then(() => "already_saved" as const),
    errorText
      .waitFor({ timeout: 15000 })
      .then(() => "error" as const),
    saveCta
      .waitFor({ state: "hidden", timeout: 15000 })
      .then(() => "cta_hidden" as const),
  ]).catch(() => "timeout" as const);

  // Capture any error message text
  let errorContent: string | null = null;
  if (outcome === "error") {
    errorContent = await errorText.textContent().catch(() => null);
  }

  // Check page HTML for DB_ERROR text
  const pageContent = await page.content();
  const hasDbError =
    pageContent.includes("DB_ERROR") ||
    pageContent.includes("overflow") ||
    pageContent.includes("numeric");

  console.log("\n=== OVERFLOW REPRO RESULTS ===");
  console.log(`Outcome: ${outcome}`);
  console.log(`Error element text: "${errorContent?.trim() ?? "(none)"}"`);
  console.log(`Page contains DB_ERROR/overflow: ${hasDbError}`);
  console.log("\n=== Console messages ===");
  consoleMessages.forEach((m) => console.log(m));

  // The bug manifests as outcome === "error" or "timeout" (DB exception)
  // A fix would yield "saved" or "already_saved"
  // This test deliberately captures the current state — assertion shows the bug
  console.log("\n=== TEST VERDICT ===");
  if (outcome === "saved" || outcome === "already_saved" || outcome === "cta_hidden") {
    console.log("PASS — save succeeded (bug may be fixed or not triggered)");
  } else if (outcome === "error") {
    console.log(`FAIL — save showed error: "${errorContent?.trim()}"`);
    console.log("This is the NUMERIC(4,2) overflow bug.");
  } else {
    console.log(`INCONCLUSIVE — outcome: ${outcome}`);
  }

  // Hard assertion: fail CI if the bug regresses
  expect(
    ["saved", "already_saved", "cta_hidden"],
    `Save failed with outcome "${outcome}". NUMERIC overflow may have regressed.`
  ).toContain(outcome);
});
