-- Share tokens for saved rounds.
-- One durable token per round (idempotent). No revocation in v1.
-- Public access goes through the admin client (privileged server path),
-- NOT through anon grants.

CREATE TABLE round_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_round_shares_round UNIQUE (round_id)
);

-- No explicit index on token — the UNIQUE constraint already creates one.

ALTER TABLE round_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shares"
  ON round_shares FOR ALL
  USING (auth.uid() = owner_id);
