"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "./client";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Use getSession() first (reads local storage, no network request).
    // Only call getUser() (network request to validate JWT) when a session exists.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        // Identify with Supabase user ID only — no PII (email).
        // Server-side identify in auth/callback/route.ts sets provider.
        posthog.identify(u.id);
      }
      setUser(u);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        posthog.identify(u.id);
      } else {
        posthog.reset();
      }
      setUser(u);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext value={{ user, loading }}>
      {children}
    </AuthContext>
  );
}

export function useSupabaseUser() {
  return useContext(AuthContext);
}
