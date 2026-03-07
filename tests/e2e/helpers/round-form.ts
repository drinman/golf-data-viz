import { expect, type Page } from "@playwright/test";

export async function fillPartialRound(page: Page) {
  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Pacifica Sharp Park");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "87");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="totalPutts"]', "33");
  await page.fill('[name="penaltyStrokes"]', "2");
  await page.fill('[name="eagles"]', "0");
  await page.fill('[name="birdies"]', "1");
  await page.fill('[name="pars"]', "7");
  await page.fill('[name="bogeys"]', "7");
  await page.fill('[name="doubleBogeys"]', "2");
  await page.fill('[name="triplePlus"]', "1");
}

export async function fillFullRound(page: Page) {
  await fillPartialRound(page);
  await page.fill('[name="fairwaysHit"]', "7");
  await page.fill('[name="greensInRegulation"]', "6");
}

export async function submitPartialRound(page: Page) {
  await fillPartialRound(page);
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Proxy SG Breakdown")
  ).toBeVisible({ timeout: 5000 });
}

export async function submitFullRound(page: Page) {
  await fillFullRound(page);
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Proxy SG Breakdown")
  ).toBeVisible({ timeout: 5000 });
}
