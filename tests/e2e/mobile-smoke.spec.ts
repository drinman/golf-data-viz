import { test, expect, devices } from "@playwright/test";

test.use({ ...devices["iPhone 13"] });

test("mobile user can submit a round and reach share actions", async ({
  page,
}) => {
  await page.goto("/strokes-gained");

  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Mobile Test Course");
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

  await expect(page.getByText("Your Proxy SG Breakdown")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("download-png")).toBeVisible();
  await expect(page.getByTestId("copy-link")).toBeVisible();
});
