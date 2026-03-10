import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deriveProfileUpdateFromSubscription,
  shouldApplyStripeUpdate,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";

interface StripeEventPayload {
  id: string;
  type: string;
  created?: number;
  data?: {
    object?: Record<string, unknown>;
  };
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getObjectMetadata(value: Record<string, unknown>): Record<string, unknown> {
  const metadata = value.metadata;
  return typeof metadata === "object" && metadata !== null
    ? metadata as Record<string, unknown>
    : {};
}

function getEventObject(event: StripeEventPayload): Record<string, unknown> | null {
  return event.data?.object && typeof event.data.object === "object"
    ? event.data.object
    : null;
}

function getSubscriptionCustomer(
  value: unknown
): string | { id: string } | null {
  if (typeof value === "string" || value === null) {
    return value;
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    const id = getStringValue((value as { id?: unknown }).id);
    return id ? { id } : null;
  }

  return null;
}

async function recordWebhookEvent(
  eventId: string,
  eventType: string
): Promise<"inserted" | "duplicate"> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
    });

  if (!error) return "inserted";
  if (error.code === "23505") return "duplicate";
  throw error;
}

async function resolveUserIdForStripeObject(
  object: Record<string, unknown>
): Promise<string | null> {
  const metadata = getObjectMetadata(object);
  const metadataUserId = getStringValue(metadata.user_id);
  if (metadataUserId) {
    return metadataUserId;
  }

  const customerId = getStringValue(object.customer);
  if (!customerId) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  return data?.user_id ?? null;
}

async function applyStripeProfileUpdate(params: {
  userId: string;
  eventCreatedAt: number | null;
  patch: object;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("user_profiles")
    .select("last_stripe_event_created_at")
    .eq("user_id", params.userId)
    .single();

  const lastAppliedAt = existing?.last_stripe_event_created_at ?? null;
  if (!shouldApplyStripeUpdate(lastAppliedAt, params.eventCreatedAt)) {
    return false;
  }

  const patch = {
    ...params.patch,
    updated_at: new Date().toISOString(),
    ...(params.eventCreatedAt
      ? {
          last_stripe_event_created_at: new Date(
            params.eventCreatedAt * 1000
          ).toISOString(),
        }
      : {}),
  };

  const { error } = await admin
    .from("user_profiles")
    .update(patch)
    .eq("user_id", params.userId);

  if (error) {
    throw error;
  }

  return true;
}

async function handleCheckoutSessionCompleted(event: StripeEventPayload) {
  const object = getEventObject(event);
  if (!object) return;

  const userId = await resolveUserIdForStripeObject(object);
  if (!userId) return;

  const patch: Record<string, unknown> = {
    stripe_customer_id: getStringValue(object.customer),
  };

  const subscriptionId = getStringValue(object.subscription);
  if (subscriptionId) {
    patch.stripe_subscription_id = subscriptionId;
  }

  await applyStripeProfileUpdate({
    userId,
    eventCreatedAt: event.created ?? null,
    patch,
  });
}

async function handleSubscriptionEvent(event: StripeEventPayload) {
  const object = getEventObject(event);
  if (!object) return;

  const userId = await resolveUserIdForStripeObject(object);
  if (!userId) return;

  const update = deriveProfileUpdateFromSubscription({
    id: getStringValue(object.id) ?? "",
    customer: getSubscriptionCustomer(object.customer),
    status: getStringValue(object.status) ?? "free",
    current_period_end:
      typeof object.current_period_end === "number"
        ? object.current_period_end
        : null,
  });

  await applyStripeProfileUpdate({
    userId,
    eventCreatedAt: event.created ?? null,
    patch: update,
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!verifyStripeWebhookSignature({
      payload,
      signatureHeader: signature,
      secret: getWebhookSecret(),
    })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeEventPayload;
    const recordResult = await recordWebhookEvent(event.id, event.type);
    if (recordResult === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] Failed to process event", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
