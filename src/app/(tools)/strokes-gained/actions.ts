"use server";

import type { RoundInput } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { roundInputSchema } from "@/lib/golf/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SupabaseConfigError } from "@/lib/supabase/errors";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import { getSgPhase2Mode } from "@/lib/golf/phase2-mode";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { captureMonitoringException } from "@/lib/monitoring/sentry";
import { assessRoundTrust } from "@/lib/golf/round-trust";
import { getRoundSaveAvailability } from "@/lib/round-save";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import {
  validateTroubleContext,
  buildTroubleContextSummary,
  type RoundTroubleContext,
  type TroubleHoleInput,
} from "@/lib/golf/trouble-context";
import { generateClaimToken, hashClaimToken } from "@/lib/security/claim-token";
import { getUser } from "@/lib/supabase/auth";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";

export type SaveRoundErrorCode =
  | "RATE_LIMITED"
  | "SAVE_DISABLED"
  | "VERIFICATION_REQUIRED"
  | "VERIFICATION_FAILED"
  | "VALIDATION"
  | "DB_ERROR"
  | "DUPLICATE_ROUND"
  | "UNEXPECTED";

export type SaveRoundResult =
  | { success: true; roundId: string; claimToken: string; isOwned: boolean }
  | { success: false; code: SaveRoundErrorCode; message: string };

const SAVE_DISABLED_MESSAGE =
  "Cloud save unavailable — your results are still shown below.";
const RATE_LIMITED_MESSAGE = "Too many requests. Please try again shortly.";
const VERIFICATION_REQUIRED_MESSAGE =
  "Complete the bot check to save anonymously.";
const VERIFICATION_FAILED_MESSAGE = "Bot check failed. Please try again.";
const DB_ERROR_MESSAGE = "Round could not be saved.";
const UNEXPECTED_MESSAGE = "An unexpected error occurred.";
const RATE_LIMIT_MONITOR_SAMPLE_RATE = 0.1;

type SupabaseInsertError = {
  code?: string | null;
  message?: string | null;
};

type RoundWritePayload = ReturnType<typeof toRoundInsert> & {
  user_id: string | null;
  trust_status?: string;
  trust_reasons?: string[];
};

interface ExistingRoundRecord {
  id: string;
  user_id: string | null;
}

function fail(code: SaveRoundErrorCode, message: string): SaveRoundResult {
  return { success: false, code, message };
}

function shouldSampleRateLimitedEvent(): boolean {
  return Math.random() < RATE_LIMIT_MONITOR_SAMPLE_RATE;
}

function isMissingTrustSchemaError(error: SupabaseInsertError | null): boolean {
  return (
    error?.code === "PGRST204" &&
    /trust_(status|reasons|scored_at)/.test(error.message ?? "")
  );
}

function isMissingPhase2SchemaError(error: SupabaseInsertError | null): boolean {
  return (
    error?.code === "PGRST204" &&
    /(calibration_version|total_anchor_mode|total_anchor_value|reconciliation_scale_factor|reconciliation_flags)/.test(
      error.message ?? ""
    )
  );
}

function stripPhase2Fields(payload: RoundWritePayload): RoundWritePayload {
  const sanitized = { ...payload };

  delete sanitized.calibration_version;
  delete sanitized.total_anchor_mode;
  delete sanitized.total_anchor_value;
  delete sanitized.reconciliation_scale_factor;
  delete sanitized.reconciliation_flags;

  return sanitized;
}

async function findExistingRound(
  supabase: ReturnType<typeof createAdminClient>,
  row: ReturnType<typeof toRoundInsert>
): Promise<ExistingRoundRecord | null> {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, user_id")
    .eq("course_name", row.course_name)
    .eq("played_at", row.played_at)
    .eq("score", row.score)
    .eq("handicap_index", row.handicap_index)
    .eq("total_putts", row.total_putts)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ExistingRoundRecord;
}

