import { describe, it, expect } from "vitest";
import { encodeRound } from "@/lib/golf/share-codec";
import { makeRound } from "../fixtures/factories";
import { GET } from "@/app/(tools)/strokes-gained/og/route";
import { NextRequest } from "next/server";

function makeRequest(dParam?: string): NextRequest {
  const url = dParam
    ? `http://localhost:3000/strokes-gained/og?d=${dParam}`
    : "http://localhost:3000/strokes-gained/og";
  return new NextRequest(url);
}

describe("OG Image route", () => {
  it("returns a Response with image/png content type for a valid payload", async () => {
    const round = makeRound({ course: "Pebble Beach", score: 82 });
    const encoded = encodeRound(round);

    const response = await GET(makeRequest(encoded));

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("returns a Response for the fallback (no payload)", async () => {
    const response = await GET(makeRequest());

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("returns fallback for an invalid payload", async () => {
    const response = await GET(makeRequest("GARBAGE"));

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
