import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Validate redirect target is a safe relative path (no open redirect). */
function getSafeRedirect(next: string | null): string {
  const fallback = "/strokes-gained/history";
  if (!next) return fallback;
  // Must start with / and not contain // (blocks protocol-relative URLs like //evil.com)
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
