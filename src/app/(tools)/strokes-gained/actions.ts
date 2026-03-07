"use server";

import type { RoundInput } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { roundInputSchema } from "@/lib/golf/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseConfigError } from "@/lib/supabase/errors";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { captureMonitoringException } from "@/lib/monitoring/sentry";
import { assessRoundTrust } from "@/lib/golf/round-trust";
import { getRoundSaveAvailability } from "@/lib/round-save";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
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
  | { success: true }
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
    const sg = calculateStrokesGained(validatedInput, benchmark);
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

    let { error } = await supabase.from("rounds").insert(insertWithTrust);

    // Temporary backward-compatibility for production while the trust-field migration
    // is being applied. Once the schema catches up, the first insert path succeeds.
    if (isMissingTrustSchemaError(error)) {
      console.warn(
        "[saveRound] Retrying insert without trust metadata because the DB schema is behind app code"
      );
      ({ error } = await supabase.from("rounds").insert(baseInsert));
    }

    if (error) {
      console.error("[saveRound] Supabase error:", error.message);
      captureMonitoringException(new Error(error.message), {
        source: "saveRound",
        code: "DB_ERROR",
      });
      return fail("DB_ERROR", DB_ERROR_MESSAGE);
    }

    return { success: true };
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
