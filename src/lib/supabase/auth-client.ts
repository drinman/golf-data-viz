"use client";

import { createClient } from "./client";

// Re-export the shared context hook — components should use this
// instead of creating per-mount Supabase clients.
export { useSupabaseUser } from "./auth-context";

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signUp({ email, password });
}

export async function signInWithGoogle() {
  const supabase = createClient();
  // Pass current path as `next` so the auth callback redirects back here.
  // This preserves context for flows like post-save claim that depend on
  // returning to the originating page (e.g. /strokes-gained).
  const next = encodeURIComponent(window.location.pathname);
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    },
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
