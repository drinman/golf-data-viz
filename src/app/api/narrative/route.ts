import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { roundInputSchema } from "@/lib/golf/schemas";
import { extractClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getInterpolatedBenchmark } from "@/lib/golf/benchmarks";
import { calculateStrokesGainedV3 } from "@/lib/golf/strokes-gained-v3";
import { captureMonitoringException } from "@/lib/monitoring/sentry";
import {
  derivePresentationTrust,
  isPresentationTrustEnabled,
} from "@/lib/golf/presentation-trust";
import {
  NARRATIVE_SYSTEM_PROMPT,
  buildNarrativeUserPrompt,
} from "@/lib/golf/narrative-prompt";
import {
  validateTroubleContext,
  buildTroubleContextSummary,
  type RoundTroubleContext,
  type TroubleHoleInput,
} from "@/lib/golf/trouble-context";

const NARRATIVE_TIMEOUT_MS = 15_000;

type ErrorCode =
  | "RATE_LIMITED"
  | "VALIDATION"
  | "GENERATION_FAILED"
  | "GATEWAY_TIMEOUT"
  | "UNAVAILABLE";

function errorResponse(
  message: string,
  code: ErrorCode,
  status: number
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  // Check API key availability
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(
      "Narrative generation is not available",
      "UNAVAILABLE",
      503
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", "VALIDATION", 400);
  }

  // Extract and validate round input
  const { troubleContext: rawTroubleContext, ...rawInput } = body as Record<
    string,
    unknown
  >;
  const parsed = roundInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return errorResponse(firstError, "VALIDATION", 400);
  }

  // Rate limit
  const ip = extractClientIp(request.headers);
  const rateLimitResult = await checkRateLimit(ip, undefined, {
    prefix: "narrative",
    maxPerHour: 10,
  });
  if (!rateLimitResult.allowed) {
    return errorResponse(
      "Too many narrative requests. Try again later.",
      "RATE_LIMITED",
      429
    );
  }

  // Validate trouble context if provided
  let troubleContext: RoundTroubleContext | undefined;
  if (rawTroubleContext) {
    const validation = validateTroubleContext(rawTroubleContext);
    if (!validation.valid) {
      return errorResponse(
        "Invalid trouble context",
        "VALIDATION",
        400
      );
    }
    const holes = (rawTroubleContext as { troubleHoles: TroubleHoleInput[] })
      .troubleHoles;
    troubleContext = {
      troubleHoles: holes,
      summary: buildTroubleContextSummary(holes),
    };
  }

  // Recalculate SG server-side
  const input = parsed.data;
  const benchmark = getInterpolatedBenchmark(input.handicapIndex);
  const result = calculateStrokesGainedV3(input, benchmark);
  // Safety net: NarrativeBlock bails client-side for caveated/quarantined
  // rounds, so these branches are not reached in the current UI flow. They
  // guard against direct API callers and future surfaces that may not have
  // the same client-side gating.
  if (isPresentationTrustEnabled()) {
    const presentationTrust = derivePresentationTrust({ input, result });

    if (presentationTrust.mode === "quarantined") {
      const narrative =
        "This round’s total SG can still be viewed, but the scorecard inputs need review before category-level storytelling is reliable.";
      return NextResponse.json({
        narrative,
        word_count: narrative.split(/\s+/).length,
      });
    }

    if (presentationTrust.mode === "caveated") {
      const narrative =
        "Your total SG is course-adjusted. Category estimates are based on scorecard stats, so use this round as a directional summary rather than a strongest-versus-weakest verdict.";
      return NextResponse.json({
        narrative,
        word_count: narrative.split(/\s+/).length,
      });
    }
  }

  // Build prompt
  const userPrompt = buildNarrativeUserPrompt(input, result, troubleContext);

  // Call Claude API
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        temperature: 0.7,
        system: NARRATIVE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      },
      { timeout: NARRATIVE_TIMEOUT_MS }
    );

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return errorResponse(
        "No text in response",
        "GENERATION_FAILED",
        500
      );
    }

    const narrative = textBlock.text.trim();
    const wordCount = narrative.split(/\s+/).length;

    return NextResponse.json({ narrative, word_count: wordCount });
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIConnectionError) {
      return errorResponse(
        "Narrative service is temporarily unavailable",
        "UNAVAILABLE",
        503
      );
    }
    if (
      err instanceof Anthropic.APIError &&
      err.status &&
      err.status >= 500
    ) {
      return errorResponse(
        "Narrative service is temporarily unavailable",
        "UNAVAILABLE",
        503
      );
    }
    if (err instanceof Error && err.name === "AbortError") {
      return errorResponse(
        "Narrative generation timed out",
        "GATEWAY_TIMEOUT",
        504
      );
    }
    // Check for timeout errors from the SDK
    if (
      err instanceof Error &&
      (err.message.includes("timed out") ||
        err.message.includes("timeout") ||
        err.message.includes("Request was aborted"))
    ) {
      return errorResponse(
        "Narrative generation timed out",
        "GATEWAY_TIMEOUT",
        504
      );
    }
    console.error("[narrative] Unexpected error:", String(err));
    captureMonitoringException(
      err instanceof Error ? err : new Error(String(err)),
      { source: "narrative", code: "GENERATION_FAILED" }
    );
    return errorResponse(
      "Failed to generate narrative",
      "GENERATION_FAILED",
      500
    );
  }
}
