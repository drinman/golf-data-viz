-- Fix: V3 returns 'extrapolated' for plus-handicap rounds but the constraint
-- doesn't allow it, causing DB_ERROR on save.
-- Fixes JAVASCRIPT-NEXTJS-H
ALTER TABLE rounds DROP CONSTRAINT chk_benchmark_interpolation_mode;
ALTER TABLE rounds ADD CONSTRAINT chk_benchmark_interpolation_mode
  CHECK (benchmark_interpolation_mode IN (
    'standard', 'scratch_clamped', 'elite_interpolated', 'elite_clamped', 'extrapolated'
  ));
