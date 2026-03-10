"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/auth";
import {
  getViewerEntitlements,
  PremiumRequiredError,
  requirePremium,
} from "@/lib/billing/entitlements";
import {
  createBillingPortalSession as createStripeBillingPortalSession,
  createCheckoutSession as createStripeCheckoutSession,
} from "@/lib/billing/stripe";
import {
  buildLessonReportData,
  buildSelectionHash,
  LESSON_REPORT_VERSION,
} from "@/lib/golf/lesson-report";
import type { Json } from "@/lib/supabase/database.types";
import {
  getLessonReportBySelection,
  getRoundsForLessonReport,
} from "@/lib/golf/round-queries";

type ActionFailure = {
  success: false;
  message: string;
  code:
    | "UNAUTHENTICATED"
    | "INVALID_SELECTION"
    | "PREMIUM_REQUIRED"
    | "NOT_FOUND"
    | "STRIPE_ERROR"
    | "UNKNOWN";
};

type ActionSuccess<T> = { success: true } & T;

export type GenerateLessonReportResult =
  | ActionSuccess<{ reportId: string; regenerated: boolean }>
  | ActionFailure;

export type CreateLessonReportShareTokenResult =
  | ActionSuccess<{ token: string; shareUrl: string; created: boolean }>
  | ActionFailure;

export type BillingRedirectResult =
  | ActionSuccess<{ url: string }>
  | ActionFailure;

function fail(
  code: ActionFailure["code"],
  message: string
): ActionFailure {
  return { success: false, code, message };
}

function normalizeSelection(roundIds: string[]): string[] {
  return Array.from(new Set(roundIds.map((value) => value.trim()).filter(Boolean))).sort();
}

function buildReportShareUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://golfdataviz.com";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}/strokes-gained/shared/report/${token}`;
}

export async function generateLessonReport(
  roundIds: string[]
): Promise<GenerateLessonReportResult> {
  try {
    const user = await getUser();
    if (!user) {
      return fail("UNAUTHENTICATED", "Sign in to generate a lesson prep report.");
    }

    const entitlements = await getViewerEntitlements(user.id);
    requirePremium(entitlements, "lesson_report_generation");

    const selectedRoundIds = normalizeSelection(roundIds);
    if (selectedRoundIds.length < 3 || selectedRoundIds.length > 8) {
      return fail("INVALID_SELECTION", "Select between 3 and 8 rounds.");
    }

    const snapshots = await getRoundsForLessonReport(user.id, selectedRoundIds);
    if (snapshots.length !== selectedRoundIds.length) {
      return fail("NOT_FOUND", "One or more selected rounds are unavailable.");
    }

    const selectionHash = buildSelectionHash(selectedRoundIds);
    const existing = await getLessonReportBySelection(user.id, selectionHash);
    const reportData = buildLessonReportData(snapshots);
    const serializedReportData = reportData as unknown as Json;
    const now = new Date().toISOString();
    const supabase = await createClient();

    if (existing) {
      const { data, error } = await supabase
        .from("lesson_reports")
        .update({
          selected_round_ids: selectedRoundIds,
          round_count: snapshots.length,
          report_version: LESSON_REPORT_VERSION,
          report_data: serializedReportData,
          regenerated_at: now,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error || !data) {
        return fail("UNKNOWN", "Could not regenerate the lesson prep report.");
      }

      revalidatePath(`/strokes-gained/lesson-prep/${existing.id}`);
      return { success: true, reportId: existing.id, regenerated: true };
    }

    const { data, error } = await supabase
      .from("lesson_reports")
      .insert({
        user_id: user.id,
        selected_round_ids: selectedRoundIds,
        selection_hash: selectionHash,
        round_count: snapshots.length,
        report_version: LESSON_REPORT_VERSION,
        generated_at: now,
        report_data: serializedReportData,
      })
      .select("id")
      .single();

    if (error || !data) {
      return fail("UNKNOWN", "Could not create the lesson prep report.");
    }

    revalidatePath("/strokes-gained/lesson-prep");
    revalidatePath(`/strokes-gained/lesson-prep/${data.id}`);
    return { success: true, reportId: data.id, regenerated: false };
  } catch (error) {
    if (error instanceof PremiumRequiredError) {
      return fail("PREMIUM_REQUIRED", "Upgrade to generate lesson prep reports.");
    }
    console.error("[generateLessonReport] Unexpected error", error);
    return fail("UNKNOWN", "An unexpected error occurred.");
  }
}

export async function createLessonReportShareToken(
  reportId: string
): Promise<CreateLessonReportShareTokenResult> {
  try {
    const user = await getUser();
    if (!user) {
      return fail("UNAUTHENTICATED", "Sign in to share lesson prep reports.");
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("lesson_report_shares")
      .select("token")
      .eq("report_id", reportId)
      .single();

    if (existing?.token) {
      return {
        success: true,
        token: existing.token,
        shareUrl: buildReportShareUrl(existing.token),
        created: false,
      };
    }

    const { data: report } = await supabase
      .from("lesson_reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (!report) {
      return fail("NOT_FOUND", "Lesson prep report not found.");
    }

    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("lesson_report_shares")
      .insert({
        report_id: reportId,
        owner_id: user.id,
        token,
      });

    if (error) {
      return fail("UNKNOWN", "Could not create a share link.");
    }

    revalidatePath(`/strokes-gained/lesson-prep/${reportId}`);
    return {
      success: true,
      token,
      shareUrl: buildReportShareUrl(token),
      created: true,
    };
  } catch (error) {
    console.error("[createLessonReportShareToken] Unexpected error", error);
    return fail("UNKNOWN", "An unexpected error occurred.");
  }
}

export async function startLessonPrepCheckout(): Promise<BillingRedirectResult> {
  try {
    const user = await getUser();
    if (!user) {
      return fail("UNAUTHENTICATED", "Sign in to upgrade.");
    }

    const url = await createStripeCheckoutSession(user.id);
    return { success: true, url };
  } catch (error) {
    console.error("[startLessonPrepCheckout] Failed to create checkout session", error);
    return fail("STRIPE_ERROR", "Could not start checkout right now.");
  }
}

export async function openLessonPrepBillingPortal(): Promise<BillingRedirectResult> {
  try {
    const user = await getUser();
    if (!user) {
      return fail("UNAUTHENTICATED", "Sign in to manage billing.");
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return fail("STRIPE_ERROR", "No billing account is available yet.");
    }

    const url = await createStripeBillingPortalSession(profile.stripe_customer_id);
    return { success: true, url };
  } catch (error) {
    console.error("[openLessonPrepBillingPortal] Failed to open billing portal", error);
    return fail("STRIPE_ERROR", "Could not open billing management right now.");
  }
}
