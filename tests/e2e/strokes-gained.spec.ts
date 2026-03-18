import { test, expect } from "@playwright/test";
import {
  fillFullRound,
  submitFullRound,
  submitPartialRound,
  submitTroubleEligibleRound,
} from "./helpers/round-form";

test.describe("Strokes Gained Benchmarker", () => {
  const plusDisclosurePattern =
    /estimated below scratch using extrapolated peer data|Category benchmarks use scratch \(0 HCP\) peer data/;

  test("sample result preview with radar chart is visible on SG page", async ({ page }) => {
    await page.goto("/strokes-gained");
    const preview = page.getByTestId("sample-result-preview");
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Torrey Pines South")).toBeVisible();
    // Verify category labels are shown (use .first() — labels appear in both radar SVG and grid)
    await expect(preview.getByText("Off the Tee").first()).toBeVisible();
    await expect(preview.getByText("Putting").first()).toBeVisible();
    // Verify real sample output is rendered (not just headings)
    await expect(preview.getByText("Total SG")).toBeVisible();
    await expect(preview.getByText(/[+-]\d+\.\d{2}/).first()).toBeVisible();
    // Full preview includes SVG radar chart
    await expect(preview.locator("svg").first()).toBeVisible();
    // Confirm preview appears before the trust panel
    const previewBox = await preview.boundingBox();
    const trustPanel = page.locator('section[aria-label="What this is"]');
    const trustBox = await trustPanel.boundingBox();
    expect(previewBox!.y).toBeLessThan(trustBox!.y);
  });

  test("'Try with Sample Data' button produces results and hides preview", async ({ page }) => {
    await page.goto("/strokes-gained");

    // Button should be visible
    const tryBtn = page.getByTestId("try-sample-btn");
    await expect(tryBtn).toBeVisible();
    await expect(tryBtn).toContainText("Try with Sample Data");

    // Click it
    await tryBtn.click();

    // Results should appear
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Preview should be hidden
    await expect(page.getByTestId("sample-result-preview")).not.toBeVisible();
    await expect(tryBtn).not.toBeVisible();

    // Form should be populated with sample data
    await expect(page.locator('[name="course"]')).toHaveValue("Torrey Pines South");
    await expect(page.locator('[name="score"]')).toHaveValue("87");
    await expect(page.locator('[name="handicapIndex"]')).toHaveValue("14.3");
  });

  test("course info row stays in a two-column desktop layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/strokes-gained");

    await page.fill('[name="date"]', "2026-03-05");
    await page.fill('[name="courseRating"]', "72.0");
    await page.fill('[name="slopeRating"]', "130");

    const courseInfoRow = page.getByTestId("course-info-row");
    await expect(courseInfoRow).toBeVisible();

    const children = courseInfoRow.locator(":scope > *");
    await expect(children).toHaveCount(2);

    const leftBox = await children.nth(0).boundingBox();
    const rightBox = await children.nth(1).boundingBox();

    expect(leftBox).toBeTruthy();
    expect(rightBox).toBeTruthy();

    if (!leftBox || !rightBox) {
      throw new Error("Expected desktop course info inputs to have bounding boxes");
    }

    expect(rightBox.x).toBeGreaterThan(leftBox.x + leftBox.width / 2);
    expect(Math.abs(rightBox.y - leftBox.y)).toBeLessThan(8);
    expect(rightBox.y).toBeLessThan(leftBox.y + leftBox.height);
  });

  test("form shows compact trust module", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    await expect(
      page.getByText("See where your strokes went this round.")
    ).toBeVisible();
    await expect(
      page.getByText("Beta")
    ).toBeVisible();
    await expect(
      page.getByText("Scorecard Strokes Gained", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Private")
    ).toBeVisible();
    await expect(
      page.getByText("Open")
    ).toBeVisible();
    await expect(
      page.getByText("This is a peer-compared SG proxy built from round-level inputs, not shot-level tracking.")
    ).toHaveCount(0);
    const commonQuestions = page.getByText("Common questions");
    await expect(commonQuestions).toBeVisible();
    await commonQuestions.click();
    await expect(
      page.getByRole("link", { name: "Methodology" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Privacy" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "GitHub" }).first()
    ).toBeVisible();
    await expect(
      page.getByText("Standard handicaps enter as 14.3. Plus handicaps use the + toggle and enter 2.3.")
    ).toBeVisible();
    await expect(
      page.getByText("Found on your scorecard — not the same as par")
    ).toBeVisible();
    await expect(
      page.getByText("From your scorecard or post-round app. Must add up to 18.")
    ).toBeVisible();
  });

  test("full happy path: submit round and see radar chart", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("Strokes Gained");

    // Fill handicap first and verify bracket label
    await page.fill('[name="handicapIndex"]', "14.3");
    await expect(page.getByTestId("form-wrapper").getByText("10\u201315 HCP")).toBeVisible();

    // Submit full round
    await submitFullRound(page);

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
    await expect(results.getByText("Putting", { exact: true })).toBeVisible();

    // Verify bracket label in results summary (exact text)
    await expect(
      sgResults.getByText("Compared to 10\u201315 HCP")
    ).toBeVisible();
  });

  test("submit round → URL updates with ?d= → navigate fresh → results auto-render", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // URL should now contain ?d= param
    const urlAfterSubmit = page.url();
    expect(urlAfterSubmit).toContain("?d=");

    // Extract the ?d= param and navigate to it fresh
    const dParam = new URL(urlAfterSubmit).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);

    // Results should auto-render without any form interaction
    await expect(
      page.getByText("Your Round Breakdown")
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
    await submitFullRound(page);

    // Click download and verify a download event fires
    const downloadPromise = page.waitForEvent("download");
    await page.click('[data-testid="download-png"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("strokes-gained.png");
  });

  test("shared URL renders correct OG metadata", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Get the shared URL
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    // Navigate to shared URL and check meta tags
    await page.goto(`/strokes-gained?d=${dParam}`);
    await page.waitForLoadState("domcontentloaded");

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content");
    expect(ogTitle).toContain("Shot 87");
    expect(ogTitle).toContain("Pacifica Sharp Park");

    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    expect(ogDesc).toBeTruthy();
    expect(ogDesc).toContain("index");
    expect(ogDesc).toContain("GIR");

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
    await submitFullRound(page);

    const sgResults = page.locator('[data-testid="sg-results"]');

    // Trust label with "SG · Benchmarks" language + Beta pill
    // Scoped to visible results summary (share card has a duplicate off-screen)
    const trustLabel = sgResults
      .getByText(/SG.*Benchmarks/)
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
    // SG formulas section uses card layout with h3 headings
    await expect(page.getByRole("heading", { name: "Off the Tee", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Putting", level: 3 })).toBeVisible();
    await expect(page.getByText(/scorecard-based model/i).first()).toBeVisible();
  });

  test("V3 results show Course-Adjusted badge and methodology tooltip with signal breakdown", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    const sgResults = page.locator('[data-testid="sg-results"]');

    // Course-Adjusted badge visible on hero card
    await expect(sgResults.getByText("Course-Adjusted").first()).toBeVisible();

    // Methodology tooltip trigger exists and is clickable
    const tooltipTrigger = sgResults.locator('[aria-expanded]').first();
    await expect(tooltipTrigger).toBeVisible();
    await tooltipTrigger.click();

    // Signal breakdown section should appear
    await expect(sgResults.getByText("Signal breakdown").first()).toBeVisible();
  });

  test("partial round (blank FIR/GIR) shows confidence badges and survives share/reload", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitPartialRound(page);

    const sgResults = page.locator('[data-testid="sg-results"]');

    // Confidence badges render as buttons with aria-label "X confidence"
    const confidenceButtons = sgResults.getByRole("button", { name: /confidence/ });
    await expect(confidenceButtons.first()).toBeVisible();
    await confidenceButtons.first().click();
    // Clicking a confidence badge opens an explanation popover
    await expect(
      sgResults.locator('[role="dialog"]').first()
    ).toBeVisible();

    // All four categories should show SG values
    const results = sgResults.locator("ul");
    await expect(results.getByText("Off the Tee")).toBeVisible();
    await expect(results.getByText("Approach")).toBeVisible();
    await expect(results.getByText("Around the Green")).toBeVisible();
    await expect(results.getByText("Putting", { exact: true })).toBeVisible();

    // Get the share URL and navigate to it fresh
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Confidence badges should still render after reload
    const reloadedResults = page.locator('[data-testid="sg-results"]');
    await expect(
      reloadedResults.getByRole("button", { name: /confidence/ }).first()
    ).toBeVisible();
  });

  test("results render without pre-submit save banners", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Results should render
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Old save banners should not appear (no pre-submit checkbox)
    await expect(page.getByTestId("save-success")).not.toBeVisible();
    // Save checkbox should not be in the form
    await expect(
      page.getByLabel("Save this round to track over time")
    ).not.toBeVisible();
  });

  test("submit button shows Calculating... while processing", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await fillFullRound(page);

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
    await submitFullRound(page);

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

  test("plus handicap: toggle to +, enter 2.3, submit and see Plus HCP disclosure", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Toggle to plus
    await page.click('[data-testid="plus-handicap-toggle"]');
    await expect(page.getByTestId("plus-handicap-toggle")).toContainText("+");

    // Enter unsigned value
    await page.fill('[name="handicapIndex"]', "2.3");
    await expect(page.locator("span").getByText("Plus HCP")).toBeVisible();

    // Fill rest of round
    await page.fill('[name="course"]', "Plus Test Course");
    await page.fill('[name="courseRating"]', "72.0");
    await page.fill('[name="slopeRating"]', "113");
    await page.fill('[name="score"]', "71");
    await page.fill('[name="fairwaysHit"]', "10");
    await page.fill('[name="fairwayAttempts"]', "14");
    await page.fill('[name="greensInRegulation"]', "12");
    await page.fill('[name="totalPutts"]', "29");
    await page.fill('[name="penaltyStrokes"]', "0");
    await page.fill('[name="eagles"]', "0");
    await page.fill('[name="birdies"]', "3");
    await page.fill('[name="pars"]', "12");
    await page.fill('[name="bogeys"]', "3");
    await page.fill('[name="doubleBogeys"]', "0");
    await page.fill('[name="triplePlus"]', "0");

    await page.click('button[type="submit"]');

    const sgResults = page.locator('[data-testid="sg-results"]');
    await expect(sgResults).toBeVisible({ timeout: 5000 });

    // Verify "Plus HCP" in results
    await expect(sgResults.getByText("Compared to Plus HCP")).toBeVisible();

    // Verify disclosure text
    await expect(
      sgResults.getByText(plusDisclosurePattern)
    ).toBeVisible();

    // Verify share URL round-trips
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Verify toggle rehydrates as "+"
    await expect(page.getByTestId("plus-handicap-toggle")).toContainText("+");
    // Verify input shows unsigned value
    await expect(page.locator('[name="handicapIndex"]')).toHaveValue("2.3");
    // Verify results still show Plus HCP and disclosure
    await expect(
      page.locator('[data-testid="sg-results"]').getByText("Compared to Plus HCP")
    ).toBeVisible();
    await expect(
      page
        .locator('[data-testid="sg-results"]')
        .getByText(plusDisclosurePattern)
    ).toBeVisible();
  });

  test("trouble-eligible round shows prompt; non-eligible does not", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitTroubleEligibleRound(page);

    // Prompt should appear
    await expect(
      page.getByTestId("trouble-context-prompt")
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText("Improve your results")
    ).toBeVisible();
  });

  test("trouble context: Not now dismisses prompt", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitTroubleEligibleRound(page);

    await expect(page.getByTestId("trouble-context-prompt")).toBeVisible({ timeout: 5000 });
    await page.getByText("Not now").click();
    await expect(page.getByTestId("trouble-context-prompt")).not.toBeVisible();
  });

  test("trouble context: full flow shows narrative", async ({ page }) => {
    await page.goto("/strokes-gained");
    await submitTroubleEligibleRound(page);

    // Click the CTA
    await page.getByText("Add trouble context").click();

    // Modal should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Select count
    await page.getByTestId("trouble-count-2").click();

    // Per-hole cards should appear
    await expect(page.getByTestId("trouble-hole-0")).toBeVisible();
    await expect(page.getByTestId("trouble-hole-1")).toBeVisible();

    // Apply context
    await page.getByTestId("trouble-apply").click();

    // Modal closes
    await expect(dialog).not.toBeVisible();

    // Narrative card should appear
    await expect(page.getByTestId("trouble-narrative")).toBeVisible();

    // Prompt should be gone (replaced by narrative)
    await expect(page.getByTestId("trouble-context-prompt")).not.toBeVisible();
  });

  test("non-eligible round does NOT show trouble prompt", async ({ page }) => {
    await page.goto("/strokes-gained");
    // Submit a full round with good FIR (7/14 = 50%, near peer benchmark)
    await submitFullRound(page);

    // Prompt should NOT appear (FIR not below peer)
    await expect(page.getByTestId("trouble-context-prompt")).not.toBeVisible();
  });

  test("from=history shows adapted heading and compressed subhead", async ({
    page,
  }) => {
    await page.goto("/strokes-gained?from=history");
    await expect(page.locator("h1")).toContainText("Log Another Round");
    await expect(
      page.getByText("Log another round and see how your game is changing.")
    ).toBeVisible();
    // Trust panel should be collapsed (details element)
    await expect(page.getByText("About this tool")).toBeVisible();
    // Back link should be present
    await expect(page.getByText(/Back to History/)).toBeVisible();
  });

  test("shared link ?d= takes priority over from=history", async ({
    page,
  }) => {
    // First, get a valid ?d= param
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    // Navigate with both params — shared link should win
    await page.goto(`/strokes-gained?d=${dParam}&from=history`);
    await expect(page.locator("h1")).toContainText("Strokes Gained Benchmarker");
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });
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
      page.getByText("Your Round Breakdown")
    ).not.toBeVisible();
  });

  test("submit round, reload page, banner appears with course/score", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Results should render
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Reload page — banner should appear
    await page.goto("/strokes-gained");
    await expect(
      page.getByTestId("last-round-banner")
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByTestId("last-round-banner").getByText("Pacifica Sharp Park")
    ).toBeVisible();
    await expect(
      page.getByTestId("last-round-banner").getByText("87")
    ).toBeVisible();
  });

  test("clicking View Results on banner restores results and updates URL", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    await expect(page.getByText("Your Round Breakdown")).toBeVisible({ timeout: 5000 });

    // Reload
    await page.goto("/strokes-gained");
    await expect(page.getByTestId("last-round-banner")).toBeVisible({ timeout: 5000 });

    // Click View Results
    await page.getByTestId("last-round-banner").getByRole("button", { name: /view results/i }).click();

    // Results should appear and URL should update
    await expect(page.getByText("Your Round Breakdown")).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain("?d=");

    // Banner should disappear
    await expect(page.getByTestId("last-round-banner")).not.toBeVisible();
  });

  test("clicking Dismiss on banner removes it and clears localStorage", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    await expect(page.getByText("Your Round Breakdown")).toBeVisible({ timeout: 5000 });

    // Reload
    await page.goto("/strokes-gained");
    await expect(page.getByTestId("last-round-banner")).toBeVisible({ timeout: 5000 });

    // Click Dismiss
    await page.getByTestId("last-round-banner").getByRole("button", { name: /dismiss/i }).click();
    await expect(page.getByTestId("last-round-banner")).not.toBeVisible();

    // Reload again — banner should not appear
    await page.goto("/strokes-gained");
    // Wait for form to load, then verify no banner
    await expect(page.getByTestId("form-wrapper")).toBeVisible();
    await expect(page.getByTestId("last-round-banner")).not.toBeVisible();
  });

  test("banner does not appear with ?d= param", async ({ page }) => {
    // First submit to populate localStorage
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    const dParam = new URL(page.url()).searchParams.get("d");

    // Navigate with ?d= — banner should not appear
    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(page.getByText("Your Round Breakdown")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("last-round-banner")).not.toBeVisible();
  });

  test("banner does not appear with from=history", async ({ page }) => {
    // First submit to populate localStorage
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Navigate with from=history — banner should not appear
    await page.goto("/strokes-gained?from=history");
    await expect(page.getByTestId("form-wrapper")).toBeVisible();
    await expect(page.getByTestId("last-round-banner")).not.toBeVisible();
  });

  test("shared link shows score-first header band with correct score and course", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    const headerBand = page.getByTestId("shared-link-header");
    await expect(headerBand).toBeVisible();
    await expect(headerBand.getByText("87")).toBeVisible();
    await expect(headerBand.getByText("Pacifica Sharp Park")).toBeVisible();
    // SG value renders twice (mobile inline + desktop circle badge); desktop one is last
    await expect(headerBand.getByText(/[+-]\d+\.\d{2}/).last()).toBeVisible();
    await expect(headerBand.getByText(/14\.3 index/)).toBeVisible();
    await expect(headerBand.getByText(/10\u201315 HCP/)).toBeVisible();
  });

  test("shared link shows recipient CTA 'What does your game look like?'", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    const dParam = new URL(page.url()).searchParams.get("d");
    expect(dParam).toBeTruthy();

    await page.goto(`/strokes-gained?d=${dParam}`);
    await expect(
      page.getByText("Your Round Breakdown")
    ).toBeVisible({ timeout: 5000 });

    const cta = page.getByTestId("recipient-cta");
    await expect(cta).toBeVisible();
    await expect(cta.getByText("What does your game look like?")).toBeVisible();
  });

  test("shared link header does NOT appear for user-submitted results", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);
    await expect(page.getByTestId("shared-link-header")).not.toBeVisible();
  });

  test("shared link header does NOT appear for from=history", async ({
    page,
  }) => {
    await page.goto("/strokes-gained?from=history");
    await expect(page.getByTestId("shared-link-header")).not.toBeVisible();
  });

  test("complete funnel: form submit → results with bracket label → share button available", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");
    await submitFullRound(page);

    // Results prove calculation_completed path ran
    await expect(page.getByText("Your Round Breakdown")).toBeVisible({ timeout: 5000 });
    // Bracket label proves enriched context is available
    await expect(page.getByText("Compared to 10\u201315 HCP")).toBeVisible();
    // Share button proves share path is reachable
    await expect(page.getByTestId("copy-link")).toBeVisible();
  });
});
