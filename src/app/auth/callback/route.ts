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

  // OAuth error response — provider returned an error instead of a code
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    console.error("[auth/callback] OAuth error:", oauthError, description);
    const errorUrl = new URL("/strokes-gained/history", request.url);
    errorUrl.searchParams.set("auth_error", "oauth_denied");
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Failed to exchange code for session:", error.message);
      // Redirect with error flag so the UI can show a sign-in failure message
      const errorUrl = new URL("/strokes-gained/history", request.url);
      errorUrl.searchParams.set("auth_error", "callback_failed");
      return NextResponse.redirect(errorUrl);
    }

    // Identify user in PostHog — best-effort, never block login redirect
    if (data.user) {
      try {
        const posthog = getPostHogClient();
        posthog.identify({
          distinctId: data.user.id,
          properties: {
            provider: data.user.app_metadata?.provider,
          },
        });
        await posthog.flush();
      } catch {
        // PostHog is best-effort — don't break auth flow
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
