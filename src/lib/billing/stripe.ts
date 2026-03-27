import { createHmac, timingSafeEqual } from "crypto";
import type { PremiumStatus } from "@/lib/billing/entitlements";
import { getSiteUrl } from "@/lib/site-url";

interface StripeSubscriptionLike {
  id: string;
  customer: string | { id: string } | null;
  status: string;
  current_period_end: number | null;
}

export interface StripeProfileUpdate {
  premium_status: PremiumStatus;
  premium_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface VerifyStripeWebhookSignatureOptions {
  payload: string;
  signatureHeader: string | null;
  secret: string;
  now?: Date;
  toleranceSeconds?: number;
}

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;
const LESSON_PREP_PATH = "/strokes-gained/lesson-prep";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return key;
}

function getLessonPrepPriceId(): string {
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    throw new Error("Missing STRIPE_PREMIUM_PRICE_ID");
  }
  return priceId;
}

function toIsoFromUnix(seconds: number | null): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Extract a Stripe customer ID from either a plain string or an expanded object. */
export function getCustomerId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }
  return null;
}

function getStripeCustomerId(customer: StripeSubscriptionLike["customer"]): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id ?? null;
}

export function shouldApplyStripeUpdate(
  lastAppliedAt: string | null,
  eventCreatedAtSeconds: number | null
): boolean {
  if (!eventCreatedAtSeconds) return true;
  if (!lastAppliedAt) return true;

  const previous = new Date(lastAppliedAt).getTime();
  const incoming = eventCreatedAtSeconds * 1000;

  if (Number.isNaN(previous)) return true;
  return incoming >= previous;
}

export function buildCheckoutRedirectUrls(baseUrl: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return {
    successUrl: `${normalizedBase}${LESSON_PREP_PATH}?checkout=success`,
    cancelUrl: `${normalizedBase}${LESSON_PREP_PATH}?checkout=cancelled`,
  };
}

export function deriveProfileUpdateFromSubscription(
  subscription: StripeSubscriptionLike
): StripeProfileUpdate {
  const stripeCustomerId = getStripeCustomerId(subscription.customer);
  const premiumExpiresAt = toIsoFromUnix(subscription.current_period_end);

  switch (subscription.status) {
    case "active":
    case "trialing":
      return {
        premium_status: "premium",
        premium_expires_at: premiumExpiresAt,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
      };
    case "canceled":
    case "past_due":
    case "unpaid":
      return {
        premium_status: "grace_period",
        premium_expires_at: premiumExpiresAt,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
      };
    default:
      return {
        premium_status: "free",
        premium_expires_at: premiumExpiresAt,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
      };
  }
}

function parseStripeSignatureHeader(header: string | null): {
  timestamp: number | null;
  signatures: string[];
} {
  if (!header) {
    return { timestamp: null, signatures: [] };
  }

  const entries = header.split(",").map((part) => part.trim());
  const timestamp = entries
    .find((entry) => entry.startsWith("t="))
    ?.slice(2);
  const signatures = entries
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.slice(3))
    .filter(Boolean);

  return {
    timestamp: timestamp ? Number(timestamp) : null,
    signatures,
  };
}

export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
  secret,
  now = new Date(),
  toleranceSeconds = DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
}: VerifyStripeWebhookSignatureOptions): boolean {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ageSeconds = Math.abs(now.getTime() / 1000 - timestamp);
  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);

  return signatures.some((signature) => {
    const candidateBuffer = Buffer.from(signature);
    if (candidateBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

async function postStripeForm(
  path: string,
  body: URLSearchParams
): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.error === "object" && data.error !== null && "message" in data.error
        ? String(data.error.message)
        : `Stripe request failed with status ${response.status}`
    );
  }

  return data;
}

export async function createCheckoutSession(userId: string): Promise<string> {
  const { successUrl, cancelUrl } = buildCheckoutRedirectUrls(getSiteUrl());
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "line_items[0][price]": getLessonPrepPriceId(),
    "line_items[0][quantity]": "1",
    "metadata[user_id]": userId,
    "subscription_data[metadata][user_id]": userId,
    "allow_promotion_codes": "false",
  });

  const session = await postStripeForm("/checkout/sessions", body);
  const url = typeof session.url === "string" ? session.url : null;
  if (!url) {
    throw new Error("Stripe checkout session did not return a url.");
  }
  return url;
}

export async function createBillingPortalSession(
  stripeCustomerId: string
): Promise<string> {
  const body = new URLSearchParams({
    customer: stripeCustomerId,
    return_url: `${getSiteUrl()}${LESSON_PREP_PATH}`,
  });
  const session = await postStripeForm("/billing_portal/sessions", body);
  const url = typeof session.url === "string" ? session.url : null;
  if (!url) {
    throw new Error("Stripe billing portal session did not return a url.");
  }
  return url;
}
