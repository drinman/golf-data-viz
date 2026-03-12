import { expect, test, type Page } from "@playwright/test";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import type { RoundInput } from "../../src/lib/golf/types";
import { getInterpolatedBenchmark } from "../../src/lib/golf/benchmarks";
import { calculateStrokesGained } from "../../src/lib/golf/strokes-gained";
import { toRoundInsert } from "../../src/lib/golf/round-mapper";
import { generateClaimToken } from "../../src/lib/security/claim-token";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const e2eEmail = process.env.PLAYWRIGHT_E2E_EMAIL;
const e2ePassword = process.env.PLAYWRIGHT_E2E_PASSWORD;

function skipUnlessConfigured() {
  test.skip(
    !supabaseUrl || !serviceRoleKey || !e2eEmail || !e2ePassword,
    "Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLAYWRIGHT_E2E_EMAIL, and PLAYWRIGHT_E2E_PASSWORD"
  );
}

function createAdminClient() {
  return createSupabaseClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createClaimableRound() {
  const admin = createAdminClient();
  const playedAt = new Date().toISOString().slice(0, 10);
  const input: RoundInput = {
    course: `Playwright Claim Test ${crypto.randomUUID().slice(0, 8)}`,
    date: playedAt,
    score: 87,
    handicapIndex: 14.3,
    courseRating: 72.1,
    slopeRating: 131,
    fairwaysHit: 7,
    fairwayAttempts: 14,
    greensInRegulation: 6,
    totalPutts: 33,
    penaltyStrokes: 1,
    eagles: 0,
    birdies: 1,
    pars: 6,
    bogeys: 8,
    doubleBogeys: 2,
    triplePlus: 1,
  };

  const benchmark = getInterpolatedBenchmark(input.handicapIndex);
  const sg = calculateStrokesGained(input, benchmark);
  const row = toRoundInsert(input, sg);
  const claim = await generateClaimToken();

  const { data, error } = await admin
    .from("rounds")
    .insert({
      ...row,
      user_id: null,
      claim_token_hash: claim.hash,
      claim_token_expires_at: claim.expiresAt,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create claimable round: ${error?.message ?? "missing row id"}`);
  }

  return {
    admin,
    roundId: data.id,
    claimToken: claim.rawToken,
  };
}

async function signInViaHistoryPrompt(page: Page) {
  await page.goto("/strokes-gained/history");
  const signInLink = page.getByTestId("auth-prompt-sign-in-link");
  const primaryCta = page.getByTestId("auth-prompt-sign-in");

  if (await signInLink.count()) {
    await expect(signInLink).toBeVisible();
    await signInLink.click();
  } else {
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();
  }

  await expect(page.getByTestId("auth-modal")).toBeVisible();

  const authTitle = page.getByTestId("auth-modal-title");
  if (await authTitle.textContent() !== "Welcome back") {
    await page.getByTestId("auth-toggle-mode").click();
    await expect(authTitle).toContainText("Welcome back");
  }

  await page.getByTestId("auth-email-input").fill(e2eEmail!);
  await page.getByTestId("auth-password-input").fill(e2ePassword!);
  await page.getByTestId("auth-submit-btn").click();

  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("auth-prompt-sign-in")).toHaveCount(0);
}

test.describe("OAuth claim handoff", () => {
  test("rehydrates pending OAuth claim and auto-claims it for a signed-in user", async ({
    page,
  }) => {
    skipUnlessConfigured();

    const { admin, roundId, claimToken } = await createClaimableRound();

    try {
      await signInViaHistoryPrompt(page);

      await page.evaluate(
        ({ pendingRoundId, pendingClaimToken }) => {
          localStorage.setItem(
            "pending-oauth-claim",
            JSON.stringify({
              roundId: pendingRoundId,
              claimToken: pendingClaimToken,
            })
          );
        },
        { pendingRoundId: roundId, pendingClaimToken: claimToken }
      );

      await page.goto("/strokes-gained");

      await expect(page.getByTestId("claim-success")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByRole("link", { name: /View your round history/i })
      ).toBeVisible();

      const pendingClaim = await page.evaluate(() =>
        localStorage.getItem("pending-oauth-claim")
      );
      expect(pendingClaim).toBeNull();

      const { data: claimedRound, error: roundError } = await admin
        .from("rounds")
        .select("user_id, claim_token_hash, claim_token_expires_at")
        .eq("id", roundId)
        .single();

      expect(roundError).toBeNull();
      expect(claimedRound?.user_id).toBeTruthy();
      expect(claimedRound?.claim_token_hash).toBeNull();
      expect(claimedRound?.claim_token_expires_at).toBeNull();
    } finally {
      await admin.from("rounds").delete().eq("id", roundId);
    }
  });
});
