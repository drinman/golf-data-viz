-- Composite index for efficient history queries (user's rounds by date)
CREATE INDEX IF NOT EXISTS idx_rounds_user_played
  ON rounds(user_id, played_at DESC);

-- Secure claim-token columns for anonymous round claiming
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS claim_token_hash text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz;

-- Partial index for claim-token expiry cleanup (future cron job)
CREATE INDEX IF NOT EXISTS idx_rounds_claim_token_expires
  ON rounds(claim_token_expires_at)
  WHERE claim_token_expires_at IS NOT NULL;
