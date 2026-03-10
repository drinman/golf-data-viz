-- Prevent duplicate round submissions.
-- Two rounds are considered identical when all five scorecard fields match
-- on the same date. The partial index (WHERE played_at IS NOT NULL) avoids
-- blocking rows without a date, which can't be meaningfully deduped.
CREATE UNIQUE INDEX IF NOT EXISTS rounds_dedup_idx
  ON rounds (course_name, played_at, score, handicap_index, total_putts)
  WHERE played_at IS NOT NULL;
