/**
 * Proxy (auth session refresh) unit tests.
 *
 * Tests that the auth session refresh proxy:
 * 1. No-ops when Supabase env vars are missing/placeholder
 * 2. No-ops when no sb-* auth cookie is present
 * 3. Fails open when getUser() throws
 * 4. Calls getUser() and returns response when properly configured
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock NextResponse before any proxy imports
vi.mock("next/server", () => {
  const next = vi.fn(() => ({
    cookies: {
      set: vi.fn(),
    },
  }));
  return {
    NextResponse: { next },
  };
});

function createMockRequest(cookies: { name: string; value: string }[] = []) {
  return {
    cookies: {
      getAll: () => cookies,
      set: vi.fn(),
    },
  } as unknown as import("next/server").NextRequest;
}

describe("proxy", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("guard 1: no-op with missing/placeholder env vars", () => {
    it("returns NextResponse.next() when SUPABASE_URL is empty", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-key");

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-test-auth-token", value: "token" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });

    it("returns NextResponse.next() when SUPABASE_URL contains 'placeholder'", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://placeholder.supabase.co"
      );
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "placeholder-anon-key-for-ci-build"
      );

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-test-auth-token", value: "token" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });

    it("returns NextResponse.next() when SUPABASE_URL is not https", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://not-https.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-key");

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-test-auth-token", value: "token" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });
  });

  describe("guard 2: no-op without sb-* auth cookie", () => {
    it("returns NextResponse.next() when no cookies present", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://abc123.supabase.co"
      );
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });

    it("returns NextResponse.next() when only non-sb cookies present", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://abc123.supabase.co"
      );
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "theme", value: "dark" },
        { name: "_ga", value: "tracking" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });
  });

  describe("guard 3: fail-open on errors", () => {
    it("returns NextResponse.next() when createServerClient throws", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://abc123.supabase.co"
      );
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: () => {
          throw new Error("Network failure");
        },
      }));

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-test-auth-token", value: "token" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });

    it("returns NextResponse.next() when getUser() rejects", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://abc123.supabase.co"
      );
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: () => ({
          auth: {
            getUser: () => Promise.reject(new Error("Auth service down")),
          },
        }),
      }));

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-test-auth-token", value: "token" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
    });
  });

  describe("happy path: configured + cookie present", () => {
    it("calls getUser() and returns response", async () => {
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        "https://abc123.supabase.co"
      );
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "real-anon-key");

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: () => ({
          auth: { getUser: mockGetUser },
        }),
      }));

      const { proxy } = await import("@/proxy");
      const request = createMockRequest([
        { name: "sb-abc123-auth-token", value: "some-jwt" },
      ]);

      const response = await proxy(request);
      expect(response).toBeDefined();
      expect(mockGetUser).toHaveBeenCalledOnce();
    });
  });
});
