/**
 * Server-side queries for user round history.
 *
 * Fetches rounds from Supabase and maps DB rows to
 * domain-level RoundSgSnapshot objects.
 */

import { createClient } from "@/lib/supabase/server";
import type { RoundSgSnapshot } from "./trends";

/**
 * Fetch all rounds for a given user, ordered by most recent first.
 *
 * Null SG values (rounds saved before SG calculation was added) default to 0.
 */
export async function getUserRounds(
  userId: string
): Promise<RoundSgSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rounds")
    .select(
      "id, played_at, course_name, score, handicap_index, sg_total, sg_off_the_tee, sg_approach, sg_around_the_green, sg_putting, methodology_version, benchmark_bracket"
    )
    .eq("user_id", userId)
    .order("played_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    roundId: row.id,
    playedAt: row.played_at,
    courseName: row.course_name,
    score: row.score,
    handicapIndex: row.handicap_index,
    sgTotal: row.sg_total ?? 0,
    sgOffTheTee: row.sg_off_the_tee ?? 0,
    sgApproach: row.sg_approach ?? 0,
    sgAroundTheGreen: row.sg_around_the_green ?? 0,
    sgPutting: row.sg_putting ?? 0,
    methodologyVersion: row.methodology_version,
    benchmarkBracket: row.benchmark_bracket,
  }));
}