async function updateOwnedRound(
  supabase: ReturnType<typeof createAdminClient>,
  roundId: string,
  userId: string,
  payload: RoundWritePayload
): Promise<boolean> {
  const { data, error } = await supabase
    .from("rounds")
    .update(payload)
    .eq("id", roundId)
    .eq("user_id", userId)
    .select("id");

  return !error && Boolean(data?.length);
}

function revalidateRoundRoutes(roundId: string, isOwned: boolean): void {
  revalidatePath(`/strokes-gained/rounds/${roundId}`);

  if (!isOwned) {
    return;
  }

  revalidatePath("/strokes-gained/history");
  revalidatePath("/strokes-gained/lesson-prep");
}

export type { SgPhase2Mode } from "@/lib/golf/phase2-mode";
export { getSgPhase2Mode };

export async function saveRound(
  input: RoundInput,
  verification: { turnstileToken: string | null }
): Promise<SaveRoundResult> {
  try {
    if (!getRoundSaveAvailability().enabled) {
      return fail("SAVE_DISABLED", SAVE_DISABLED_MESSAGE);
    }

    const token = verification.turnstileToken?.trim() ?? "";
    if (!token) {
      return fail("VERIFICATION_REQUIRED", VERIFICATION_REQUIRED_MESSAGE);
    }

    // Rate limiting: fixed window per IP
    const hdrs = await headers();
    const ip = extractClientIp(hdrs);
    const hostHeader = hdrs.get("host");
    const rateLimitDecision = await checkRateLimit(ip);
    if (!rateLimitDecision.allowed) {
      console.warn("[saveRound] Rate limited request", {
        reason: rateLimitDecision.reason ?? "minute",
      });
      if (shouldSampleRateLimitedEvent()) {
        captureMonitoringException(new Error("Save round rate limited"), {
          source: "saveRound",
          code: "RATE_LIMITED",
          reason: rateLimitDecision.reason ?? "minute",
        });
      }
      return fail("RATE_LIMITED", RATE_LIMITED_MESSAGE);
    }

    // Server-side validation: reject tampered payloads before touching DB
    const parsed = roundInputSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      console.error("[saveRound] Validation failed:", message);
      return fail("VALIDATION", message);
    }

    const turnstileResult = await verifyTurnstileToken({
      token,
      remoteIp: ip,
      expectedHostname: hostHeader,
    });

    if (!turnstileResult.ok) {
      console.warn("[saveRound] Turnstile verification failed", {
        reason: turnstileResult.reason,
        errorCodes: turnstileResult.result.errorCodes,
      });
      return fail("VERIFICATION_FAILED", VERIFICATION_FAILED_MESSAGE);
    }

    // Recalculate SG server-side — never trust client-supplied values
    const validatedInput = parsed.data as RoundInput;
    const benchmark = getInterpolatedBenchmark(validatedInput.handicapIndex);
    const phase2Mode = getSgPhase2Mode();

    const sgV1 = calculateStrokesGained(validatedInput, benchmark);
    const sg = phase2Mode === "full"
      ? calculateStrokesGainedV3(validatedInput, benchmark)
      : sgV1;
    const trust = assessRoundTrust(validatedInput);

    const supabase = createAdminClient();
    const row = toRoundInsert(validatedInput, sg);
    const user = await getUser();
    const baseInsert = {
      ...row,
      user_id: user?.id ?? null,
    };
    const insertWithTrust = {
      ...baseInsert,
      trust_status: trust.status,
      trust_reasons: trust.reasons,
    };
    let persistedPayload: RoundWritePayload = insertWithTrust;

    let { error, data: insertedRows } = await supabase
      .from("rounds")
      .insert(persistedPayload)
      .select("id");

    // Backward-compat: retry without trust columns if schema is behind
    if (isMissingTrustSchemaError(error)) {
      console.warn(
        "[saveRound] Retrying insert without trust metadata because the DB schema is behind app code"
      );
      persistedPayload = baseInsert;
      ({ error, data: insertedRows } = await supabase
        .from("rounds")
        .insert(persistedPayload)
        .select("id"));
    }

    // Backward-compat: retry without Phase 2 columns if schema is behind
    if (isMissingPhase2SchemaError(error)) {
      console.warn(
        "[saveRound] Retrying insert without Phase 2 columns because the DB schema is behind app code"
      );
      persistedPayload = stripPhase2Fields(persistedPayload);
      ({ error, data: insertedRows } = await supabase
        .from("rounds")
        .insert(persistedPayload)
        .select("id"));
    }

    if (error) {
      // Unique constraint violation — the round was already saved (dedup)
      if (error.code === "23505") {
        console.warn("[saveRound] Duplicate round detected:", error.message);

        // If the user is authenticated, update or claim the existing row in place.
        if (user) {
          const existing = await findExistingRound(supabase, row);

          if (existing) {
            if (existing.user_id === user.id) {
              const updated = await updateOwnedRound(
                supabase,
                existing.id,
                user.id,
                persistedPayload
              );

              if (updated) {
                revalidateRoundRoutes(existing.id, true);
                return { success: true, roundId: existing.id, claimToken: "", isOwned: true };
              }

              console.warn("[saveRound] Failed to update existing owned round");
            }
            if (existing.user_id === null) {
              // Anonymous row — atomically claim it and persist the latest values.
              const { data: claimedRows, error: claimError } = await supabase
                .from("rounds")
                .update({
                  ...persistedPayload,
                  user_id: user.id,
                })
                .eq("id", existing.id)
                .is("user_id", null)
                .select("id");

              if (!claimError && claimedRows && claimedRows.length > 0) {
                revalidateRoundRoutes(existing.id, true);
                return { success: true, roundId: existing.id, claimToken: "", isOwned: true };
              }
              // Re-read: a concurrent request from the same user may have claimed it
              const { data: recheck } = await supabase
                .from("rounds")
                .select("user_id")
                .eq("id", existing.id)
                .single();
              if (recheck?.user_id === user.id) {
                const updated = await updateOwnedRound(
                  supabase,
                  existing.id,
                  user.id,
                  persistedPayload
                );

                if (updated) {
                  revalidateRoundRoutes(existing.id, true);
                  return { success: true, roundId: existing.id, claimToken: "", isOwned: true };
                }
              }
              console.warn("[saveRound] Failed to claim duplicate round:", claimError?.message ?? "concurrent claim won");
            }
          }
        }

        return fail("DUPLICATE_ROUND", "This round was already saved.");
      }
      console.error("[saveRound] Supabase error:", error.message);
      captureMonitoringException(new Error(error.message), {
        source: "saveRound",
        code: "DB_ERROR",
      });
      return fail("DB_ERROR", DB_ERROR_MESSAGE);
    }

    const roundId = insertedRows?.[0]?.id;
    if (!roundId) {
      console.error("[saveRound] Insert succeeded but no round ID returned");
      captureMonitoringException(new Error("Insert succeeded but no round ID returned"), {
        source: "saveRound",
        code: "DB_ERROR",
      });
      return fail("DB_ERROR", DB_ERROR_MESSAGE);
    }

    // Shadow mode: compute V3, persist comparison record, log delta
    if (phase2Mode === "shadow") {
      try {
        const sgV3 = calculateStrokesGainedV3(validatedInput, benchmark);
        await supabase.from("sg_shadow_comparisons").insert({
          round_id: roundId,
          v1_total: sgV1.total,
          v3_total: sgV3.total,
          v1_categories: sgV1.categories,
          v3_categories: sgV3.categories,
          anchor_mode: sgV3.totalAnchorMode ?? null,
          reconciliation_scale_factor: sgV3.reconciliationScaleFactor ?? null,
          calibration_version: sgV3.calibrationVersion ?? null,
          methodology_v1: sgV1.methodologyVersion,
          methodology_v3: sgV3.methodologyVersion,
        });
        console.log("[saveRound] Shadow comparison", {
          v1Total: sgV1.total.toFixed(2),
          v3Total: sgV3.total.toFixed(2),
          delta: (sgV3.total - sgV1.total).toFixed(2),
          anchorMode: sgV3.totalAnchorMode,
          scaleFactor: sgV3.reconciliationScaleFactor?.toFixed(4),
        });
      } catch (shadowErr) {
        // Shadow mode is best-effort — never block the save
        console.warn("[saveRound] Shadow comparison failed:", shadowErr);
      }
    }

    // Generate claim token for anonymous round claiming (best-effort).
    // Only needed for anonymous saves — authenticated users already have user_id set.
    let claimToken = "";
    if (!baseInsert.user_id) {
      try {
        const claim = await generateClaimToken();
        claimToken = claim.rawToken;

        await supabase
          .from("rounds")
          .update({
            claim_token_hash: claim.hash,
            claim_token_expires_at: claim.expiresAt,
          })
          .eq("id", roundId);
      } catch (claimErr) {
        // Claim token is best-effort — never block the save
        console.warn("[saveRound] Claim token generation failed:", claimErr);
      }
    }

    revalidateRoundRoutes(roundId, !!user);

    return { success: true, roundId, claimToken, isOwned: !!user };
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      console.error("[saveRound] Supabase config error:", err.message);
      captureMonitoringException(err, {
        source: "saveRound",
        code: "SAVE_DISABLED",
      });
      return fail("SAVE_DISABLED", SAVE_DISABLED_MESSAGE);
    }
    console.error("[saveRound] Unexpected error:", err);
    captureMonitoringException(err, {
      source: "saveRound",
      code: "UNEXPECTED",
    });
    return fail("UNEXPECTED", UNEXPECTED_MESSAGE);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isMissingTroubleSchemaError(error: SupabaseInsertError | null): boolean {
  return (
    error?.code === "PGRST204" &&
    /trouble_|has_trouble_context|attribution_version/.test(error.message ?? "")
  );
}

