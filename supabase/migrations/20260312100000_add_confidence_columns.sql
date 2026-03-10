-- Stamp-forward confidence metadata on rounds.
-- New rounds will have these populated at save time.
-- Pre-migration rounds derive confidence at read time via deriveConfidence().

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS confidence_off_the_tee text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS confidence_approach text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS confidence_around_the_green text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS confidence_putting text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS estimated_categories text[] DEFAULT '{}';
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS skipped_categories text[] DEFAULT '{}';
