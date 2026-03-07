-- Add methodology and benchmark tracking columns
ALTER TABLE public.rounds
  ADD COLUMN methodology_version text,
  ADD COLUMN benchmark_version text,
  ADD COLUMN benchmark_handicap numeric(5,2);

-- No NOT NULL or defaults — existing rows get NULL (pre-2.0 rounds).
-- App code writes explicitly on new inserts.
