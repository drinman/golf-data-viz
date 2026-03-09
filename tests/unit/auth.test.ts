import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockCreateClient } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockCreateClient = vi.fn();
  return { mockGetUser, mockCreateClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { getUser } from "@/lib/supabase/auth";

describe("getUser", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateClient.mockReset();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    });
  });

  it("returns null when no session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const user = await getUser();
    expect(user).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const fakeUser = {
      id: "abc-123",
      email: "golfer@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
    };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const user = await getUser();
    expect(user).toEqual(fakeUser);
    expect(user?.email).toBe("golfer@example.com");
  });

  it("returns null on error (catch branch)", async () => {
    mockCreateClient.mockRejectedValueOnce(
      new Error("Cookie store unavailable")
    );

    const user = await getUser();
    expect(user).toBeNull();
  });
});
