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
  it("renders a PNG for a valid payload", async () => {
    const round = makeRound({ course: "Pebble Beach", score: 82 });
    const encoded = encodeRound(round);

    const response = await GET(makeRequest(encoded));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it("renders a PNG for the fallback (no payload)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it("renders fallback PNG for an invalid payload", async () => {
    const response = await GET(makeRequest("GARBAGE"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });
});
