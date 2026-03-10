-- Premium entitlements and lesson-prep reports.
-- Read-time premium checks use public.user_profiles as the sole source of truth.
-- Stripe metadata is only used to map webhook payloads back to users.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  premium_status text NOT NULL DEFAULT 'free'
    CHECK (premium_status IN ('free', 'premium', 'grace_period', 'lifetime')),
  premium_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  last_stripe_event_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer
  ON public.user_profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription
  ON public.user_profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.user_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user_profile ON auth.users;

CREATE TRIGGER trg_handle_new_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.user_profiles (user_id)
SELECT id
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Stripe webhook idempotency ledger. Backlog: purge events older than 90 days via pg_cron or scheduled cleanup.';

CREATE TABLE IF NOT EXISTS public.lesson_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_round_ids uuid[] NOT NULL,
  selection_hash text NOT NULL,
  round_count smallint NOT NULL CHECK (round_count BETWEEN 3 AND 8),
  report_version text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  regenerated_at timestamptz,
  report_data jsonb NOT NULL
);

COMMENT ON COLUMN public.lesson_reports.selected_round_ids IS
  'Round UUID provenance only. Stored snapshot data is authoritative for rendering.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_reports_user_selection
  ON public.lesson_reports (user_id, selection_hash);

CREATE INDEX IF NOT EXISTS idx_lesson_reports_user_generated
  ON public.lesson_reports (user_id, generated_at DESC);

ALTER TABLE public.lesson_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson reports"
  ON public.lesson_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_reports TO authenticated;

CREATE TABLE IF NOT EXISTS public.lesson_report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.lesson_reports(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_lesson_report_shares_report UNIQUE (report_id)
);

ALTER TABLE public.lesson_report_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson report shares"
  ON public.lesson_report_shares FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_report_shares TO authenticated;
