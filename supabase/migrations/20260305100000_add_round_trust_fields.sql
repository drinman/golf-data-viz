-- Add trust-scoring metadata columns for write-time round quality classification.
-- pending is retained as a safety fallback for non-app direct inserts.

ALTER TABLE public.rounds
  ADD COLUMN trust_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN trust_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN trust_scored_at timestamptz;

ALTER TABLE public.rounds
  ADD CONSTRAINT chk_trust_status
  CHECK (trust_status IN ('pending', 'trusted', 'quarantined'));

CREATE INDEX IF NOT EXISTS idx_rounds_trust_status_created_at
  ON public.rounds (trust_status, created_at);

-- Improve operational query support for unscored rows.
CREATE INDEX IF NOT EXISTS idx_rounds_trust_unscored
  ON public.rounds (created_at)
  WHERE trust_scored_at IS NULL;

-- Use database time for trust scoring timestamps to avoid app clock drift.
CREATE OR REPLACE FUNCTION public.set_round_trust_scored_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trust_status <> 'pending' AND NEW.trust_scored_at IS NULL THEN
    NEW.trust_scored_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_round_trust_scored_at
BEFORE INSERT OR UPDATE OF trust_status, trust_scored_at
ON public.rounds
FOR EACH ROW
EXECUTE FUNCTION public.set_round_trust_scored_at();
