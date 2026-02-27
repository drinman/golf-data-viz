import { describe, it, expect } from "vitest";
import { encodeRound } from "@/lib/golf/share-codec";
import { makeRound } from "../fixtures/factories";
import OGImage from "@/app/(tools)/strokes-gained/opengraph-image";

describe("OG Image route", () => {
  it("returns a Response with image/png content type for a valid payload", async () => {
    const round = makeRound({ course: "Pebble Beach", score: 82 });
    const encoded = encodeRound(round);

    const response = await OGImage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ d: encoded }),
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("returns a Response for the fallback (no payload)", async () => {
    const response = await OGImage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("returns fallback for an invalid payload", async () => {
    const response = await OGImage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ d: "GARBAGE" }),
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
