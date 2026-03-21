import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks before any imports
const { mockCreate, mockCheckRateLimit, mockGetInterpolatedBenchmark, mockCalculateStrokesGainedV3, SharedAPIConnectionError, SharedAPIError } =
  vi.hoisted(() => {
    class APIConnectionError extends Error {
      constructor(opts: { message: string }) {
        super(opts.message);
        this.name = "APIConnectionError";
      }
    }
    class APIError extends Error {
      status: number;
      constructor(status: number, _body: unknown, message: string) {
        super(message);
        this.name = "APIError";
        this.status = status;
      }
    }
    return {
      mockCreate: vi.fn(),
      mockCheckRateLimit: vi.fn(),
      mockGetInterpolatedBenchmark: vi.fn(),
      mockCalculateStrokesGainedV3: vi.fn(),
      SharedAPIConnectionError: APIConnectionError,
      SharedAPIError: APIError,
    };
  });

// Both @anthropic-ai/sdk and @posthog/ai must share the same error classes
// so instanceof checks in the route's catch block match thrown errors.
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = { create: mockCreate };
    static APIConnectionError = SharedAPIConnectionError;
    static APIError = SharedAPIError;
  }
  return {
    default: Anthropic,
    APIConnectionError: SharedAPIConnectionError,
    APIError: SharedAPIError,
  };
});

vi.mock("@posthog/ai", () => {
  class Anthropic {
    messages = { create: mockCreate };
    static APIConnectionError = SharedAPIConnectionError;
    static APIError = SharedAPIError;
  }
  return { Anthropic };
});

vi.mock("@/lib/rate-limit", () => ({
  extractClientIp: () => "1.2.3.4",
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/golf/benchmarks", () => ({
  getInterpolatedBenchmark: mockGetInterpolatedBenchmark,
}));

vi.mock("@/lib/golf/strokes-gained-v3", () => ({
  calculateStrokesGainedV3: mockCalculateStrokesGainedV3,
}));

vi.mock("@/lib/golf/narrative-prompt", () => ({
  NARRATIVE_SYSTEM_PROMPT: "test system prompt",
  buildNarrativeUserPrompt: () => "test user prompt",
}));

import { POST } from "@/app/api/narrative/route";
import Anthropic from "@anthropic-ai/sdk";

const VALID_BODY = {
  course: "Pine Valley",
  date: "2026-03-14",
  score: 86,
  handicapIndex: 14,
  courseRating: 72.5,
  slopeRating: 131,
  fairwaysHit: 7,
  fairwayAttempts: 14,
  greensInRegulation: 6,
  totalPutts: 34,
  penaltyStrokes: 2,
  eagles: 0,
  birdies: 1,
  pars: 6,
  bogeys: 7,
  doubleBogeys: 3,
  triplePlus: 1,
};

import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/narrative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockBenchmark = {
  bracket: "10-15" as const,
  averageScore: 86,
  fairwayPercentage: 50,
  girPercentage: 33,
  puttsPerRound: 34,
  upAndDownPercentage: 30,
  penaltiesPerRound: 1.5,
  scoring: {
    eaglesPerRound: 0,
    birdiesPerRound: 1,
    parsPerRound: 6,
    bogeysPerRound: 7,
    doublesPerRound: 3,
    triplePlusPerRound: 1,
  },
};

const mockResult = {
  total: -0.5,
  categories: {
    "off-the-tee": 0.42,
    approach: -1.15,
    "around-the-green": 0.08,
    putting: 0.15,
  },
  benchmarkBracket: "10-15",
  skippedCategories: [],
  estimatedCategories: [],
  confidence: {
    "off-the-tee": "high",
    approach: "high",
    "around-the-green": "medium",
    putting: "high",
  },
  methodologyVersion: "3.2.0",
  benchmarkVersion: "1.0.0",
  benchmarkHandicap: 14,
  diagnostics: { threePuttImpact: null },
};

describe("POST /api/narrative", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("RATE_LIMIT_SALT", "test-salt-value-1234");
    vi.stubEnv("NODE_ENV", "test");
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockGetInterpolatedBenchmark.mockReturnValue(mockBenchmark);
    mockCalculateStrokesGainedV3.mockReturnValue(mockResult);
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "This was a solid round." }],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("UNAVAILABLE");
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeRequest({ score: "not a number" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, reason: "hour" });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("returns 200 with narrative on success", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.narrative).toBe("This was a solid round.");
    expect(data.word_count).toBe(5);
  });

  it("recalculates SG server-side", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockGetInterpolatedBenchmark).toHaveBeenCalledWith(14);
    expect(mockCalculateStrokesGainedV3).toHaveBeenCalledWith(
      expect.objectContaining({ score: 86 }),
      mockBenchmark
    );
  });

  it("uses correct model and parameters", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        temperature: 0.7,
      }),
      expect.objectContaining({ timeout: 15000 })
    );
  });

  it("returns 503 for Anthropic connection errors", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIConnectionError({ message: "Connection failed" })
    );
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("UNAVAILABLE");
  });

  it("returns 503 for Anthropic 5xx errors", async () => {
    mockCreate.mockRejectedValue(
      new Anthropic.APIError(500, {}, "Internal Server Error")
    );
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe("UNAVAILABLE");
  });

  it("returns 504 for timeout errors", async () => {
    const err = new Error("Request timed out");
    err.name = "AbortError";
    mockCreate.mockRejectedValue(err);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(504);
    const data = await res.json();
    expect(data.code).toBe("GATEWAY_TIMEOUT");
  });

  it("returns 500 for unknown errors", async () => {
    mockCreate.mockRejectedValue(new Error("something weird"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.code).toBe("GENERATION_FAILED");
  });

  it("forwards trouble context in request body", async () => {
    const body = {
      ...VALID_BODY,
      troubleContext: {
        troubleHoles: [{ holeNumber: 4, primaryCause: "tee" }],
        summary: { tee: 1, approach: 0, around_green: 0, putting: 0, penalty: 0 },
      },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid trouble context", async () => {
    const body = {
      ...VALID_BODY,
      troubleContext: { troubleHoles: "not an array" },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("VALIDATION");
  });
});
