import type { RoundInput, StrokesGainedResult } from "./types";
import type { TablesInsert } from "@/lib/supabase/database.types";

type RoundInsert = Omit<TablesInsert<"rounds">, "id" | "created_at" | "user_id">;

export function toRoundInsert(
  input: RoundInput,
  sg: StrokesGainedResult
): RoundInsert {
  return {
    // Renamed fields
    course_name: input.course,
    played_at: input.date,

    // camelCase → snake_case
    score: input.score,
    handicap_index: input.handicapIndex,
    course_rating: input.courseRating,
    slope_rating: input.slopeRating,
    fairways_hit: input.fairwaysHit,
    fairway_attempts: input.fairwayAttempts,
    greens_in_regulation: input.greensInRegulation,
    total_putts: input.totalPutts,
    penalty_strokes: input.penaltyStrokes,
    eagles: input.eagles,
    birdies: input.birdies,
    pars: input.pars,
    bogeys: input.bogeys,
    double_bogeys: input.doubleBogeys,
    triple_plus: input.triplePlus,

    // Optional fields: undefined → null
    up_and_down_attempts: input.upAndDownAttempts ?? null,
    up_and_down_converted: input.upAndDownConverted ?? null,
    sand_save_attempts: input.sandSaveAttempts ?? null,
    sand_saves: input.sandSaves ?? null,
    three_putts: input.threePutts ?? null,

    // Calculated SG values
    sg_total: sg.total,
    sg_off_the_tee: sg.categories["off-the-tee"],
    sg_approach: sg.categories["approach"],
    sg_around_the_green: sg.categories["around-the-green"],
    sg_putting: sg.categories["putting"],
    benchmark_bracket: sg.benchmarkBracket,
  };
}
