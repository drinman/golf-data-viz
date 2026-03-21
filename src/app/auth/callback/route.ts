import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";

/** Validate redirect target is a safe relative path (no open redirect). */
function getSafeRedirect(next: string | null): string {
  const fallback = "/strokes-gained/history";
  if (!next) return fallback;
  // Must start with / but block // (protocol-relative) and \ (WHATWG URL normalizes \ to /)
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Failed to exchange code for session:", error.message);
      // Redirect with error flag so the UI can show a sign-in failure message
      const errorUrl = new URL(next, request.url);
      errorUrl.searchParams.set("auth_error", "callback_failed");
      return NextResponse.redirect(errorUrl);
    }

    // Identify user in PostHog using their Supabase user ID
    if (data.user) {
      const posthog = getPostHogClient();
      posthog.identify({
        distinctId: data.user.id,
        properties: {
          // No PII (email) — only non-identifying metadata
          provider: data.user.app_metadata?.provider,
        },
      });
      await posthog.flush();
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
