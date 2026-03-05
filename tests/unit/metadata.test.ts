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
  it("annotates estimated categories with (est.) in og:description", async () => {
    // Partial round: no GIR → approach and ATG will be estimated
    const round = makeRound();
    delete round.greensInRegulation;
    delete round.upAndDownAttempts;
    delete round.upAndDownConverted;
    const encoded = encodeRound(round);

    const meta = await generateMetadata({ searchParams: makeSearchParams(encoded) });

    const description = meta.description as string;
    expect(description).toContain("Approach");
    expect(description).toContain("(est.)");
    // OTT and Putting should NOT have (est.)
    expect(description).toMatch(/Off the Tee [+-]\d/);
    expect(description).not.toMatch(/Off the Tee [+-][\d.]+ \(est\.\)/);
    expect(description).toMatch(/Putting [+-]\d/);
    expect(description).not.toMatch(/Putting [+-][\d.]+ \(est\.\)/);
  });

  it("does not annotate categories when all data is provided", async () => {
    const round = makeRound();
    const encoded = encodeRound(round);

    const meta = await generateMetadata({ searchParams: makeSearchParams(encoded) });

    const description = meta.description as string;
    expect(description).not.toContain("(est.)");
  });
});
