/**
 * Server-side queries for user round history.
 *
 * Fetches rounds from Supabase and maps DB rows to
 * domain-level RoundSgSnapshot and RoundDetailSnapshot objects.
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoundSgSnapshot } from "./trends";
import type { LessonReportData } from "./lesson-report";
import type { ConfidenceLevel, RoundDetailSnapshot, StrokesGainedCategory } from "./types";
import { deriveConfidence } from "./round-detail-adapter";

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
    .order("played_at", { ascending: false })
    .limit(200);

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

// Expanded column set for the detail page
const DETAIL_COLUMNS = `
  id, played_at, course_name, score, handicap_index,
  sg_total, sg_off_the_tee, sg_approach, sg_around_the_green, sg_putting,
  methodology_version, benchmark_bracket, benchmark_version,
  benchmark_handicap, benchmark_interpolation_mode,
  calibration_version, total_anchor_mode,
  confidence_off_the_tee, confidence_approach,
  confidence_around_the_green, confidence_putting,
  estimated_categories, skipped_categories,
  fairways_hit, fairway_attempts, greens_in_regulation,
  up_and_down_attempts, up_and_down_converted,
  eagles, birdies, pars, bogeys, double_bogeys, triple_plus,
  total_putts, penalty_strokes, course_rating, slope_rating
`.replace(/\s+/g, " ").trim();

function mapRowToDetailSnapshot(row: Record<string, unknown>): RoundDetailSnapshot {
  // Derive confidence if stored columns are null (pre-migration rounds)
  const storedConfidence = {
    offTheTee: row.confidence_off_the_tee as ConfidenceLevel | null,
    approach: row.confidence_approach as ConfidenceLevel | null,
    aroundTheGreen: row.confidence_around_the_green as ConfidenceLevel | null,
    putting: row.confidence_putting as ConfidenceLevel | null,
  };

  const rawInputs = {
    fairwaysHit: row.fairways_hit as number | null,
    fairwayAttempts: row.fairway_attempts as number | null,
    greensInRegulation: row.greens_in_regulation as number | null,
    upAndDownAttempts: row.up_and_down_attempts as number | null,
    upAndDownConverted: row.up_and_down_converted as number | null,
  };

  // If stored confidence is null, derive it
  const needsDerivation =
    storedConfidence.offTheTee == null ||
    storedConfidence.approach == null ||
    storedConfidence.aroundTheGreen == null ||
    storedConfidence.putting == null;

  const derived = needsDerivation ? deriveConfidence(rawInputs) : null;

  return {
    roundId: row.id as string,
    playedAt: row.played_at as string,
    courseName: row.course_name as string,
    score: row.score as number,
    handicapIndex: row.handicap_index as number,
    sgTotal: (row.sg_total as number | null) ?? 0,
    sgOffTheTee: (row.sg_off_the_tee as number | null) ?? 0,
    sgApproach: (row.sg_approach as number | null) ?? 0,
    sgAroundTheGreen: (row.sg_around_the_green as number | null) ?? 0,
    sgPutting: (row.sg_putting as number | null) ?? 0,
    methodologyVersion: row.methodology_version as string | null,
    benchmarkBracket: row.benchmark_bracket as string | null,
    benchmarkVersion: row.benchmark_version as string | null,
    benchmarkHandicap: row.benchmark_handicap as number | null,
    benchmarkInterpolationMode: row.benchmark_interpolation_mode as string | null,
    calibrationVersion: row.calibration_version as string | null,
    totalAnchorMode: row.total_anchor_mode as string | null,
    confidenceOffTheTee: storedConfidence.offTheTee ?? derived?.["off-the-tee"] ?? null,
    confidenceApproach: storedConfidence.approach ?? derived?.approach ?? null,
    confidenceAroundTheGreen: storedConfidence.aroundTheGreen ?? derived?.["around-the-green"] ?? null,
    confidencePutting: storedConfidence.putting ?? derived?.putting ?? null,
    estimatedCategories: (row.estimated_categories as StrokesGainedCategory[] | null) ?? [],
    skippedCategories: (row.skipped_categories as StrokesGainedCategory[] | null) ?? [],
    ...rawInputs,
    eagles: (row.eagles as number | null) ?? null,
    birdies: (row.birdies as number | null) ?? null,
    pars: (row.pars as number | null) ?? null,
    bogeys: (row.bogeys as number | null) ?? null,
    doubleBogeys: (row.double_bogeys as number | null) ?? null,
    triplePlus: (row.triple_plus as number | null) ?? null,
    totalPutts: (row.total_putts as number | null) ?? null,
    penaltyStrokes: (row.penalty_strokes as number | null) ?? null,
    courseRating: (row.course_rating as number | null) ?? null,
    slopeRating: (row.slope_rating as number | null) ?? null,
  };
}

export interface LessonReportSnapshot {
  id: string;
  userId: string;
  selectedRoundIds: string[];
  selectionHash: string;
  roundCount: number;
  reportVersion: string;
  generatedAt: string;
  regeneratedAt: string | null;
  reportData: LessonReportData;
}

function mapRowToLessonReportSnapshot(
  row: Record<string, unknown>
): LessonReportSnapshot {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    selectedRoundIds: (row.selected_round_ids as string[] | null) ?? [],
    selectionHash: row.selection_hash as string,
    roundCount: row.round_count as number,
    reportVersion: row.report_version as string,
    generatedAt: row.generated_at as string,
    regeneratedAt: (row.regenerated_at as string | null) ?? null,
    reportData: row.report_data as LessonReportData,
  };
}

/**
 * Fetch a single round with expanded detail for the detail page.
 * Uses the RLS-protected server client — user must own the round.
 * Wrapped with React cache() to deduplicate generateMetadata + page calls.
 */
