import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildCheckoutRedirectUrls,
  deriveProfileUpdateFromSubscription,
  shouldApplyStripeUpdate,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";
import { getCustomerId } from "@/app/api/stripe/webhook/route";

describe("buildCheckoutRedirectUrls", () => {
  it("uses the lesson prep builder for success and cancel redirects", () => {
    expect(buildCheckoutRedirectUrls("https://golfdataviz.com")).toEqual({
      successUrl: "https://golfdataviz.com/strokes-gained/lesson-prep?checkout=success",
      cancelUrl: "https://golfdataviz.com/strokes-gained/lesson-prep?checkout=cancelled",
    });
  });
});

describe("deriveProfileUpdateFromSubscription", () => {
  it("maps active subscriptions to premium status", () => {
    const result = deriveProfileUpdateFromSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      current_period_end: 1773100800,
    });

    expect(result).toEqual({
      premium_status: "premium",
      premium_expires_at: "2026-03-10T00:00:00.000Z",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
    });
  });

  it("maps canceled subscriptions to grace_period using current_period_end", () => {
    const result = deriveProfileUpdateFromSubscription({
      id: "sub_456",
      customer: "cus_456",
      status: "canceled",
      current_period_end: 1773187200,
    });

    expect(result.premium_status).toBe("grace_period");
    expect(result.premium_expires_at).toBe("2026-03-11T00:00:00.000Z");
  });

  it("maps incomplete-expired subscriptions back to free", () => {
    const result = deriveProfileUpdateFromSubscription({
      id: "sub_789",
      customer: "cus_789",
      status: "incomplete_expired",
      current_period_end: null,
    });

    expect(result.premium_status).toBe("free");
    expect(result.premium_expires_at).toBeNull();
  });
});

describe("verifyStripeWebhookSignature", () => {
  it("accepts a valid Stripe signature", () => {
    const payload = JSON.stringify({ id: "evt_123", type: "test.event" });
    const secret = "whsec_test";
    const timestamp = 1773014400;
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const header = `t=${timestamp},v1=${signature}`;

    expect(
      verifyStripeWebhookSignature({
        payload,
        signatureHeader: header,
        secret,
        now: new Date("2026-03-09T00:04:00.000Z"),
      })
    ).toBe(true);
  });

  it("rejects an invalid Stripe signature", () => {
    const payload = JSON.stringify({ id: "evt_123", type: "test.event" });

    expect(
      verifyStripeWebhookSignature({
        payload,
        signatureHeader: "t=1773014400,v1=bad",
        secret: "whsec_test",
        now: new Date("2026-03-08T00:04:00.000Z"),
      })
    ).toBe(false);
  });
});

describe("shouldApplyStripeUpdate", () => {
  it("applies when there is no prior event timestamp", () => {
    expect(shouldApplyStripeUpdate(null, 1773014400)).toBe(true);
  });

  it("rejects older Stripe events", () => {
    expect(
      shouldApplyStripeUpdate("2026-03-10T00:00:00.000Z", 1773014400)
    ).toBe(false);
  });

  it("applies newer Stripe events", () => {
    expect(
      shouldApplyStripeUpdate("2026-03-08T00:00:00.000Z", 1773187200)
    ).toBe(true);
  });
});

describe("getCustomerId", () => {
  it("returns a plain string customer ID", () => {
    expect(getCustomerId("cus_abc123")).toBe("cus_abc123");
  });

  it("extracts id from an expanded customer object", () => {
    expect(getCustomerId({ id: "cus_abc123", name: "Test User" })).toBe("cus_abc123");
  });

  it("returns null for null", () => {
    expect(getCustomerId(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getCustomerId(undefined)).toBeNull();
  });

  it("returns null for an object without an id field", () => {
    expect(getCustomerId({ name: "no id" })).toBeNull();
  });

  it("returns null for a number", () => {
    expect(getCustomerId(42)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getCustomerId("")).toBeNull();
  });

  it("returns null for an object with an empty string id", () => {
    expect(getCustomerId({ id: "" })).toBeNull();
  });

  it("returns null for an object with a non-string id", () => {
    expect(getCustomerId({ id: 12345 })).toBeNull();
  });
});
