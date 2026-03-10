-- Remove public raw-round access. Shared round/report access must flow through
-- explicit share tokens and privileged server lookups only.

DROP POLICY IF EXISTS "Anyone can read rounds" ON public.rounds;

REVOKE SELECT ON public.rounds FROM anon;
