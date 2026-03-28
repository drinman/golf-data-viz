-- Widen reconciliation_scale_factor from NUMERIC(5,4) to NUMERIC(7,4).
-- NUMERIC(5,4) has a max of 9.9999. Extreme inputs (54 HCP, slope 155,
-- rating 80, score 50) can produce scale factors exceeding 10x when the
-- reconciler redistributes a large total anchor across categories.
-- Also widen the shadow comparison table's copy of this column.
ALTER TABLE rounds ALTER COLUMN reconciliation_scale_factor TYPE numeric(7,4);
ALTER TABLE sg_shadow_comparisons ALTER COLUMN reconciliation_scale_factor TYPE numeric(7,4);