export const getRoundDetail = cache(async function getRoundDetail(
  roundId: string,
  userId: string
): Promise<RoundDetailSnapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rounds")
    .select(DETAIL_COLUMNS)
    .eq("id", roundId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return mapRowToDetailSnapshot(data as unknown as Record<string, unknown>);
});

/**
 * Fetch a round by share token via the admin client (privileged path).
 * The token IS the authorization — no additional auth checks needed.
 * Server-side only.
 * Wrapped with React cache() to deduplicate generateMetadata + page calls.
 */
export const getRoundByShareToken = cache(async function getRoundByShareToken(
  token: string
): Promise<RoundDetailSnapshot | null> {
  const supabase = createAdminClient();

  // Look up the share token
  const { data: share, error: shareError } = await supabase
    .from("round_shares")
    .select("round_id")
    .eq("token", token)
    .single();

  if (shareError || !share) return null;

  // Fetch the round data via admin client (bypasses RLS)
  const { data, error } = await supabase
    .from("rounds")
    .select(DETAIL_COLUMNS)
    .eq("id", share.round_id)
    .single();

  if (error || !data) return null;

  return mapRowToDetailSnapshot(data as unknown as Record<string, unknown>);
});

/**
 * Fetch a set of owner-only round detail snapshots for lesson report generation.
 */
export async function getRoundsForLessonReport(
  userId: string,
  roundIds: string[]
): Promise<RoundDetailSnapshot[]> {
  if (roundIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rounds")
    .select(DETAIL_COLUMNS)
    .eq("user_id", userId)
    .in("id", roundIds)
    .order("played_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) =>
    mapRowToDetailSnapshot(row as unknown as Record<string, unknown>)
  );
}

export const getLessonReport = cache(async function getLessonReport(
  reportId: string,
  userId: string
): Promise<LessonReportSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_reports")
    .select(
      "id, user_id, selected_round_ids, selection_hash, round_count, report_version, generated_at, regenerated_at, report_data"
    )
    .eq("id", reportId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return mapRowToLessonReportSnapshot(data as unknown as Record<string, unknown>);
});

export async function getLessonReportBySelection(
  userId: string,
  selectionHash: string
): Promise<LessonReportSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_reports")
    .select(
      "id, user_id, selected_round_ids, selection_hash, round_count, report_version, generated_at, regenerated_at, report_data"
    )
    .eq("user_id", userId)
    .eq("selection_hash", selectionHash)
    .single();

  if (error || !data) return null;
  return mapRowToLessonReportSnapshot(data as unknown as Record<string, unknown>);
}

/**
 * Fetch a stored lesson report snapshot by explicit share token.
 * Uses the admin client because the token itself is the authorization.
 */
export const getLessonReportByShareToken = cache(async function getLessonReportByShareToken(
  token: string
): Promise<LessonReportSnapshot | null> {
  const supabase = createAdminClient();

  const { data: share, error: shareError } = await supabase
    .from("lesson_report_shares")
    .select("report_id")
    .eq("token", token)
    .single();

  if (shareError || !share) return null;

  const { data, error } = await supabase
    .from("lesson_reports")
    .select(
      "id, user_id, selected_round_ids, selection_hash, round_count, report_version, generated_at, regenerated_at, report_data"
    )
    .eq("id", share.report_id)
    .single();

  if (error || !data) return null;
  return mapRowToLessonReportSnapshot(data as unknown as Record<string, unknown>);
});
