"use server";

import type { RoundInput } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { roundInputSchema } from "@/lib/golf/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { headers } from "next/headers";

export type SaveRoundErrorCode =
  | "RATE_LIMITED"
  | "SAVE_DISABLED"
  | "VERIFICATION_REQUIRED"
  | "VERIFICATION_FAILED"
  | "VALIDATION"
  | "DB_ERROR"
  | "UNEXPECTED";

export type SaveRoundResult =
  | { success: true; roundId: string }
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
    const baseInsert = {
      ...row,
      user_id: null,
    };
    const insertWithTrust = {
      ...baseInsert,
      trust_status: trust.status,
      trust_reasons: trust.reasons,
    };

    let { error, data: insertedRows } = await supabase
      .from("rounds")
      .insert(insertWithTrust)
      .select("id");

    // Backward-compat: retry without trust columns if schema is behind
    if (isMissingTrustSchemaError(error)) {
      console.warn(
        "[saveRound] Retrying insert without trust metadata because the DB schema is behind app code"
      );
      ({ error, data: insertedRows } = await supabase
        .from("rounds")
        .insert(baseInsert)
        .select("id"));
    }

    // Backward-compat: retry without Phase 2 columns if schema is behind
    if (isMissingPhase2SchemaError(error)) {
      console.warn(
        "[saveRound] Retrying insert without Phase 2 columns because the DB schema is behind app code"
      );
      const {
        calibration_version: _cv,
        total_anchor_mode: _tam,
        total_anchor_value: _tav,
        reconciliation_scale_factor: _rsf,
        reconciliation_flags: _rf,
        ...baseWithoutPhase2
      } = insertWithTrust;
      ({ error, data: insertedRows } = await supabase
        .from("rounds")
        .insert(baseWithoutPhase2)
        .select("id"));
    }

    if (error) {
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

    return { success: true, roundId };
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
 * Save trouble context annotations for a round.
 * Idempotent: deletes existing annotations and replaces them.
 * Best-effort — never blocks the UX. Writes via service-role (bypasses RLS).
 *
 * Note: Saved trouble context is for analytics and future modeling only.
 * V1 does NOT rehydrate trouble context from DB on shared-link visits.
 */
export async function saveTroubleContext(
  roundId: string,
  context: RoundTroubleContext
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
 */
export async function clearTroubleContext(
  roundId: string
): Promise<{ success: boolean }> {
  try {
    if (!UUID_RE.test(roundId)) {
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
