import { describe, it, expect, vi, afterEach } from "vitest";
import { getRoundSaveAvailability } from "@/lib/round-save";

describe("getRoundSaveAvailability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables save when the feature flag is off", () => {
    vi.stubEnv("ENABLE_ROUND_SAVE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile-site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");

    const availability = getRoundSaveAvailability();

    expect(availability.enabled).toBe(false);
    expect(availability.reasons).toContain("flag_disabled");
  });

  it("enables save in non-production when core save config is present", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile-site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");

    const availability = getRoundSaveAvailability();

    expect(availability).toEqual({
      enabled: true,
      reasons: [],
    });
  });

  it("disables save in production when launch-day ops config is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile-site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");

    const availability = getRoundSaveAvailability();

    expect(availability.enabled).toBe(false);
    expect(availability.reasons).toContain("missing_rate_limit_salt");
    expect(availability.reasons).toContain("missing_kv_rest_api_url");
    expect(availability.reasons).toContain("missing_kv_rest_api_token");
    expect(availability.reasons).toContain("missing_sentry_dsn");
  });

  it("disables save when the Turnstile site key is missing", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret-key");

    const availability = getRoundSaveAvailability();

    expect(availability.enabled).toBe(false);
    expect(availability.reasons).toContain("missing_turnstile_site_key");
  });

  it("disables save when the Turnstile secret is missing", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_ROUND_SAVE", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstile-site-key");

    const availability = getRoundSaveAvailability();

    expect(availability.enabled).toBe(false);
    expect(availability.reasons).toContain("missing_turnstile_secret_key");
  });
});