/**
 * Verify the caller owns a round, either via claim token (anonymous rounds)
 * or authenticated user_id match (claimed rounds).
 */
async function verifyRoundOwnership(
  roundId: string,
  claimToken: string | null
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: round } = await supabase
    .from("rounds")
    .select("user_id, claim_token_hash, claim_token_expires_at")
    .eq("id", roundId)
    .single();

  if (!round) return false;

  // Claimed round: verify authenticated user matches owner
  if (round.user_id) {
    const user = await getUser();
    return user?.id === round.user_id;
  }

  // Anonymous round: verify claim token + expiry
  if (!claimToken || !round.claim_token_hash) return false;
  if (round.claim_token_expires_at && new Date(round.claim_token_expires_at) < new Date()) {
    return false;
  }
  const providedHash = await hashClaimToken(claimToken);
  return timingSafeEqual(
    Buffer.from(providedHash),
    Buffer.from(round.claim_token_hash)
  );
}

/**
 * Save trouble context annotations for a round.
 * Idempotent: deletes existing annotations and replaces them.
 * Best-effort — never blocks the UX. Writes via service-role (bypasses RLS).
 *
 * Requires proof of ownership: claim token for anonymous rounds,
 * or authenticated user match for claimed rounds.
 *
 * Note: Saved trouble context is for analytics and future modeling only.
 * V1 does NOT rehydrate trouble context from DB on shared-link visits.
 */
