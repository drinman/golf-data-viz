import { createClient } from "@/lib/supabase/server";

export type PremiumStatus = "free" | "premium" | "grace_period" | "lifetime";
export type PremiumFeature =
  | "lesson_report_generation"
  | "lesson_report_view";

export interface UserProfileEntitlementRow {
  premium_status: PremiumStatus | string;
  premium_expires_at: string | null;
}

export interface ViewerEntitlements {
  status: PremiumStatus;
  canGenerateLessonReports: boolean;
  canViewExistingLessonReports: boolean;
  expiresAt: string | null;
  inGracePeriod: boolean;
}

interface GetViewerEntitlementsOptions {
  now?: Date;
}

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function buildFreeEntitlements(): ViewerEntitlements {
  return {
    status: "free",
    canGenerateLessonReports: false,
    canViewExistingLessonReports: false,
    expiresAt: null,
    inGracePeriod: false,
  };
}

function normalizePremiumStatus(status: string): PremiumStatus {
  switch (status) {
    case "premium":
    case "grace_period":
    case "lifetime":
      return status;
    default:
      return "free";
  }
}

function isWithinGrace(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return false;
  return now.getTime() <= expiresTime + GRACE_PERIOD_MS;
}

export function deriveEntitlements(
  profile: UserProfileEntitlementRow | null,
  now: Date = new Date()
): ViewerEntitlements {
  if (!profile) {
    return buildFreeEntitlements();
  }

  const premiumStatus = normalizePremiumStatus(profile.premium_status);

  if (premiumStatus === "lifetime") {
    return {
      status: "lifetime",
      canGenerateLessonReports: true,
      canViewExistingLessonReports: true,
      expiresAt: null,
      inGracePeriod: false,
    };
  }

  if (premiumStatus === "premium") {
    return {
      status: "premium",
      canGenerateLessonReports: true,
      canViewExistingLessonReports: true,
      expiresAt: profile.premium_expires_at,
      inGracePeriod: false,
    };
  }

  if (premiumStatus === "grace_period" && isWithinGrace(profile.premium_expires_at, now)) {
    return {
      status: "grace_period",
      canGenerateLessonReports: false,
      canViewExistingLessonReports: true,
      expiresAt: profile.premium_expires_at,
      inGracePeriod: true,
    };
  }

  return buildFreeEntitlements();
}

export async function getViewerEntitlements(
  userId: string,
  options: GetViewerEntitlementsOptions = {}
): Promise<ViewerEntitlements> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("premium_status, premium_expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return buildFreeEntitlements();
  }

  return deriveEntitlements(data, options.now);
}

export class PremiumRequiredError extends Error {
  feature: PremiumFeature;

  constructor(feature: PremiumFeature) {
    super("Premium access required.");
    this.name = "PremiumRequiredError";
    this.feature = feature;
  }
}

export function requirePremium(
  entitlements: ViewerEntitlements,
  feature: PremiumFeature
): ViewerEntitlements {
  const allowed = feature === "lesson_report_generation"
    ? entitlements.canGenerateLessonReports
    : entitlements.canViewExistingLessonReports;

  if (!allowed) {
    throw new PremiumRequiredError(feature);
  }

  return entitlements;
}
