-- Improve operational query support for unscored rounds.
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

DROP TRIGGER IF EXISTS trg_set_round_trust_scored_at ON public.rounds;

CREATE TRIGGER trg_set_round_trust_scored_at
BEFORE INSERT OR UPDATE OF trust_status, trust_scored_at
ON public.rounds
FOR EACH ROW
EXECUTE FUNCTION public.set_round_trust_scored_at();
