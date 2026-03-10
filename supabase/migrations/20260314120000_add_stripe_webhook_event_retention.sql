-- Keep the Stripe webhook idempotency ledger bounded.
-- A daily pg_cron job purges processed events older than 90 days.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_stripe_webhook_events(
  retention_window interval DEFAULT interval '90 days'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.stripe_webhook_events
  WHERE received_at < now() - retention_window;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stripe_webhook_events(interval) IS
  'Deletes processed Stripe webhook events older than the retention window. Scheduled daily via pg_cron.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'cleanup-stripe-webhook-events'
    ) THEN
      PERFORM cron.unschedule('cleanup-stripe-webhook-events');
    END IF;

    PERFORM cron.schedule(
      'cleanup-stripe-webhook-events',
      '17 3 * * *',
      'SELECT public.cleanup_stripe_webhook_events();'
    );
  END IF;
END;
$$;
