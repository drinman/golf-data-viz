import { test, expect } from "@playwright/test";

/** Helper: fill and submit a partial round form (no FIR/GIR). */
async function submitPartialRound(page: import("@playwright/test").Page) {
  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Pacifica Sharp Park");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "87");
  // Leave fairwaysHit and greensInRegulation blank
  await page.fill('[name="fairwayAttempts"]', "14");
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

/** Helper: fill a complete round form WITHOUT submitting. */
async function fillRound(page: import("@playwright/test").Page) {
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
}

test.describe("Strokes Gained Benchmarker", () => {
  test("form shows trust hints and save consent defaults to unchecked", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    await expect(
      page.getByText("Your official USGA index (GHIN, TheGrint, etc.)")
    ).toBeVisible();
    await expect(
      page.getByText("Found on your scorecard — not the same as par")
    ).toBeVisible();
    await expect(
      page.getByText("How many of each score type? Must add up to 18")
    ).toBeVisible();

    const saveConsent = page.getByLabel(
      "Save this round anonymously to improve future benchmarks."
    );
    await expect(saveConsent).toBeVisible();
    await expect(saveConsent).not.toBeChecked();
  });

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
    const sgResults = page.locator('[data-testid="sg-results"]');
    await expect(sgResults.locator("svg").first()).toBeVisible();

    // Verify peer-average reference ring rendered inside the chart
    await expect(
      sgResults.locator('[data-testid="peer-average-ring"]').first()
    ).toBeVisible();

    // Verify SG categories in summary list (scoped to avoid duplicate radar axis labels)
    const results = sgResults.locator("ul");
    await expect(results.getByText("Off the Tee")).toBeVisible();
    await expect(results.getByText("Approach")).toBeVisible();
    await expect(results.getByText("Around the Green")).toBeVisible();
    await expect(results.getByText("Putting")).toBeVisible();

    // Verify bracket label in results summary (exact text)
    await expect(
      sgResults.getByText("Compared to 10\u201315 HCP")
    ).toBeVisible();
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

    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots?.toLowerCase()).toContain("noindex");

    // OG image URL should contain the round-specific ?d= payload
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toBeTruthy();
    expect(ogImage).toContain("/strokes-gained/og");
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

  test("results show trust signals and Benchmarks link to methodology", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    const sgResults = page.locator('[data-testid="sg-results"]');

    // Trust label with new "Peer-compared SG" language + Beta pill
    // Scoped to visible results summary (share card has a duplicate off-screen)
    const trustLabel = sgResults
      .getByText(/Peer-compared SG.*Benchmarks v/)
      .first();
    await expect(trustLabel).toBeVisible();
    await expect(
      sgResults.getByText(/encoded \(reversible\) form/i)
    ).toBeVisible();
    await expect(
      sgResults
        .getByText("Driving accuracy and penalty avoidance vs your peers")
        .first()
    ).toBeVisible();

    const readSummary = sgResults.getByText("How to read these results");
    await readSummary.click();
    await expect(
      sgResults.getByText("Outside the dashed ring = better than peers. Inside = worse.")
    ).toBeVisible();
    await expect(
      sgResults.getByText("Positive (+) = you gained strokes. Negative (−) = you lost strokes.")
    ).toBeVisible();
    await expect(
      sgResults.getByText("Focus on your weakest category — that's where practice helps most.")
    ).toBeVisible();

    // Benchmarks link navigates to methodology page (first = visible summary)
    const benchmarksLink = sgResults
      .getByRole("link", { name: /Benchmarks/i })
      .first();
    await expect(benchmarksLink).toBeVisible();
    await benchmarksLink.click();

    // Methodology page renders with key content
    await expect(page.locator("h1")).toContainText("Methodology");
    // Scope to SG formulas table to avoid strict-mode duplicates
    const formulasTable = page.locator("table").first();
    await expect(formulasTable.getByText("Off the Tee")).toBeVisible();
    await expect(formulasTable.getByText("Putting")).toBeVisible();
    await expect(page.getByText(/proxy model/i).first()).toBeVisible();
  });

  test("partial round (blank FIR/GIR) shows Est. badges and survives share/reload", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitPartialRound(page);

    const sgResults = page.locator('[data-testid="sg-results"]');

    // Estimated categories should show "Est." badge instead of "Not Tracked"
    const estBadges = sgResults.getByText("Est.");
    await expect(estBadges.first()).toBeVisible();

    // All four categories should show SG values
    const results = sgResults.locator("ul");
    await expect(results.getByText("Off the Tee")).toBeVisible();
    await expect(results.getByText("Approach")).toBeVisible();
    await expect(results.getByText("Around the Green")).toBeVisible();
    await expect(results.getByText("Putting")).toBeVisible();

    // Get the share URL and navigate to it fresh
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(
      page.getByText("Your Strokes Gained Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // "Est." badges should still render after reload
    const reloadedResults = page.locator('[data-testid="sg-results"]');
    await expect(reloadedResults.getByText("Est.").first()).toBeVisible();
  });

  test("unchecked save consent computes results without save banners", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    await expect(page.getByTestId("save-success")).not.toBeVisible();
    await expect(page.getByTestId("save-error")).not.toBeVisible();
  });

  test("submit button shows Calculating... while processing", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await fillRound(page);

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toContainText("See My Strokes Gained");

    // Click submit — button should flip to loading state
    await submitBtn.click();
    await expect(submitBtn).toContainText("Calculating...");
    await expect(submitBtn).toBeDisabled();

    // Eventually returns to normal
    await expect(submitBtn).toContainText("See My Strokes Gained", {
      timeout: 3000,
    });
    await expect(submitBtn).toBeEnabled();
  });

  test("PNG download button shows Preparing... while capturing", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitRound(page);

    const dlBtn = page.getByTestId("download-png");
    await expect(dlBtn).toContainText("Download PNG");

    // Click download — button should flip to loading state
    const downloadPromise = page.waitForEvent("download");
    await dlBtn.click();
    await expect(dlBtn).toContainText("Preparing...");
    await expect(dlBtn).toBeDisabled();

    // After download completes, button resets
    await downloadPromise;
    await expect(dlBtn).toContainText("Download PNG", { timeout: 5000 });
    await expect(dlBtn).toBeEnabled();
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
