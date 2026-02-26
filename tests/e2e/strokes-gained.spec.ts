import { test, expect } from "@playwright/test";

test.describe("Strokes Gained Benchmarker", () => {
  test("full happy path: submit round and see radar chart", async ({
    page,
  }) => {
    await page.goto("/strokes-gained");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("Strokes Gained");

    // Fill handicap
    await page.fill('[name="handicapIndex"]', "14.3");

    // Verify bracket label appears
    await expect(page.getByText("10-15 bracket")).toBeVisible();

    // Fill course info
    await page.fill('[name="course"]', "Pacifica Sharp Park");
    await page.fill('[name="courseRating"]', "72.0");
    await page.fill('[name="slopeRating"]', "130");
    await page.fill('[name="score"]', "87");

    // Fill core stats
    await page.fill('[name="fairwaysHit"]', "7");
    await page.fill('[name="fairwayAttempts"]', "14");
    await page.fill('[name="greensInRegulation"]', "6");
    await page.fill('[name="totalPutts"]', "33");
    await page.fill('[name="penaltyStrokes"]', "2");

    // Fill scoring distribution (must sum to 18)
    await page.fill('[name="eagles"]', "0");
    await page.fill('[name="birdies"]', "1");
    await page.fill('[name="pars"]', "7");
    await page.fill('[name="bogeys"]', "7");
    await page.fill('[name="doubleBogeys"]', "2");
    await page.fill('[name="triplePlus"]', "1");

    // Submit
    await page.click('button[type="submit"]');

    // Wait for results
    await expect(
      page.getByText("Your Strokes Gained Breakdown")
    ).toBeVisible({ timeout: 5000 });

    // Verify radar chart rendered (Nivo renders SVG)
    await expect(page.locator("svg")).toBeVisible();

    // Verify SG categories are displayed
    await expect(page.getByText("Off the Tee")).toBeVisible();
    await expect(page.getByText("Approach")).toBeVisible();
    await expect(page.getByText("Around the Green")).toBeVisible();
    await expect(page.getByText("Putting")).toBeVisible();

    // Verify bracket label in results
    await expect(page.getByText("10-15 handicap golfers")).toBeVisible();
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
