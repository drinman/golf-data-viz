import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}));

// Import after mocks
import { GET } from "@/app/auth/callback/route";
import type { NextRequest } from "next/server";

function makeRequest(url: string): NextRequest {
  return new Request(url) as unknown as NextRequest;
}

describe("OAuth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to fallback when no next param", async () => {
    const res = await GET(makeRequest("https://golfdataviz.com/auth/callback?code=abc"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained/history");
  });

  it("redirects to next when it is a safe relative path", async () => {
    const res = await GET(makeRequest("https://golfdataviz.com/auth/callback?code=abc&next=/strokes-gained"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained");
  });

  it("blocks protocol-relative URLs (//evil.com)", async () => {
    const res = await GET(makeRequest("https://golfdataviz.com/auth/callback?code=abc&next=//evil.com"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained/history");
  });

  it("blocks backslash open redirect (/\\evil.com)", async () => {
    const res = await GET(
      makeRequest("https://golfdataviz.com/auth/callback?code=abc&next=/%5Cevil.com")
    );
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained/history");
  });

  it("blocks backslash in middle of path", async () => {
    const res = await GET(
      makeRequest("https://golfdataviz.com/auth/callback?code=abc&next=/foo%5Cbar")
    );
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained/history");
  });

  it("blocks absolute URLs", async () => {
    const res = await GET(
      makeRequest("https://golfdataviz.com/auth/callback?code=abc&next=https://evil.com")
    );
    expect(new URL(res.headers.get("location")!).pathname).toBe("/strokes-gained/history");
  });
});