export async function saveTroubleContext(
  roundId: string,
  context: RoundTroubleContext,
  claimToken: string | null = null
): Promise<{ success: boolean }> {
  try {
    if (!UUID_RE.test(roundId)) {
      console.warn("[saveTroubleContext] Invalid roundId format");
      return { success: false };
    }

    const validation = validateTroubleContext(context);
    if (!validation.valid) {
      console.warn("[saveTroubleContext] Validation failed:", validation.errors);
      return { success: false };
    }

    if (!(await verifyRoundOwnership(roundId, claimToken))) {
      console.warn("[saveTroubleContext] Ownership verification failed");
      return { success: false };
    }

    const supabase = createAdminClient();

    // Delete existing trouble holes (idempotent replace)
    await supabase
      .from("round_trouble_holes")
      .delete()
      .eq("round_id", roundId);

    // Insert new trouble holes
    if (context.troubleHoles.length > 0) {
      const rows = context.troubleHoles.map((hole: TroubleHoleInput) => ({
        round_id: roundId,
        hole_number: hole.holeNumber,
        primary_cause: hole.primaryCause,
      }));

      const { error: insertError } = await supabase
        .from("round_trouble_holes")
        .insert(rows);

      // Swallow if trouble schema doesn't exist yet
      if (insertError && !isMissingTroubleSchemaError(insertError)) {
        console.error("[saveTroubleContext] Insert error:", insertError.message);
        captureMonitoringException(new Error(insertError.message), {
          source: "saveTroubleContext",
        });
        return { success: false };
      }
    }

    // Update rounds summary columns
    const summary = buildTroubleContextSummary(context.troubleHoles);
    const { error: updateError } = await supabase
      .from("rounds")
      .update({
        has_trouble_context: true,
        trouble_hole_count: context.troubleHoles.length,
        trouble_tee_count: summary.tee,
        trouble_approach_count: summary.approach,
        trouble_around_green_count: summary.around_green,
        trouble_putting_count: summary.putting,
        trouble_penalty_count: summary.penalty,
        attribution_version: "narrative-v1",
      })
      .eq("id", roundId);

    // Swallow if trouble columns don't exist yet
    if (updateError && !isMissingTroubleSchemaError(updateError)) {
      console.error("[saveTroubleContext] Update error:", updateError.message);
      captureMonitoringException(new Error(updateError.message), {
        source: "saveTroubleContext",
      });
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("[saveTroubleContext] Unexpected error:", err);
    captureMonitoringException(err, { source: "saveTroubleContext" });
    return { success: false };
  }
}

/**
 * Remove trouble context annotations from a round.
 * Best-effort — never blocks the UX.
 *
 * Requires proof of ownership: claim token for anonymous rounds,
 * or authenticated user match for claimed rounds.
 */
export async function clearTroubleContext(
  roundId: string,
  claimToken: string | null = null
): Promise<{ success: boolean }> {
  try {
    if (!UUID_RE.test(roundId)) {
      return { success: false };
    }

    if (!(await verifyRoundOwnership(roundId, claimToken))) {
      console.warn("[clearTroubleContext] Ownership verification failed");
      return { success: false };
    }

    const supabase = createAdminClient();

    await supabase
      .from("round_trouble_holes")
      .delete()
      .eq("round_id", roundId);

    const { error } = await supabase
      .from("rounds")
      .update({
        has_trouble_context: false,
        trouble_hole_count: 0,
        trouble_tee_count: 0,
        trouble_approach_count: 0,
        trouble_around_green_count: 0,
        trouble_putting_count: 0,
        trouble_penalty_count: 0,
        attribution_version: null,
      })
      .eq("id", roundId);

    if (error && !isMissingTroubleSchemaError(error)) {
      console.error("[clearTroubleContext] Update error:", error.message);
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("[clearTroubleContext] Unexpected error:", err);
    captureMonitoringException(err, { source: "clearTroubleContext" });
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Share token creation
// ---------------------------------------------------------------------------

export type CreateShareTokenResult =
  | { success: true; token: string; shareUrl: string; created: boolean }
  | { success: false; message: string };

/**
 * Create a share token for a saved round.
 * Idempotent: returns existing token if the round is already shared.
 * Only the round owner can create a share token.
 */
export async function createShareToken(
  roundId: string
): Promise<CreateShareTokenResult> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, message: "Sign in to share rounds." };
    }

    if (!UUID_RE.test(roundId)) {
      return { success: false, message: "Invalid round ID." };
    }

    const supabase = await createClient();

    // Check if share already exists (idempotent)
    const { data: existing } = await supabase
      .from("round_shares")
      .select("token")
      .eq("round_id", roundId)
      .single();

    if (existing?.token) {
      const shareUrl = buildShareUrl(existing.token);
      return { success: true, token: existing.token, shareUrl, created: false };
    }

    // Verify ownership: round must belong to this user
    const { data: round } = await supabase
      .from("rounds")
      .select("id")
      .eq("id", roundId)
      .eq("user_id", user.id)
      .single();

    if (!round) {
      return { success: false, message: "Round not found." };
    }

    // Create share token
    const token = crypto.randomUUID();
    const { error } = await supabase.from("round_shares").insert({
      round_id: roundId,
      owner_id: user.id,
      token,
    });

    if (error) {
      console.error("[createShareToken] Insert error:", error.message);
      captureMonitoringException(new Error(error.message), {
        source: "createShareToken",
      });
      return { success: false, message: "Could not create share link." };
    }

    const shareUrl = buildShareUrl(token);
    return { success: true, token, shareUrl, created: true };
  } catch (err) {
    console.error("[createShareToken] Unexpected error:", err);
    captureMonitoringException(err, { source: "createShareToken" });
    return { success: false, message: "An unexpected error occurred." };
  }
}

