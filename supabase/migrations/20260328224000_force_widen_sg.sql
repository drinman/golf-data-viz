-- Force widen SG columns with explicit USING cast.
-- Previous attempts recorded as applied but PostgREST still sees (4,2).
ALTER TABLE rounds ALTER COLUMN sg_total            SET DATA TYPE numeric USING sg_total::numeric;
ALTER TABLE rounds ALTER COLUMN sg_off_the_tee      SET DATA TYPE numeric USING sg_off_the_tee::numeric;
ALTER TABLE rounds ALTER COLUMN sg_approach         SET DATA TYPE numeric USING sg_approach::numeric;
ALTER TABLE rounds ALTER COLUMN sg_around_the_green SET DATA TYPE numeric USING sg_around_the_green::numeric;
ALTER TABLE rounds ALTER COLUMN sg_putting          SET DATA TYPE numeric USING sg_putting::numeric;
-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
