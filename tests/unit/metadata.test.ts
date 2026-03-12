import { describe, it, expect, vi } from "vitest";

// Mock the client component to avoid pulling in server actions / server-only
vi.mock("@/app/(tools)/strokes-gained/_components/strokes-gained-client", () => ({
  default: () => null,
}));

import { generateMetadata } from "@/app/(tools)/strokes-gained/page";
import { encodeRound } from "@/lib/golf/share-codec";
import { makeRound } from "../fixtures/factories";

function makeSearchParams(d?: string): Promise<Record<string, string | undefined>> {
  return Promise.resolve(d ? { d } : {});
}

describe("generateMetadata", () => {
  it("generates score-first title and description for shared round", async () => {
    const round = makeRound({ course: "Pebble Beach", score: 82 });
    const encoded = encodeRound(round);

    const meta = await generateMetadata({ searchParams: makeSearchParams(encoded) });

    const title = meta.title as string;
    expect(title).toContain("Shot 82");
    expect(title).toContain("Pebble Beach");

    const description = meta.description as string;
    expect(description).toBeTruthy();
    // Score-first description includes index and familiar stats
    expect(description).toContain("index");
    expect(description).toContain("GIR");
    expect(description).toContain("putts");
  });

  it("returns default metadata when no d param", async () => {
    const meta = await generateMetadata({ searchParams: makeSearchParams() });

    const title = meta.title as string;
    expect(title).toBe("Strokes Gained Benchmarker");
  });
});