function buildShareUrl(token: string): string {
  return `${getSiteUrl()}/strokes-gained/shared/round/${token}`;
}

// ---------------------------------------------------------------------------
// Round claiming
// ---------------------------------------------------------------------------

export type ClaimFailureReason =
  | "unauthenticated"
  | "round_not_found"
  | "already_claimed"
  | "token_mismatch"
  | "token_expired";

export type ClaimRoundResult =
  | { success: true; claimedRoundId: string }
  | { success: false; code: ClaimFailureReason; message: string };

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

export async function claimRound(
  roundId: string,
  claimToken: string
): Promise<ClaimRoundResult> {
  // 1. Verify authentication
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      code: "unauthenticated",
      message: "Please sign in to claim this round.",
    };
  }

  // 2. Validate roundId format
  if (!UUID_RE.test(roundId)) {
    return {
      success: false,
      code: "round_not_found",
      message: "Invalid round ID.",
    };
  }

  try {
    const supabase = createAdminClient();

    // 3. Fetch round with claim metadata
    const { data: rows, error: fetchError } = await supabase
      .from("rounds")
      .select("id, user_id, claim_token_hash, claim_token_expires_at")
      .eq("id", roundId);

    if (fetchError || !rows || rows.length === 0) {
      return {
        success: false,
        code: "round_not_found",
        message: "Round not found.",
      };
    }

    const round = rows[0];

    // 4. Check already claimed
    if (round.user_id !== null) {
      return {
        success: false,
        code: "already_claimed",
        message: "This round has already been claimed.",
      };
    }

    // 5. Check expiry
    if (
      !round.claim_token_expires_at ||
      new Date(round.claim_token_expires_at).getTime() < Date.now()
    ) {
      return {
        success: false,
        code: "token_expired",
        message: "Claim token has expired.",
      };
    }

    // 6. Hash provided token and compare with stored hash
    const providedHash = await hashClaimToken(claimToken);

    if (
      !round.claim_token_hash ||
      !constantTimeCompare(providedHash, round.claim_token_hash)
    ) {
      return {
        success: false,
        code: "token_mismatch",
        message: "Invalid claim token.",
      };
    }

    // 7. Atomic claim: UPDATE with WHERE guards to prevent TOCTOU race.
    //    Only claims if user_id is still NULL and token hash still matches.
    const { data: updatedRows, error: updateError } = await supabase
      .from("rounds")
      .update({
        user_id: user.id,
        claim_token_hash: null,
        claim_token_expires_at: null,
      })
      .eq("id", roundId)
      .is("user_id", null)
      .eq("claim_token_hash", round.claim_token_hash)
      .select("id");

    if (updateError) {
      console.error("[claimRound] Update error:", updateError.message);
      captureMonitoringException(new Error(updateError.message), {
        source: "claimRound",
      });
      return {
        success: false,
        code: "round_not_found",
        message: "Failed to claim round.",
      };
    }

    // If no rows were updated, a concurrent claim won the race
    if (!updatedRows || updatedRows.length === 0) {
      return {
        success: false,
        code: "already_claimed",
        message: "This round was claimed by another request.",
      };
    }

    return { success: true, claimedRoundId: roundId };
  } catch (err) {
    console.error("[claimRound] Unexpected error:", err);
    captureMonitoringException(err, { source: "claimRound" });
    return {
      success: false,
      code: "round_not_found",
      message: "An unexpected error occurred.",
    };
  }
}
