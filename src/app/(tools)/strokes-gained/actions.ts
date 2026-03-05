"use server";

import type { RoundInput } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { roundInputSchema } from "@/lib/golf/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseConfigError } from "@/lib/supabase/errors";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { captureMonitoringException } from "@/lib/monitoring/sentry";
import { headers } from "next/headers";

export type SaveRoundErrorCode =
  | "RATE_LIMITED"
  | "SAVE_DISABLED"
  | "VALIDATION"
  | "DB_ERROR"
  | "UNEXPECTED";

export type SaveRoundResult =
  | { success: true }
  | { success: false; code: SaveRoundErrorCode; message: string };

const SAVE_DISABLED_MESSAGE =
  "Cloud save unavailable — your results are still shown below.";
const RATE_LIMITED_MESSAGE = "Too many requests. Please try again shortly.";
const DB_ERROR_MESSAGE = "Round could not be saved.";
const UNEXPECTED_MESSAGE = "An unexpected error occurred.";
const RATE_LIMIT_MONITOR_SAMPLE_RATE = 0.1;

function fail(code: SaveRoundErrorCode, message: string): SaveRoundResult {
  return { success: false, code, message };
}

function shouldSampleRateLimitedEvent(): boolean {
  return Math.random() < RATE_LIMIT_MONITOR_SAMPLE_RATE;
}

export async function saveRound(
  input: RoundInput
): Promise<SaveRoundResult> {
  try {
    if (process.env.ENABLE_ROUND_SAVE !== "true") {
      return fail("SAVE_DISABLED", SAVE_DISABLED_MESSAGE);
    }

    // Rate limiting: fixed window per IP
    const hdrs = await headers();
    const ip = extractClientIp(hdrs);
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

    // Recalculate SG server-side — never trust client-supplied values
    const bracket = getBracketForHandicap(parsed.data.handicapIndex);
    const sg = calculateStrokesGained(parsed.data as RoundInput, bracket);

    const supabase = createAdminClient();
    const row = toRoundInsert(parsed.data as RoundInput, sg);

    const { error } = await supabase
      .from("rounds")
      .insert({ ...row, user_id: null });

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
