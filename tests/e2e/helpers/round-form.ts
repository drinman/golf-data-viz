import { expect, type Page } from "@playwright/test";

/**
 * Fill a round that triggers trouble context eligibility:
 * low FIR (5/14 = 35.7%) + negative approach SG.
 */
export async function fillTroubleEligibleRound(page: Page) {
  await page.fill('[name="handicapIndex"]', "14.3");
  await page.fill('[name="course"]', "Trouble Test Course");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "95");
  await page.fill('[name="fairwaysHit"]', "5");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="greensInRegulation"]', "3");
  await page.fill('[name="totalPutts"]', "35");
  await page.fill('[name="penaltyStrokes"]', "3");
  await page.fill('[name="eagles"]', "0");
  await page.fill('[name="birdies"]', "0");
  await page.fill('[name="pars"]', "5");
  await page.fill('[name="bogeys"]', "6");
  await page.fill('[name="doubleBogeys"]', "5");
  await page.fill('[name="triplePlus"]', "2");
}

export async function submitTroubleEligibleRound(page: Page) {
  await fillTroubleEligibleRound(page);
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Round Breakdown")
  ).toBeVisible({ timeout: 5000 });
}

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
    page.getByText("Your Round Breakdown")
  ).toBeVisible({ timeout: 5000 });
}

export async function submitFullRound(page: Page) {
  await fillFullRound(page);
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Round Breakdown")
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Fill a plus-handicap round (handicapIndex -2.1).
 * Clicks the plus-handicap toggle, then enters absolute value 2.1.
 * Scoring: 5 birdies + 9 pars + 4 bogeys = 18 holes, score 70.
 */
export async function fillPlusHandicapRound(page: Page) {
  // Toggle to plus handicap mode
  await page.click('[data-testid="plus-handicap-toggle"]');
  await page.fill('[name="handicapIndex"]', "2.1");
  await page.fill('[name="course"]', "Repro Plus HCP Course");
  await page.fill('[name="courseRating"]', "72.0");
  await page.fill('[name="slopeRating"]', "130");
  await page.fill('[name="score"]', "70");
  await page.fill('[name="fairwaysHit"]', "10");
  await page.fill('[name="fairwayAttempts"]', "14");
  await page.fill('[name="greensInRegulation"]', "12");
  await page.fill('[name="totalPutts"]', "28");
  await page.fill('[name="penaltyStrokes"]', "0");
  await page.fill('[name="eagles"]', "0");
  await page.fill('[name="birdies"]', "5");
  await page.fill('[name="pars"]', "9");
  await page.fill('[name="bogeys"]', "4");
  await page.fill('[name="doubleBogeys"]', "0");
  await page.fill('[name="triplePlus"]', "0");
}

export async function submitPlusHandicapRound(page: Page) {
  await fillPlusHandicapRound(page);
  await page.click('button[type="submit"]');
  await expect(
    page.getByText("Your Round Breakdown")
  ).toBeVisible({ timeout: 5000 });
}
