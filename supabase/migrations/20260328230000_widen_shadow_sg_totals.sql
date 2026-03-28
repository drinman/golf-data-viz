-- Widen shadow comparison SG totals for consistency with rounds table.
-- rounds.sg_* are now unconstrained numeric; shadow totals were still NUMERIC(5,2).
ALTER TABLE sg_shadow_comparisons ALTER COLUMN v1_total SET DATA TYPE numeric USING v1_total::numeric;
ALTER TABLE sg_shadow_comparisons ALTER COLUMN v3_total SET DATA TYPE numeric USING v3_total::numeric;
NOTIFY pgrst, 'reload schema';
