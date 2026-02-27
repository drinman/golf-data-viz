"use server";

import type { RoundInput, StrokesGainedResult } from "@/lib/golf/types";
import { toRoundInsert } from "@/lib/golf/round-mapper";
import { createClient } from "@/lib/supabase/server";

export type SaveRoundResult =
  | { success: true }
  | { success: false; error: string };

export async function saveRound(
  input: RoundInput,
  sg: StrokesGainedResult
): Promise<SaveRoundResult> {
  try {
    const supabase = await createClient();
    const row = toRoundInsert(input, sg);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("rounds")
      .insert({ ...row, user_id: user?.id ?? null });

    if (error) {
      console.error("[saveRound] Supabase error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[saveRound] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
