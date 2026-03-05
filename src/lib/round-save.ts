export interface RoundSaveAvailability {
  enabled: boolean;
  reasons: string[];
}

const MIN_RATE_LIMIT_SALT_LENGTH = 16;

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasValidRateLimitSalt(value: string | undefined): boolean {
  return Boolean(value?.trim() && value.trim().length >= MIN_RATE_LIMIT_SALT_LENGTH);
}

/**
 * Controls whether the anonymous round-save UI should be exposed.
 * In production, this stays off unless the full save + monitoring path is configured.
 */
export function getRoundSaveAvailability(): RoundSaveAvailability {
  const reasons: string[] = [];

  if (process.env.ENABLE_ROUND_SAVE !== "true") {
    reasons.push("flag_disabled");
  }

  if (!hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    reasons.push("missing_supabase_url");
  }

  if (!hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    reasons.push("missing_service_role_key");
  }

  if (!hasValue(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
    reasons.push("missing_turnstile_site_key");
  }

  if (!hasValue(process.env.TURNSTILE_SECRET_KEY)) {
    reasons.push("missing_turnstile_secret_key");
  }

  if (process.env.NODE_ENV === "production") {
    if (!hasValidRateLimitSalt(process.env.RATE_LIMIT_SALT)) {
      reasons.push("missing_rate_limit_salt");
    }

    if (!hasValue(process.env.KV_REST_API_URL)) {
      reasons.push("missing_kv_rest_api_url");
    }

    if (!hasValue(process.env.KV_REST_API_TOKEN)) {
      reasons.push("missing_kv_rest_api_token");
    }

    if (!hasValue(process.env.SENTRY_DSN)) {
      reasons.push("missing_sentry_dsn");
    }
  }

  return {
    enabled: reasons.length === 0,
    reasons,
  };
}
