"use server";

import type { RoundInput } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { roundInputSchema } from "@/lib/golf/schemas";
import { createClient } from "@/lib/supabase/server";
import { SupabaseConfigError } from "@/lib/supabase/errors";
import { getBracketForHandicap } from "@/lib/golf/benchmarks";
import { calculateStrokesGained } from "@/lib/golf/strokes-gained";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export type SaveRoundResult =
  | { success: true }
  | { success: false; error: string };

export async function saveRound(
  input: RoundInput
): Promise<SaveRoundResult> {
  try {
    // Rate limiting: sliding window per IP
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return {
        success: false,
        error: "Too many requests. Please try again shortly.",
      };
    }

    // Server-side validation: reject tampered payloads before touching DB
    const parsed = roundInputSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((i) => i.message)
        .join("; ");
      console.error("[saveRound] Validation failed:", message);
      return { success: false, error: message };
    }

    // Recalculate SG server-side — never trust client-supplied values
    const bracket = getBracketForHandicap(parsed.data.handicapIndex);
    const sg = calculateStrokesGained(parsed.data as RoundInput, bracket);

    const supabase = await createClient();
    const row = toRoundInsert(parsed.data as RoundInput, sg);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("rounds")
      .insert({ ...row, user_id: user?.id ?? null });

    if (error) {
      console.error("[saveRound] Supabase error:", error.message);
      return { success: false, error: "Round could not be saved" };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      console.error("[saveRound] Supabase config error:", err.message);
      return { success: false, error: "save_unavailable" };
    }
    console.error("[saveRound] Unexpected error:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
