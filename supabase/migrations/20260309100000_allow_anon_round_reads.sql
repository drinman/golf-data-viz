-- Allow anonymous (unauthenticated) users to read rounds.
-- The existing "Users can read own rounds" policy only matches
-- authenticated users via auth.uid() = user_id, so anon requests
-- (share pages, public lookups) get zero rows.

-- 1. Table-level grant (migration 4 only granted SELECT to authenticated)
GRANT SELECT ON public.rounds TO anon;

-- 2. RLS policy: anon can read all rounds
CREATE POLICY "Anyone can read rounds"
  ON rounds FOR SELECT
  TO anon
  USING (true);
