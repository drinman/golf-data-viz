-- Phase 2: Total anchor, calibration, and reconciliation columns
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS calibration_version text,
  ADD COLUMN IF NOT EXISTS total_anchor_mode text,
  ADD COLUMN IF NOT EXISTS total_anchor_value numeric(5,2),
  ADD COLUMN IF NOT EXISTS reconciliation_scale_factor numeric(5,4),
  ADD COLUMN IF NOT EXISTS reconciliation_flags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.rounds
  ADD CONSTRAINT chk_total_anchor_mode
  CHECK (total_anchor_mode IS NULL OR total_anchor_mode IN ('course_adjusted', 'course_neutral'));

-- Shadow comparison table for shadow mode validation
CREATE TABLE IF NOT EXISTS public.sg_shadow_comparisons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  round_id uuid REFERENCES public.rounds(id),
  v1_total numeric(5,2),
  v3_total numeric(5,2),
  v1_categories jsonb,
  v3_categories jsonb,
  anchor_mode text,
  reconciliation_scale_factor numeric(5,4),
  calibration_version text,
  methodology_v1 text,
  methodology_v3 text
);
