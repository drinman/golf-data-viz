import { test, expect } from "@playwright/test";

test.describe("Methodology page — citation table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/methodology");
  });

  test("page renders heading and all major sections", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Methodology");
    await expect(page.getByTestId("citations-section")).toBeVisible();
    await expect(page.getByTestId("changelog-section")).toBeVisible();
  });

  test("citations table has exactly 7 metric rows", async ({ page }) => {
    const rows = page.getByTestId("citations-table").locator("tbody tr");
    await expect(rows).toHaveCount(7);
  });

  test("coverage summary reflects published coverage vs unsourced metrics", async ({
    page,
  }) => {
    const citationsSection = page.getByTestId("citations-section");
    await expect(
      citationsSection.getByText(
        "4 of 7 tracked metrics have published-source coverage for some brackets. 3 remain unsourced, and the benchmark is still provisional."
      )
    ).toBeVisible();
  });

  test("sourced metrics show 'Partial' status and 6/7 coverage", async ({
    page,
  }) => {
    // These 4 metrics have Shot Scope data for 6 of 7 brackets (missing 30+)
    const sourcedMetrics = [
      "averageScore",
      "fairwayPercentage",
      "girPercentage",
      "upAndDownPercentage",
    ];

    for (const metric of sourcedMetrics) {
      const row = page.getByTestId(`citation-row-${metric}`);
      await expect(row).toBeVisible();

      // Status should be "Partial" (6/7 brackets, not all 7)
      const status = page.getByTestId(`citation-status-${metric}`);
      await expect(status).toHaveText("Partial");

      // Coverage column
      await expect(row.getByText("6/7 brackets")).toBeVisible();
    }
  });

  test("unsourced metrics show 'Pending' status", async ({ page }) => {
    const pendingMetrics = [
      "puttsPerRound",
      "penaltiesPerRound",
      "scoringDistribution",
    ];

    for (const metric of pendingMetrics) {
      const status = page.getByTestId(`citation-status-${metric}`);
      await expect(status).toHaveText("Pending");
    }
  });

  test("sourced metrics contain Shot Scope links", async ({ page }) => {
    const row = page.getByTestId("citation-row-fairwayPercentage");
    const links = row.locator('a[href*="shotscope.com"]');
    // 6 per-article links (one per bracket 0-5 through 25-30)
    await expect(links).toHaveCount(6);
  });

  test("accessed date is displayed for sourced metrics", async ({ page }) => {
    const row = page.getByTestId("citation-row-girPercentage");
    await expect(row.getByText("2026-03-01")).toBeVisible();
  });

  test("unsourced metrics show em-dash for accessed date and coverage", async ({
    page,
  }) => {
    const row = page.getByTestId("citation-row-puttsPerRound");
    // \u2014 = em dash, rendered as "—"
    const cells = row.locator("td");
    // Accessed (3rd column, index 2) and Coverage (4th column, index 3)
    await expect(cells.nth(2)).toHaveText("\u2014");
    await expect(cells.nth(3)).toHaveText("\u2014");
  });
});

test.describe("Methodology page — changelog", () => {
  test("changelog lists at least 2 entries in version-descending order", async ({
    page,
  }) => {
    await page.goto("/methodology");

    const changelog = page.getByTestId("changelog-section");
    const items = changelog.locator("li");
    await expect(items).toHaveCount(2);

    // First entry is the latest version
    await expect(items.first()).toContainText("v0.2.0");
    await expect(items.last()).toContainText("v0.1.0");
  });

  test("changelog entries include date and summary text", async ({ page }) => {
    await page.goto("/methodology");

    const changelog = page.getByTestId("changelog-section");
    await expect(changelog.getByText("2026-03-01")).toBeVisible();
    await expect(changelog.getByText(/Shot Scope/)).toBeVisible();
  });
});

test.describe("Methodology page — calibration table", () => {
  test("calibration table renders 5 fixture rows with SG values", async ({
    page,
  }) => {
    await page.goto("/methodology");

    // 5 fixture rows in the calibration table
    await expect(page.getByText("Scratch good round")).toBeVisible();
    await expect(page.getByText("10-HCP average")).toBeVisible();
    await expect(page.getByText("15-HCP bad round")).toBeVisible();
    await expect(page.getByText("20-HCP typical")).toBeVisible();
    await expect(page.getByText("30+ HCP round")).toBeVisible();
  });
});
