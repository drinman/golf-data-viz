import { test, expect } from "@playwright/test";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Supabase seeding — same pattern as oauth-claim-handoff.spec.ts
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canSeed = !!(supabaseUrl && serviceRoleKey);

const ROUND_ID = randomUUID();
const SHARE_TOKEN = randomUUID();
let OWNER_ID: string;

/**
 * These tests seed data into Supabase and require the dev server to connect
 * to the same instance. They run in CI (where env vars are aligned) and
 * locally only if `.env.local` matches the test runner's env.
 */
test.describe("Shared round share button", () => {
  test.skip(!canSeed, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  test.beforeAll(async () => {
    if (!canSeed) return;
    const supabase = createSupabaseClient(supabaseUrl!, serviceRoleKey!);

    // Create a test auth user (required for FK constraint on rounds.user_id)
    const testEmail = `e2e-share-${Date.now()}@test.local`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: randomUUID(),
      email_confirm: true,
    });
    if (authErr || !authData.user) throw new Error(`Create test user failed: ${authErr?.message}`);
    OWNER_ID = authData.user.id;

    // Seed a round — all NOT NULL columns from the schema
    const { error: roundErr } = await supabase.from("rounds").insert({
      id: ROUND_ID,
      user_id: OWNER_ID,
      played_at: "2026-03-28",
      course_name: "E2E Share Test Course",
      score: 87,
      handicap_index: 14.3,
      course_rating: 72.0,
      slope_rating: 130,
      fairways_hit: 7,
      fairway_attempts: 14,
      greens_in_regulation: 6,
      total_putts: 33,
      penalty_strokes: 2,
      eagles: 0,
      birdies: 1,
      pars: 7,
      bogeys: 7,
      double_bogeys: 2,
      triple_plus: 1,
      sg_total: -1.5,
      sg_off_the_tee: -0.5,
      sg_approach: 0.2,
      sg_around_the_green: -0.8,
      sg_putting: -0.4,
      methodology_version: "3.0.0",
      benchmark_bracket: "10-15",
      benchmark_version: "1.0.0",
      benchmark_handicap: 14.3,
      total_anchor_value: 87,
    });
    if (roundErr) throw new Error(`Seed round failed: ${roundErr.message}`);

    // Seed a share token pointing to that round
    const { error: shareErr } = await supabase.from("round_shares").insert({
      id: randomUUID(),
      round_id: ROUND_ID,
      owner_id: OWNER_ID,
      token: SHARE_TOKEN,
    });
    if (shareErr) throw new Error(`Seed share token failed: ${shareErr.message}`);
  });

  test.afterAll(async () => {
    if (!canSeed) return;
    const supabase = createSupabaseClient(supabaseUrl!, serviceRoleKey!);
    // Delete in FK order
    await supabase.from("round_shares").delete().eq("round_id", ROUND_ID);
    await supabase.from("rounds").delete().eq("id", ROUND_ID);
    if (OWNER_ID) await supabase.auth.admin.deleteUser(OWNER_ID);
  });

  test("share button exists with correct text and testid", async ({ page }) => {
    await page.goto(`/strokes-gained/shared/round/${SHARE_TOKEN}`);
    await expect(page.getByText("E2E Share Test Course")).toBeVisible({ timeout: 10000 });

    const shareBtn = page.getByTestId("share-image");
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toContainText("Share");
    await expect(shareBtn).toBeEnabled();
  });

  test("share button triggers native share or download fallback", async ({ page }) => {
    // Stub navigator.canShare/share — same pattern as share-buttons.spec.ts
    await page.addInitScript(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (window as any).__shareData = null;
      Object.defineProperty(navigator, "canShare", {
        value: () => true,
        writable: true,
      });
      Object.defineProperty(navigator, "share", {
        value: async (data: any) => {
          (window as any).__shareData = data;
        },
        writable: true,
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    await page.goto(`/strokes-gained/shared/round/${SHARE_TOKEN}`);
    await expect(page.getByText("E2E Share Test Course")).toBeVisible({ timeout: 10000 });

    await page.click('[data-testid="share-image"]');

    // Wait for share to complete
    await page.waitForFunction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).__shareData !== null,
      null,
      { timeout: 10000 }
    );

    const shareData = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (window as any).__shareData;
      if (!data?.files?.[0]) return null;
      return {
        fileCount: data.files.length,
        fileName: data.files[0].name,
        fileType: data.files[0].type,
      };
    });

    expect(shareData).not.toBeNull();
    expect(shareData!.fileCount).toBe(1);
    expect(shareData!.fileType).toBe("image/png");
    expect(shareData!.fileName).toContain("e2e-share-test-course");
  });

  test("share button shows Preparing... while capturing", async ({ page }) => {
    await page.goto(`/strokes-gained/shared/round/${SHARE_TOKEN}`);
    await expect(page.getByText("E2E Share Test Course")).toBeVisible({ timeout: 10000 });

    const shareBtn = page.getByTestId("share-image");
    await expect(shareBtn).toContainText("Share");

    // Click — button should flip to loading state
    const downloadPromise = page.waitForEvent("download");
    await shareBtn.click();
    await expect(shareBtn).toContainText("Preparing...");
    await expect(shareBtn).toBeDisabled();

    // After download completes (fallback in headless), button resets
    await downloadPromise;
    await expect(shareBtn).toContainText("Share", { timeout: 5000 });
    await expect(shareBtn).toBeEnabled();
  });
});
