import { test, expect } from "@playwright/test";

/** Helper: fill and submit a complete round form. */
async function submitRound(page: import("@playwright/test").Page) {
  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Pacifica Sharp Park");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "87");
  await page.fill('[name="fairwaysHit"]', "7");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="greensInRegulation"]', "6");
  await page.fill('[name="totalPutts"]', "33");
  await page.fill('[name="penaltyStrokes"]', "2");
  await page.fill('[name="eagles"]', "0");
  await page.fill('[name="birdies"]', "1");
  await page.fill('[name="pars"]', "7");
  await page.fill('[name="bogeys"]', "7");
  await page.fill('[name="doubleBogeys"]', "2");
  await page.fill('[name="triplePlus"]', "1");
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Strokes Gained Breakdown")
  ).toBeVisible({ timeout: 5000 });
}

test.describe("Strokes Gained Benchmarker", () => {
  test("full happy path: submit round and see radar chart", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("Strokes Gained");

    // Fill handicap first and verify bracket label
    await page.fill('[name="handicapIndex"]', "14.3");
    await expect(page.getByText("10-15 bracket")).toBeVisible();

    // Submit full round
    await submitRound(page);

    // Verify radar chart rendered (Nivo renders SVG) — scope to results container
    await expect(
      page.locator('[data-testid="sg-results"] svg').first()
    ).toBeVisible();

    // Verify SG categories in summary list (scoped to avoid duplicate radar axis labels)
    const results = page.locator('[data-testid="sg-results"] ul');
    await expect(results.getByText("Off the Tee")).toBeVisible();
    await expect(results.getByText("Approach")).toBeVisible();
    await expect(results.getByText("Around the Green")).toBeVisible();
    await expect(results.getByText("Putting")).toBeVisible();

    // Verify bracket label in results
    await expect(page.getByText("10-15 handicap golfers")).toBeVisible();
  });

  test("submit round → URL updates with ?d= → navigate fresh → results auto-render", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    // URL should now contain ?d= param
    const urlAfterSubmit = page.url();
    expect(urlAfterSubmit).toContain("?d=");

    // Extract the ?d= param and navigate to it fresh
    const dParam = new URL(urlAfterSubmit).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);

    // Results should auto-render without any form interaction
    await expect(
      page.getByText("Your Strokes Gained Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Radar chart should be present
    await expect(
      page.locator('[data-testid="sg-results"] svg').first()
    ).toBeVisible();

    // Course name should appear in the form
    await expect(page.locator('[name="course"]')).toHaveValue(
      "Pacifica Sharp Park"
    );
  });

  test("PNG download button triggers file download", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    // Click download and verify a download event fires
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-testid="download-png"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("strokes-gained.png");
  });

  test("shared URL renders correct OG metadata", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    // Get the shared URL
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    // Navigate to shared URL and check meta tags
    await page.goto(`/strokes-gained?d=${dParam}`);
    await page.waitForLoadState("domcontentloaded");

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle).toContain("SG Breakdown:");
    expect(ogTitle).toContain("Pacifica Sharp Park");

    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    expect(ogDesc).toContain("87");
    expect(ogDesc).toContain("Pacifica Sharp Park");

    // OG image URL should contain the round-specific ?d= payload
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toBeTruthy();
    expect(ogImage).toContain("opengraph-image");
    expect(ogImage).toContain(`d=${dParam}`);
  });

  test("invalid ?d= param shows form without crash", async ({ page }) => {
    await page.goto("/strokes-gained?d=GARBAGE");

    // Page should load normally with the form visible
    await expect(page.locator("h1")).toContainText("Strokes Gained");
    await expect(page.locator('[name="handicapIndex"]')).toBeVisible();

    // Results section should NOT be present
    await expect(page.locator('[data-testid="sg-results"]')).not.toBeVisible();
  });

  test("form validation prevents submission with invalid scoring sum", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Fill minimum required fields but with bad scoring sum
    await page.fill('[name="handicapIndex"]', "14.3");
    await page.fill('[name="course"]', "Test");
    await page.fill('[name="courseRating"]', "72.0");
    await page.fill('[name="slopeRating"]', "130");
    await page.fill('[name="score"]', "87");
    await page.fill('[name="fairwaysHit"]', "7");
    await page.fill('[name="fairwayAttempts"]', "14");
    await page.fill('[name="greensInRegulation"]', "6");
    await page.fill('[name="totalPutts"]', "33");
    await page.fill('[name="penaltyStrokes"]', "2");

    // Scoring that sums to 17 (missing 1)
    await page.fill('[name="eagles"]', "0");
    await page.fill('[name="birdies"]', "1");
    await page.fill('[name="pars"]', "7");
    await page.fill('[name="bogeys"]', "7");
    await page.fill('[name="doubleBogeys"]', "2");
    await page.fill('[name="triplePlus"]', "0");

    await page.click('button[type="submit"]');

    // Should show validation error, not results
    await expect(page.getByText(/total 18/i)).toBeVisible({ timeout: 3000 });
    await expect(
      page.getByText("Your Strokes Gained Breakdown")
    ).not.toBeVisible();
  });
});
