-- Restrict anon reads to exclude claim-sensitive columns.
-- claim_token_hash and claim_token_expires_at are internal security fields
-- that should not be readable via the public REST API.
--
-- Approach: revoke table-level SELECT from anon, then re-grant per-column
-- for all columns except claim_token_hash and claim_token_expires_at.

REVOKE SELECT ON public.rounds FROM anon;

GRANT SELECT (
  id, user_id, created_at, played_at, course_name, score,
  handicap_index, course_rating, slope_rating,
  fairways_hit, fairway_attempts, greens_in_regulation,
  total_putts, penalty_strokes,
  eagles, birdies, pars, bogeys, double_bogeys, triple_plus,
  up_and_down_attempts, up_and_down_converted, sand_saves, sand_save_attempts,
  three_putts,
  sg_total, sg_off_the_tee, sg_approach, sg_around_the_green, sg_putting,
  benchmark_bracket, has_trouble_context,
  trouble_hole_count, trouble_tee_count, trouble_approach_count,
  trouble_around_green_count, trouble_putting_count, trouble_penalty_count,
  attribution_version,
  trust_status, trust_reasons, trust_scored_at,
  methodology_version, benchmark_version, benchmark_handicap,
  calibration_version, total_anchor_mode, total_anchor_value,
  reconciliation_scale_factor, reconciliation_flags,
  benchmark_interpolation_mode
) ON public.rounds TO anon;
