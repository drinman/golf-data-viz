import "server-only";

import { captureMonitoringException } from "@/lib/monitoring/sentry";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_VERIFY_TIMEOUT_MS = 5000;

export interface VerifyTurnstileOptions {
  token: string;
  remoteIp: string;
  expectedHostname: string | null;
  expectedAction?: string;
}

export interface TurnstileVerifyResult {
  success: boolean;
  errorCodes: string[];
  action: string | null;
  hostname: string | null;
}

export interface TurnstileVerificationFailure {
  ok: false;
  reason:
    | "config"
    | "transport"
    | "verification_failed"
    | "action_mismatch"
    | "hostname_mismatch";
  result: TurnstileVerifyResult;
}

export interface TurnstileVerificationSuccess {
  ok: true;
  result: TurnstileVerifyResult;
}

export type TurnstileVerificationResult =
  | TurnstileVerificationSuccess
  | TurnstileVerificationFailure;

function normalizeHostname(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(`https://${value}`).hostname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function createFailure(
  reason: TurnstileVerificationFailure["reason"],
  result: TurnstileVerifyResult
): TurnstileVerificationFailure {
  return { ok: false, reason, result };
}

function monitorTurnstileFailure(
  error: Error,
  reason: TurnstileVerificationFailure["reason"],
  expectedHostname: string | null,
  result: TurnstileVerifyResult
): void {
  captureMonitoringException(error, {
    source: "turnstile",
    code: reason,
    error_codes: result.errorCodes,
    expected_action: "save_round",
    returned_action: result.action,
    expected_hostname: expectedHostname,
    returned_hostname: result.hostname,
  });
}

export async function verifyTurnstileToken({
  token,
  remoteIp,
  expectedHostname,
  expectedAction = "save_round",
}: VerifyTurnstileOptions): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const normalizedExpectedHostname = normalizeHostname(expectedHostname);

  if (!secret) {
    const result = {
      success: false,
      errorCodes: ["missing-input-secret"],
      action: null,
      hostname: null,
    };
    monitorTurnstileFailure(
      new Error("TURNSTILE_SECRET_KEY is missing"),
      "config",
      normalizedExpectedHostname,
      result
    );
    return createFailure("config", result);
  }

  let payload: unknown;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      signal: AbortSignal.timeout(TURNSTILE_VERIFY_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    payload = await response.json();
  } catch (error) {
    const result = {
      success: false,
      errorCodes: ["verification-transport-failed"],
      action: null,
      hostname: null,
    };
    monitorTurnstileFailure(
      error instanceof Error ? error : new Error("Turnstile verification failed"),
      "transport",
      normalizedExpectedHostname,
      result
    );
    return createFailure("transport", result);
  }

  const parsed =
    typeof payload === "object" && payload !== null
      ? (payload as {
          success?: unknown;
          "error-codes"?: unknown;
          action?: unknown;
          hostname?: unknown;
        })
      : null;

  const result: TurnstileVerifyResult = {
    success: parsed?.success === true,
    errorCodes: Array.isArray(parsed?.["error-codes"])
      ? parsed?.["error-codes"].filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    action: typeof parsed?.action === "string" ? parsed.action : null,
    hostname: normalizeHostname(
      typeof parsed?.hostname === "string" ? parsed.hostname : null
    ),
  };

  if (!result.success) {
    monitorTurnstileFailure(
      new Error("Turnstile verification failed"),
      "verification_failed",
      normalizedExpectedHostname,
      result
    );
    return createFailure("verification_failed", result);
  }

  if (result.action !== expectedAction) {
    monitorTurnstileFailure(
      new Error("Turnstile action mismatch"),
      "action_mismatch",
      normalizedExpectedHostname,
      result
    );
    return createFailure("action_mismatch", result);
  }

  if (
    normalizedExpectedHostname &&
    result.hostname !== normalizedExpectedHostname
  ) {
    monitorTurnstileFailure(
      new Error("Turnstile hostname mismatch"),
      "hostname_mismatch",
      normalizedExpectedHostname,
      result
    );
    return createFailure("hostname_mismatch", result);
  }

  return { ok: true, result };
}
